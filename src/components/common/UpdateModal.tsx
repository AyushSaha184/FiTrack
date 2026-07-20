import React, { memo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Modal } from './Modal';
import { ProgressBar } from './ProgressBar';
import { Button } from './Button';
import { useColors } from '../../hooks';
import { spacing, radius, typography } from '../../theme';
import { updateService, type UpdateInfo } from '../../services/update/updateService';
import { formatDate } from '../../utils/helpers';

interface UpdateModalProps {
  visible: boolean;
  updateInfo: UpdateInfo | null;
  onClose: () => void;
}

type UpdateState = 'idle' | 'downloading' | 'ready' | 'error';

export const UpdateModal = memo<UpdateModalProps>(({
  visible,
  updateInfo,
  onClose,
}) => {
  const colors = useColors();
  const [state, setState] = useState<UpdateState>('idle');
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadedSize, setDownloadedSize] = useState('0 MB');
  const [totalSizeStr, setTotalSizeStr] = useState('');
  const [downloadedFilePath, setDownloadedFilePath] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  if (!updateInfo) return null;

  const formatMB = (bytes: number): string => {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleStartDownload = async () => {
    setState('downloading');
    setDownloadProgress(0);
    setErrorMessage('');

    try {
      const path = await updateService.downloadUpdate(
        updateInfo.downloadUrl,
        updateInfo.fileName,
        (received, total) => {
          const effectiveTotal = total > 0 ? total : (updateInfo.assetSize || 0);
          if (effectiveTotal > 0) {
            const pct = Math.min(100, Math.max(0, (received / effectiveTotal) * 100));
            setDownloadProgress(pct);
            setDownloadedSize(formatMB(received));
            setTotalSizeStr(formatMB(effectiveTotal));
          } else {
            setDownloadedSize(formatMB(received));
            setTotalSizeStr('Unknown');
          }
        }
      );

      setDownloadedFilePath(path);
      setState('ready');
      // Automatically prompt to install once download finishes
      await updateService.installUpdate(path);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to download update.');
      setState('error');
    }
  };

  const handleInstallNow = async () => {
    if (!downloadedFilePath) return;
    try {
      await updateService.installUpdate(downloadedFilePath);
    } catch (err: any) {
      Alert.alert('Installation Error', err.message);
    }
  };

  const handleDismiss = () => {
    updateService.dismissUpdate(updateInfo.version);
    onClose();
  };

  const formattedDate = updateInfo.publishedAt
    ? formatDate(new Date(updateInfo.publishedAt), 'short')
    : '';

  const totalMbText = updateInfo.assetSize ? formatMB(updateInfo.assetSize) : '';

  return (
    <Modal
      visible={visible}
      onClose={state === 'downloading' ? () => {} : onClose}
      title="New Update Available"
      sheet
    >
      <View style={styles.container}>
        {/* Header Info */}
        <View style={styles.headerInfo}>
          <View style={styles.titleBadgeRow}>
            <View style={[styles.badge, { backgroundColor: 'rgba(255, 255, 255, 0.08)', borderColor: colors.cardBorder }]}>
              <Text style={[styles.badgeText, { color: colors.text }]}>
                v{updateInfo.version}
              </Text>
            </View>
            {formattedDate ? (
              <Text style={[styles.dateText, { color: colors.textMuted }]}>
                Released {formattedDate}
              </Text>
            ) : null}
            {totalMbText ? (
              <Text style={[styles.sizeText, { color: colors.textMuted }]}>
                • {totalMbText}
              </Text>
            ) : null}
          </View>
          <Text style={[styles.releaseTitle, { color: colors.text }]}>
            {updateInfo.releaseName}
          </Text>
        </View>

        {/* Release Notes */}
        <View style={[styles.notesContainer, { backgroundColor: 'rgba(255, 255, 255, 0.03)', borderColor: colors.cardBorder }]}>
          <Text style={[styles.notesHeader, { color: colors.textMuted }]}>WHAT'S NEW</Text>
          <ScrollView style={styles.notesScroll} showsVerticalScrollIndicator={false}>
            <Text style={[styles.notesBody, { color: colors.textSecondary }]}>
              {updateInfo.releaseNotes}
            </Text>
          </ScrollView>
        </View>

        {/* Status / Progress Section */}
        {state === 'downloading' && (
          <View style={styles.progressSection}>
            <View style={styles.progressLabelRow}>
              <Text style={[styles.progressStatusText, { color: colors.text }]}>
                Downloading update...
              </Text>
              <Text style={[styles.progressPctText, { color: colors.textMuted }]}>
                {downloadedSize} / {totalSizeStr} ({Math.round(downloadProgress)}%)
              </Text>
            </View>
            <ProgressBar progress={downloadProgress} height={8} animated={false} />
          </View>
        )}

        {state === 'ready' && (
          <View style={[styles.statusBox, { backgroundColor: 'rgba(48, 209, 88, 0.1)', borderColor: colors.success }]}>
            <Text style={[styles.statusBoxText, { color: colors.success }]}>
              ✓ APK downloaded and ready to install!
            </Text>
          </View>
        )}

        {state === 'error' && (
          <View style={[styles.statusBox, { backgroundColor: 'rgba(255, 69, 58, 0.1)', borderColor: colors.error }]}>
            <Text style={[styles.statusBoxText, { color: colors.error }]}>
              {errorMessage || 'Download failed. Please check internet connection.'}
            </Text>
          </View>
        )}

        {/* Actions */}
        <View style={styles.actionButtons}>
          {state === 'idle' && (
            <>
              <Button
                title="Download & Install"
                onPress={handleStartDownload}
                fullWidth
                style={styles.primaryBtn}
              />
              <TouchableOpacity
                style={[styles.secondaryBtn, { backgroundColor: 'rgba(255,255,255,0.06)', borderColor: colors.cardBorder }]}
                onPress={handleDismiss}
                activeOpacity={0.7}
              >
                <Text style={[styles.secondaryBtnText, { color: colors.text }]}>Later</Text>
              </TouchableOpacity>
            </>
          )}

          {state === 'downloading' && (
            <Text style={[styles.downloadingNote, { color: colors.textMuted }]}>
              Please wait while the update is downloading...
            </Text>
          )}

          {state === 'ready' && (
            <Button
              title="Install Now"
              onPress={handleInstallNow}
              fullWidth
              style={styles.primaryBtn}
            />
          )}

          {state === 'error' && (
            <>
              <Button
                title="Retry Download"
                onPress={handleStartDownload}
                fullWidth
                style={styles.primaryBtn}
              />
              <TouchableOpacity
                style={[styles.secondaryBtn, { backgroundColor: 'rgba(255,255,255,0.06)', borderColor: colors.cardBorder }]}
                onPress={onClose}
                activeOpacity={0.7}
              >
                <Text style={[styles.secondaryBtnText, { color: colors.text }]}>Close</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
});

UpdateModal.displayName = 'UpdateModal';

const styles = StyleSheet.create({
  container: {
    paddingBottom: spacing.base,
  },
  headerInfo: {
    marginBottom: spacing.base,
  },
  titleBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  dateText: {
    fontSize: 13,
  },
  sizeText: {
    fontSize: 13,
  },
  releaseTitle: {
    fontSize: typography.h3.fontSize,
    fontWeight: '700',
    marginTop: spacing.xxs,
  },
  notesContainer: {
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md,
    maxHeight: 180,
    marginBottom: spacing.base,
  },
  notesHeader: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: spacing.xs,
  },
  notesScroll: {
    maxHeight: 140,
  },
  notesBody: {
    fontSize: 14,
    lineHeight: 20,
  },
  progressSection: {
    marginBottom: spacing.base,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  progressStatusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  progressPctText: {
    fontSize: 12,
  },
  statusBox: {
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    marginBottom: spacing.base,
  },
  statusBoxText: {
    fontSize: 14,
    fontWeight: '500',
  },
  actionButtons: {
    gap: spacing.sm,
  },
  primaryBtn: {
    borderRadius: radius.md,
  },
  secondaryBtn: {
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    fontSize: 16,
    fontWeight: '600',
  },
  downloadingNote: {
    textAlign: 'center',
    fontSize: 13,
    paddingVertical: spacing.sm,
  },
});
