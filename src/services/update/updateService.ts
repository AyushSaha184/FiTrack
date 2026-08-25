import { Linking, Platform } from 'react-native';
import ReactNativeBlobUtil from 'react-native-blob-util';
import { CONFIG } from '../../config/constants';
import { STORAGE_KEYS } from '../../utils/constants';
import { storage } from '../../utils/storage';
import { logger } from '../../utils/logger';

export interface UpdateInfo {
  version: string;
  releaseName: string;
  releaseNotes: string;
  releaseNotesHtml?: string;
  /** Direct URL to the .apk asset on GitHub. Undefined if no APK was uploaded to the release. */
  downloadUrl?: string;
  /** Always-present URL to the release's HTML page on github.com. Used as fallback. */
  releasePageUrl: string;
  publishedAt: string;
  mandatory?: boolean;
}

export type DownloadProgress = {
  bytesWritten: number;
  contentLength: number;
  /** 0..1 */
  fraction: number;
};

export const compareVersions = (v1: string, v2: string): number => {
  const cleanV1 = v1.replace(/^v/, '').trim();
  const cleanV2 = v2.replace(/^v/, '').trim();

  const parts1 = cleanV1.split('.').map((p) => parseInt(p, 10) || 0);
  const parts2 = cleanV2.split('.').map((p) => parseInt(p, 10) || 0);

  const maxLength = Math.max(parts1.length, parts2.length);
  for (let i = 0; i < maxLength; i++) {
    const val1 = parts1[i] || 0;
    const val2 = parts2[i] || 0;
    if (val1 > val2) return 1;
    if (val1 < val2) return -1;
  }
  return 0;
};

/**
 * Versions the user has explicitly deferred in this app run. Intentionally
 * stored in module-scope memory only — a cold start (or a force-check from
 * Settings) clears the list, so the dialog reappears on next launch.
 */
let sessionDismissedVersions: Set<string> = new Set();

/**
 * Map of in-flight downloads so the modal can subscribe to a particular
 * version's progress. Key = version string, value = the FileTask instance.
 */
const activeDownloads: Map<string, any> = new Map();

/**
 * In-flight check-for-update promise. Dedupe concurrent calls (e.g. Settings
 * "Check for Updates" pressed while a launch check is still pending, or vice
 * versa) so we don't burn GitHub's 60 req/hour rate limit.
 */
let inFlightCheck: Promise<UpdateInfo | null> | null = null;

