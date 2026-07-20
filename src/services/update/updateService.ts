import { Platform, NativeModules } from 'react-native';
import { CONFIG } from '../../config/constants';
import { STORAGE_KEYS } from '../../utils/constants';
import { storage } from '../../utils/storage';
import { logger } from '../../utils/logger';

const getBlobUtil = () => {
  if (!NativeModules.RNBlobUtil && !NativeModules.RNFetchBlob) {
    return null;
  }
  try {
    return require('react-native-blob-util').default;
  } catch (e) {
    return null;
  }
};

export interface UpdateInfo {
  version: string;
  releaseName: string;
  releaseNotes: string;
  downloadUrl: string;
  publishedAt: string;
  assetSize?: number;
  fileName: string;
}

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

export const updateService = {
  async checkForUpdate(force = false): Promise<UpdateInfo | null> {
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
        throw new Error(`GitHub API error: ${response.statusText}`);
      }

      const release = await response.json();
      const latestTag = release.tag_name || '';
      const currentVersion = CONFIG.APP_VERSION;

      storage.set(STORAGE_KEYS.LAST_UPDATE_CHECK, new Date().toISOString());

      if (compareVersions(latestTag, currentVersion) <= 0) {
        logger.info(`[updateService] App is up to date (${currentVersion} >= ${latestTag})`);
        return null;
      }

      // Find APK asset in release
      const assets = release.assets || [];
      const apkAsset = assets.find((asset: any) =>
        asset.name.toLowerCase().endsWith('.apk')
      );

      if (!apkAsset) {
        logger.warn('[updateService] Release found but no APK asset attached');
        return null;
      }

      return {
        version: latestTag.replace(/^v/, ''),
        releaseName: release.name || latestTag,
        releaseNotes: release.body || 'No release notes provided.',
        downloadUrl: apkAsset.browser_download_url,
        publishedAt: release.published_at || new Date().toISOString(),
        assetSize: apkAsset.size,
        fileName: apkAsset.name,
      };
    } catch (error: any) {
      logger.error('[updateService] Error checking for updates:', error);
      if (force) throw error;
      return null;
    }
  },

  shouldCheckForUpdateOnLaunch(): boolean {
    const lastCheck = storage.get<string>(STORAGE_KEYS.LAST_UPDATE_CHECK);
    if (!lastCheck) return true;

    const lastCheckTime = new Date(lastCheck).getTime();
    const now = new Date().getTime();
    return now - lastCheckTime >= CONFIG.UPDATE_CHECK_INTERVAL_MS;
  },

  getDismissedVersion(): string | null {
    return storage.get<string>(STORAGE_KEYS.DISMISSED_UPDATE_VERSION);
  },

  dismissUpdate(version: string): void {
    storage.set(STORAGE_KEYS.DISMISSED_UPDATE_VERSION, version);
  },

  async downloadUpdate(
    downloadUrl: string,
    fileName: string,
    onProgress: (received: number, total: number) => void
  ): Promise<string> {
    if (Platform.OS !== 'android') {
      throw new Error('In-app update downloading is only supported on Android');
    }

    const BlobUtil = getBlobUtil();
    if (!BlobUtil) {
      throw new Error(
        'In-app downloading requires re-compiling the Android app binary (Native module RNBlobUtil is not linked in current app build).'
      );
    }

    const { dirs } = BlobUtil.fs;
    const path = `${dirs.DownloadDir}/${fileName}`;

    // Remove existing file if present
    try {
      const exists = await BlobUtil.fs.exists(path);
      if (exists) {
        await BlobUtil.fs.unlink(path);
      }
    } catch (e) {
      logger.warn('[updateService] Error cleaning up old APK:', e);
    }

    const task = BlobUtil.config({
      path,
      fileCache: true,
      addAndroidDownloads: {
        useDownloadManager: true,
        notification: true,
        title: 'Downloading Fitrack Update',
        description: 'Downloading latest APK...',
        mime: 'application/vnd.android.package-archive',
        mediaScannable: true,
      },
    }).fetch('GET', downloadUrl);

    task.progress((received: string | number, total: string | number) => {
      const numReceived = parseInt(String(received), 10) || 0;
      const numTotal = parseInt(String(total), 10) || 0;
      onProgress(numReceived, numTotal);
    });

    const res = await task;
    const statusCode = res.respInfo.status;
    if (statusCode < 200 || statusCode >= 300) {
      throw new Error(`Download failed with status HTTP ${statusCode}`);
    }

    return res.path();
  },

  async installUpdate(filePath: string): Promise<void> {
    if (Platform.OS !== 'android') {
      throw new Error('APK installation is only supported on Android');
    }

    const BlobUtil = getBlobUtil();
    if (!BlobUtil) {
      throw new Error(
        'APK installation requires re-compiling the Android app binary.'
      );
    }

    try {
      // Verify file actually exists and is non-empty before launching intent
      const exists = await BlobUtil.fs.exists(filePath);
      if (!exists) {
        throw new Error('Downloaded APK file not found on device storage.');
      }

      const stat = await BlobUtil.fs.stat(filePath);
      if (stat.size <= 0) {
        throw new Error('Downloaded APK file is empty or corrupted.');
      }

      await BlobUtil.android.actionViewIntent(
        filePath,
        'application/vnd.android.package-archive'
      );
    } catch (err: any) {
      logger.error('[updateService] Failed to trigger package installer intent:', err);
      throw new Error(
        err.message ||
        'Could not launch package installer. Please check "Install unknown apps" permission in Android Settings or open your Downloads folder.'
      );
    }
  },
};
