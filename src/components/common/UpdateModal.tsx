import React, { memo, useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Pressable,
  Platform,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import Svg, { Path, Polyline, Line, Circle as SvgCircle } from 'react-native-svg';
import { useColors } from '../../hooks';
import { typography } from '../../theme';
import { logger } from '../../utils/logger';
import {
  updateService,
  type UpdateInfo,
  type DownloadProgress,
} from '../../services/update/updateService';

interface UpdateModalProps {
  visible: boolean;
  updateInfo: UpdateInfo | null;
  onClose: () => void;
}

type Phase = 'idle' | 'downloading' | 'installing' | 'error';

const parseReleaseNotes = (raw: string): string[] => {
  if (!raw) return [];
  const cleaned = raw.replace(/\[!\s*mandatory\]/gi, '').trim();
  return cleaned
    .split(/\r?\n/)
    .map((l) => l.replace(/^[\s>*\-•·]+/, '').trim())
    .filter((l) => l.length > 0);
};

const formatBytes = (b: number): string => {
  if (!b || b <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(units.length - 1, Math.floor(Math.log(b) / Math.log(1024)));
  return `${(b / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
};

export const UpdateModal = memo<UpdateModalProps>(({
  visible,
  updateInfo,
  onClose,
}) => {
  const colors = useColors();
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.92);
  const translateY = useSharedValue(24);

  const [phase, setPhase] = useState<Phase>('idle');
  const [progress, setProgress] = useState<DownloadProgress>({
    bytesWritten: 0,
    contentLength: 0,
    fraction: 0,
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // Track the downloaded file path so we can clean it up after install.
  const downloadedPathRef = useRef<string | null>(null);

  useEffect(() => {
    if (visible) {
      opacity.set(withTiming(1, { duration: 220, easing: Easing.out(Easing.quad) }));
      scale.set(withSpring(1, { damping: 18, stiffness: 220 }));
      translateY.set(withSpring(0, { damping: 18, stiffness: 220 }));
    } else {
      opacity.set(withTiming(0, { duration: 160 }));
      scale.set(withTiming(0.95, { duration: 160 }));
      translateY.set(withTiming(12, { duration: 160 }));
    }
  }, [visible, opacity, scale, translateY]);

  // Reset phase whenever the modal is closed or the update info changes.
  useEffect(() => {
    if (!visible) {
      setPhase('idle');
      setProgress({ bytesWritten: 0, contentLength: 0, fraction: 0 });
      setErrorMessage(null);
      downloadedPathRef.current = null;
    }
  }, [visible, updateInfo?.version]);

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: opacity.get(),
  }));

  const cardStyle = useAnimatedStyle(() => ({
    opacity: opacity.get(),
    transform: [
      { scale: scale.get() },
      { translateY: translateY.get() },
    ],
  }));

  if (!visible || !updateInfo) return null;

  const notes = parseReleaseNotes(updateInfo.releaseNotes);
  const isMandatory = !!updateInfo.mandatory;
  const canDirectDownload = Platform.OS === 'android' && !!updateInfo.downloadUrl;
  const inProgress = phase === 'downloading' || phase === 'installing';
  const progressPct = Math.max(0, Math.min(1, progress.fraction)) * 100;

  const handleDownload = async () => {
    if (!canDirectDownload) {
      // No APK asset on the release -> go straight to the GitHub page.
      updateService.openReleasePage(updateInfo);
      return;
    }
    setPhase('downloading');
    setErrorMessage(null);
    setProgress({ bytesWritten: 0, contentLength: 0, fraction: 0 });
    try {
      const filePath = await updateService.downloadApk(updateInfo, (p) => {
        setProgress(p);
      });
      downloadedPathRef.current = filePath;
      setPhase('installing');
      try {
        await updateService.installApk(filePath);
        // Best-effort cleanup; the file may already be consumed by the installer
        // but typically the cache copy remains until we delete it.
        await updateService.cleanupApk(filePath);
        downloadedPathRef.current = null;
        onClose();
      } catch (installErr: any) {
        // Install intent failed -> surface the error and let the user choose
        // to open the release page themselves.
        await updateService.cleanupApk(filePath);
        downloadedPathRef.current = null;
        setErrorMessage('Could not start the installer. You can download it from GitHub instead.');
        setPhase('error');
      }
    } catch (e: any) {
      logger.error('[UpdateModal] download failed', e);
      setErrorMessage(e?.message || 'Could not download the update. You can download it from GitHub instead.');
      setPhase('error');
    }
  };

  const handleLater = () => {
    if (isMandatory || inProgress) return;
    updateService.deferForSession(updateInfo.version);
    onClose();
  };

  const handleOpenReleasePage = () => {
    updateService.openReleasePage(updateInfo);
  };

  // Render the action row depending on the current phase.
  const renderActions = () => {
    if (phase === 'downloading') {
      return (
        <View style={[styles.progressBlock]}>
          <View style={[styles.progressBarBg, { backgroundColor: colors.cardSurface }]}>
            <View
              style={[
                styles.progressBarFill,
                {
                  width: `${progressPct}%`,
                  backgroundColor: colors.primary,
                },
              ]}
            />
          </View>
          <Text style={[styles.progressText, { color: colors.textSecondary }]}>
            Downloading… {progressPct.toFixed(0)}%
            {progress.contentLength > 0
              ? `  •  ${formatBytes(progress.bytesWritten)} / ${formatBytes(progress.contentLength)}`
              : ''}
          </Text>
        </View>
      );
    }
    if (phase === 'installing') {
      return (
        <View style={styles.progressBlock}>
          <View style={styles.installingRow}>
            <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={colors.primary} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <Polyline points="20 6 9 17 4 12" />
            </Svg>
            <Text style={[styles.progressText, { color: colors.text }]}>
              Download complete — opening installer…
            </Text>
          </View>
        </View>
      );
    }
    if (phase === 'error') {
      return (
        <View style={styles.actions}>
          {!isMandatory ? (
            <TouchableOpacity
              style={[styles.secondaryBtn, { backgroundColor: colors.cardSurface, borderColor: colors.cardBorder }]}
              onPress={handleLater}
              activeOpacity={0.7}
            >
              <Text style={[styles.secondaryBtnText, { color: colors.text }]}>Later</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
            onPress={handleOpenReleasePage}
            activeOpacity={0.8}
          >
            <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 8 }}>
              <Path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <Polyline points="7 10 12 15 17 10" />
              <Line x1="12" y1="15" x2="12" y2="3" />
            </Svg>
            <Text style={styles.primaryBtnText}>Download from GitHub</Text>
          </TouchableOpacity>
        </View>
      );
    }
    // idle
    return (
      <View style={styles.actions}>
        {!isMandatory ? (
          <TouchableOpacity
            style={[styles.secondaryBtn, { backgroundColor: colors.cardSurface, borderColor: colors.cardBorder }]}
            onPress={handleLater}
            activeOpacity={0.7}
          >
            <Text style={[styles.secondaryBtnText, { color: colors.text }]}>Later</Text>
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity
          style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
          onPress={handleDownload}
          activeOpacity={0.8}
        >
          <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 8 }}>
            <Path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <Polyline points="7 10 12 15 17 10" />
            <Line x1="12" y1="15" x2="12" y2="3" />
          </Svg>
          <Text style={styles.primaryBtnText}>
            {canDirectDownload
              ? isMandatory
                ? 'Update Now'
                : 'Download'
              : 'View on GitHub'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="auto">
      <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, overlayStyle]}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={inProgress || isMandatory ? undefined : handleLater}
        />
      </Animated.View>

      <View style={styles.center} pointerEvents="box-none">
        <Animated.View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.cardBorder },
            cardStyle,
          ]}
        >
          <View style={styles.iconWrap}>
            <Text style={[styles.title, { color: colors.text }]}>
              Update Available
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              FiTrack v{updateInfo.version} is now available
            </Text>
          </View>

          {notes.length > 0 ? (
            <View style={[styles.notesBox, { backgroundColor: colors.cardSurface, borderColor: colors.cardBorder }]}>
              <Text style={[styles.notesLabel, { color: colors.textMuted }]}>WHAT'S NEW</Text>
              <ScrollView
                style={styles.notesScroll}
                contentContainerStyle={styles.notesContent}
                showsVerticalScrollIndicator={false}
              >
                {notes.map((line, idx) => (
                  <View key={`${idx}-${line.slice(0, 12)}`} style={styles.noteRow}>
                    <View style={[styles.bullet, { backgroundColor: colors.primary }]} />
                    <Text style={[styles.noteText, { color: colors.textSecondary }]}>
                      {line}
                    </Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          ) : null}

          {errorMessage ? (
            <Text style={[styles.errorText, { color: colors.textSecondary }]}>{errorMessage}</Text>
          ) : null}

          {renderActions()}
        </Animated.View>
      </View>
    </View>
  );
});

UpdateModal.displayName = 'UpdateModal';

// Reference SvgCircle to avoid unused-import lint errors if the icon set changes.
void SvgCircle;

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 18,
  },
  iconWrap: {
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    ...typography.h2,
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 6,
  },
  notesBox: {
    marginTop: 18,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 4,
    maxHeight: 200,
  },
  notesLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  notesScroll: {
    maxHeight: 170,
  },
  notesContent: {
    paddingBottom: 10,
  },
  noteRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  bullet: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginTop: 8,
    marginRight: 10,
  },
  noteText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  secondaryBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
  primaryBtn: {
    flex: 1.4,
    paddingVertical: 13,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  progressBlock: {
    marginTop: 18,
  },
  progressBarBg: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
  },
  installingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  errorText: {
    fontSize: 12,
    marginTop: 14,
    textAlign: 'center',
  },
});
