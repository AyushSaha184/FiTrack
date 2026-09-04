import React, { memo, useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import Svg, { Path, Polyline, Line, Circle as SvgCircle } from 'react-native-svg';
import { useColors } from '../../hooks';
import { typography, spacing, radius } from '../../theme';
import { logger } from '../../utils/logger';
import { Modal } from './Modal';
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
  if (!raw) {
    return [];
  }
  const cleaned = raw.replace(/\[!\s*mandatory\]/gi, '').trim();
  return cleaned
    .split(/\r?\n/)
    .map((l) => l.replace(/^[\s>*\-•·]+/, '').trim())
    .filter((l) => l.length > 0);
};

const formatBytes = (b: number): string => {
  if (!b || b <= 0) {
    return '0 B';
  }
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
  const [phase, setPhase] = useState<Phase>('idle');
  const [progress, setProgress] = useState<DownloadProgress>({
    bytesWritten: 0,
    contentLength: 0,
    fraction: 0,
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // Track the downloaded file path so we can clean it up after install.
  const downloadedPathRef = useRef<string | null>(null);

  // Reset phase whenever the modal is closed or the update info changes.
  useEffect(() => {
    if (!visible) {
      setPhase('idle');
      setProgress({ bytesWritten: 0, contentLength: 0, fraction: 0 });
      setErrorMessage(null);
      downloadedPathRef.current = null;
    }
  }, [visible, updateInfo?.version]);

  if (!visible || !updateInfo) {
    return null;
  }

  const notes = parseReleaseNotes(updateInfo.releaseNotes);
  const isMandatory = !!updateInfo.mandatory;
  const canDirectDownload = Platform.OS === 'android' && !!updateInfo.downloadUrl;
  const inProgress = phase === 'downloading' || phase === 'installing';
  const progressPct = Math.max(0, Math.min(1, progress.fraction)) * 100;

  const handleDownload = async () => {
    if (!canDirectDownload) {
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
        await updateService.cleanupApk(filePath);
        downloadedPathRef.current = null;
        onClose();
      } catch (installErr: any) {
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
    if (isMandatory || inProgress) {
      return;
    }
    updateService.deferForSession(updateInfo.version);
    onClose();
  };

  const handleOpenReleasePage = () => {
    updateService.openReleasePage(updateInfo);
  };

  const renderActions = () => {
    if (phase === 'downloading') {
      return (
        <View style={styles.progressBlock}>
          <View style={[styles.progressBarBg, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
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
              style={[styles.secondaryBtn, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}
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
            <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" style={styles.primaryBtnIcon}>
              <Path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <Polyline points="7 10 12 15 17 10" />
              <Line x1="12" y1="15" x2="12" y2="3" />
            </Svg>
            <Text style={styles.primaryBtnText}>Download from GitHub</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return (
      <View style={styles.actions}>
        {!isMandatory ? (
          <TouchableOpacity
            style={[styles.secondaryBtn, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}
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
          <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" style={styles.primaryBtnIcon}>
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
    <Modal
      visible={visible}
      onClose={inProgress || isMandatory ? () => {} : onClose}
      title="Update Available"
      sheet
      showCloseButton={!inProgress && !isMandatory}
      bodyStyle={styles.modalBody}
    >
      <View style={styles.container}>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          FiTrack v{updateInfo.version} is now available
        </Text>

        {notes.length > 0 ? (
          <View style={[styles.notesBox, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
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
      </View>
    </Modal>
  );
});

UpdateModal.displayName = 'UpdateModal';

void SvgCircle;

const styles = StyleSheet.create({
  modalBody: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
  },
  container: {
    width: '100%',
  },
  subtitle: {
    fontSize: typography.body.fontSize,
    textAlign: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.base,
  },
  notesBox: {
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.base,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
    maxHeight: 320,
    marginBottom: spacing.base,
  },
  notesLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginBottom: spacing.xs,
  },
  notesScroll: {
    maxHeight: 280,
  },
  notesContent: {
    paddingBottom: spacing.sm,
  },
  noteRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  bullet: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginTop: 8,
    marginRight: spacing.sm,
  },
  noteText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 22,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  secondaryBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: radius.md,
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
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnIcon: {
    marginRight: spacing.xs,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  progressBlock: {
    marginTop: spacing.sm,
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
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  installingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  errorText: {
    fontSize: 12,
    marginTop: spacing.base,
    textAlign: 'center',
  },
});