export const updateService = {
  async checkForUpdate(force = false): Promise<UpdateInfo | null> {
    if (inFlightCheck) {
      return inFlightCheck;
    }

    inFlightCheck = (async () => {
      try {
        const url = `https://api.github.com/repos/${CONFIG.GITHUB_OWNER}/${CONFIG.GITHUB_REPO}/releases/latest`;
        const response = await fetch(url, {
          headers: {
            Accept: 'application/vnd.github.v3+json',
            'User-Agent': 'Fitrack-App',
          },
        });

        if (!response.ok) {
          if (response.status === 404) {
            logger.info('[updateService] No releases found for repository');
            return null;
          }
          if (response.status === 403) {
            logger.warn('[updateService] GitHub API rate limit reached');
            throw new Error('Update server is busy. Please try again later.');
          }
          throw new Error(`GitHub API error: ${response.statusText}`);
        }

        const release = await response.json();
        const latestTag = release.tag_name || '';
        const currentVersion = CONFIG.APP_VERSION;
        const latestCleanVersion = latestTag.replace(/^v/, '').trim();

        storage.set(STORAGE_KEYS.LAST_UPDATE_CHECK, new Date().toISOString());

        if (compareVersions(latestTag, currentVersion) <= 0) {
          logger.info(`[updateService] App is up to date (${currentVersion} >= ${latestTag})`);
          return null;
        }

        if (!force && sessionDismissedVersions.has(latestCleanVersion)) {
          logger.info(`[updateService] Update v${latestCleanVersion} deferred in this session.`);
          return null;
        }

        // Find the first .apk asset attached to the release. .aab files are not
        // installable on-device, so we only treat .apk as a direct download.
        const apkAsset = (release.assets || []).find(
          (a: any) => /\.apk$/i.test(a?.name || ''),
        );

        const mandatory =
          typeof release.body === 'string' && /\[!\s*mandatory\]/i.test(release.body);

        return {
          version: latestCleanVersion,
          releaseName: release.name || latestTag,
          releaseNotes:
            release.body || 'New improvements and performance enhancements are available in this release.',
          releaseNotesHtml: release.body_html,
          downloadUrl: apkAsset?.browser_download_url,
          releasePageUrl: release.html_url,
          publishedAt: release.published_at || new Date().toISOString(),
          mandatory,
        };
      } catch (error: any) {
        logger.error('[updateService] Error checking for updates:', error);
        if (force) throw error;
        return null;
      } finally {
        inFlightCheck = null;
      }
    })();

    return inFlightCheck;
  },

  shouldCheckForUpdateOnLaunch(): boolean {
    const lastCheck = storage.get<string>(STORAGE_KEYS.LAST_UPDATE_CHECK);
    if (!lastCheck) return true;

    const lastCheckTime = new Date(lastCheck).getTime();
    const now = new Date().getTime();
    return now - lastCheckTime >= CONFIG.UPDATE_CHECK_INTERVAL_MS;
  },

  /**
   * Mark a version as "deferred" for the current app session. The dialog will
   * not reappear for this version until the user fully closes and reopens the
   * app, or performs a manual "Check for Updates" from Settings.
   */
  deferForSession(version: string): void {
    sessionDismissedVersions.add(version);
  },

  /**
   * Clears any in-memory "Later" state. Use this when the user explicitly
   * taps "Check for Updates" in Settings so they can re-see a deferred prompt.
   */
  clearSessionDismissed(): void {
    sessionDismissedVersions.clear();
  },

  isDeferredForSession(version: string): boolean {
    return sessionDismissedVersions.has(version);
  },

  /**
   * Download the APK for the given update, reporting progress via the optional
   * callback. Resolves with the absolute file path on success, or rejects on
   * error. Caller is responsible for installing + deleting the file.
   */
  async downloadApk(
    updateInfo: UpdateInfo,
    onProgress?: (p: DownloadProgress) => void,
  ): Promise<string> {
    if (Platform.OS !== 'android') {
      throw new Error('APK download is only supported on Android.');
    }
    if (!updateInfo.downloadUrl) {
      throw new Error('No APK asset is attached to this release.');
    }

    const fileName = `fitrack-v${updateInfo.version}.apk`;
    const targetPath = `${ReactNativeBlobUtil.fs.dirs.CacheDir}/${fileName}`;

    // If a previous download for this version is in flight, cancel it first.
    activeDownloads.get(updateInfo.version)?.cancel();

    const task = ReactNativeBlobUtil.config({
      path: targetPath,
      fileCache: true,
      overwrite: true,
      // Notification config is Android-only; the download runs in a foreground
      // service so the OS doesn't kill it while the user is in another app.
    }).fetch('GET', updateInfo.downloadUrl);

    if (onProgress) {
      task.progress({ count: 10 }, (received: number, total: number) => {
        const safeTotal = total > 0 ? total : 1;
        onProgress({
          bytesWritten: received,
          contentLength: total,
          fraction: received / safeTotal,
        });
      });
    }

    activeDownloads.set(updateInfo.version, task);

    try {
      const res = await task;
      const status = res.info().status;
      if (status < 200 || status >= 300) {
        throw new Error(`Download failed with HTTP ${status}`);
      }
      const actualPath = res.path();
      logger.info(`[updateService] Downloaded ${updateInfo.version} to ${actualPath}`);
      return actualPath;
    } finally {
      activeDownloads.delete(updateInfo.version);
    }
  },

  /**
   * Fire Android's package installer intent against the given APK file.
   * The FileProvider configured in AndroidManifest.xml grants the installer
   * temporary read access to the cached file.
   */
  async installApk(filePath: string): Promise<void> {
    if (Platform.OS !== 'android') {
      throw new Error('installApk is only supported on Android.');
    }
    // Strip the file:// prefix if present.
    const cleanPath = filePath.replace(/^file:\/\//, '');
    await ReactNativeBlobUtil.android.actionViewIntent(
      cleanPath,
      'application/vnd.android.package-archive',
    );
  },

  /**
   * Best-effort cleanup of a downloaded APK. Safe to call even if the file
   * doesn't exist (no-op).
   */
  async cleanupApk(filePath: string): Promise<void> {
    try {
      const cleanPath = filePath.replace(/^file:\/\//, '');
      const exists = await ReactNativeBlobUtil.fs.exists(cleanPath);
      if (exists) {
        await ReactNativeBlobUtil.fs.unlink(cleanPath);
        logger.info(`[updateService] Deleted cached APK ${cleanPath}`);
      }
    } catch (err) {
      logger.warn('[updateService] Failed to delete cached APK:', err);
    }
  },

  /**
   * Open the GitHub release page in the system browser. Used as a fallback
   * when no APK asset is attached to the release or when the in-app download
   * fails for any reason.
   */
  async openReleasePage(updateInfo: UpdateInfo): Promise<void> {
    const url = updateInfo.releasePageUrl || CONFIG.GITHUB_RELEASES_URL;
    try {
      await Linking.openURL(url);
    } catch (err) {
      logger.error('[updateService] Failed to open release page:', err);
    }
  },

  /**
   * Convenience: open the apkUrl directly. Used when download is impossible
   * and we just want the user to grab the file from their browser.
   */
  async openDownloadUrl(updateInfo: UpdateInfo): Promise<void> {
    const url = updateInfo.downloadUrl || updateInfo.releasePageUrl;
    try {
      await Linking.openURL(url);
    } catch (err) {
      logger.error('[updateService] Failed to open download URL:', err);
      await this.openReleasePage(updateInfo);
    }
  },

  async openPlayStore(): Promise<void> {
    const playStoreMarketUrl = 'market://details?id=com.fitrack.app';
    const playStoreWebUrl = CONFIG.PLAY_STORE_URL;

    try {
      if (Platform.OS === 'android') {
        const supported = await Linking.canOpenURL(playStoreMarketUrl);
        if (supported) {
          await Linking.openURL(playStoreMarketUrl);
          return;
        }
      }
      await Linking.openURL(playStoreWebUrl);
    } catch (err) {
      logger.error('[updateService] Failed to open Play Store:', err);
      await Linking.openURL(playStoreWebUrl);
    }
  },
};
