import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Image,
  Share,
  Platform,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Svg, { Path, Circle, Line, Polyline } from 'react-native-svg';
import { AnimatedCard } from '../../components/common/AnimatedCard';
import { AnimatedScreen } from '../../components/common/AnimatedScreen';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Modal } from '../../components/common/Modal';
import { CustomAlert } from '../../components/common/CustomAlert';
import { Logo } from '../../components/common/Logo';
import { observer } from 'mobx-react-lite';
import { useAuth, useColors, useSettingsStore } from '../../hooks';
import { spacing, typography, radius } from '../../theme';
import { errorLogs } from '../../utils/logger';
import { CONFIG } from '../../config/constants';
import { crashReportsService } from '../../services/supabase/crashReports';
import { updateService, type UpdateInfo } from '../../services/update/updateService';
import { UpdateModal } from '../../components/common/UpdateModal';

export const SettingsScreen = observer(() => {
  const colors = useColors();
  const navigation = useNavigation();
  const { user, logout, updateProfile } = useAuth();
  const settingsStore = useSettingsStore();
  const [showLogoutAlert, setShowLogoutAlert] = useState(false);
  const [showEditNameModal, setShowEditNameModal] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [isUpdatingName, setIsUpdatingName] = useState(false);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);

  const handleLogout = () => {
    setShowLogoutAlert(true);
  };

  const handleSendCrashReport = async () => {
    const payload = crashReportsService.buildPayload({
      userName: user?.name,
      userEmail: user?.email,
      userId: user?.id,
      settings: {
        theme: settingsStore.theme,
        units: settingsStore.units,
        notifications: settingsStore.notifications,
        workout: settingsStore.workout,
        recordBugReports: settingsStore.recordBugReports,
      },
      diagnosticLogs: errorLogs,
    });

    const crashReport = JSON.stringify(payload, null, 2);

    crashReportsService.submit(payload);

    const subject = `FiTrack Crash Report - v${payload.app.version}`;
    const emailUrl = `mailto:ayushsaha184@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(crashReport)}`;

    try {
      const canOpen = await Linking.canOpenURL(emailUrl);
      if (canOpen) {
        await Linking.openURL(emailUrl);
      } else {
        await Share.share({
          title: 'FiTrack Crash Report',
          message: crashReport,
        });
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send crash report');
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <AnimatedScreen>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <Logo size="medium" />
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={[styles.settingsButton, { backgroundColor: 'rgba(255,255,255,0.06)' }]}
            >
              <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={colors.text} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <Line x1="19" y1="12" x2="5" y2="12" />
                <Polyline points="12 19 5 12 12 5" />
              </Svg>
            </TouchableOpacity>
          </View>

          <Text style={[styles.pageTitle, { color: colors.text }]}>Settings</Text>

          {/* Profile Section */}
          <AnimatedCard index={0} style={styles.profileCard}>
            <View style={styles.profileHeader}>
              <View style={styles.profileLabelRow}>
                <Text style={styles.sectionIcon}>👤</Text>
                <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
                  PROFILE
                </Text>
              </View>
              <TouchableOpacity
                style={[
                  styles.logoutPill,
                  {
                    backgroundColor: 'rgba(255,255,255,0.06)',
                    borderColor: colors.cardBorder,
                  },
                ]}
                onPress={handleLogout}
                activeOpacity={0.7}
              >
                <Text style={[styles.logoutText, { color: colors.text }]}>Logout</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.profileInfo}>
              {/* Profile Picture - show image if avatarUrl exists, otherwise initial */}
              {user?.avatarUrl ? (
                <Image
                  source={{ uri: user.avatarUrl }}
                  style={styles.avatarImage}
                />
              ) : (
                <View style={[styles.avatar, { backgroundColor: colors.surface }]}>
                  <Text style={styles.avatarText}>
                    {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                  </Text>
                </View>
              )}
              <View style={styles.userDetails}>
                <Text style={[styles.userName, { color: colors.text }]}>
                  {user?.name || 'User'}
                </Text>
                <Text style={[styles.userEmail, { color: colors.textSecondary }]}>
                  {user?.email || 'user@example.com'}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.profileNav, { borderTopColor: colors.cardBorder }]}
              onPress={() => {
                setNameInput(user?.name || '');
                setShowEditNameModal(true);
              }}
              activeOpacity={0.7}
            >
              <Text style={[styles.profileNavText, { color: colors.text }]}>
                Edit Name
              </Text>
              <Text style={[styles.chevron, { color: colors.textMuted }]}>›</Text>
            </TouchableOpacity>
          </AnimatedCard>

          {/* Developer Options */}
          <AnimatedCard index={1} style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionIcon}>{'</>'}</Text>
              <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
                DEVELOPER OPTIONS
              </Text>
            </View>

            <View style={styles.settingRow}>
              <View style={styles.settingTextGroup}>
                <Text style={[styles.settingTitle, { color: colors.text }]}>
                  Record Bug Reports
                </Text>
                <Text style={[styles.settingDesc, { color: colors.textSecondary }]}>
                  Allow FiTrack to record bugs and send diagnostic logs to help improve
                  the app.
                </Text>
              </View>
              <Switch
                value={settingsStore.recordBugReports}
                onValueChange={(val) => settingsStore.setRecordBugReports(val)}
                trackColor={{
                  false: 'rgba(255,255,255,0.12)',
                  true: 'rgba(255,255,255,0.35)',
                }}
                thumbColor="#FFFFFF"
              />
            </View>
          </AnimatedCard>

          {/* Help Improve FiTrack */}
          <AnimatedCard index={2} style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionIcon}>♡</Text>
              <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
                HELP IMPROVE FITRACK
              </Text>
            </View>

            <TouchableOpacity
              style={[
                styles.crashButton,
                {
                  backgroundColor: 'rgba(255,255,255,0.06)',
                  borderColor: colors.cardBorder,
                },
              ]}
              onPress={handleSendCrashReport}
              activeOpacity={0.7}
            >
              <Text style={styles.crashIcon}>🐛</Text>
              <Text style={[styles.crashButtonText, { color: colors.text }]}>
                Send Crash Report
              </Text>
            </TouchableOpacity>

            <Text style={[styles.helpText, { color: colors.textSecondary }]}>
              If FiTrack crashes or experiences an issue,{'\n'}
              tap the button above to send us a crash report.{'\n\n'}
              This helps us identify and fix problems faster.
            </Text>

            <Text style={[styles.guideTitle, { color: colors.text }]}>
              How to get a crash report
            </Text>

            {[
              'Crash reports are sent automatically when an error occurs.',
              'The "Record Bug Reports" toggle controls local error logging.',
              'Tap "Send Crash Report" to manually send a report anytime.',
              'Your reports help us make FiTrack better for everyone.',
            ].map((step, index) => (
              <View key={index} style={styles.stepRow}>
                <View style={[styles.stepNumber, { backgroundColor: 'rgba(255,255,255,0.06)' }]}>
                  <Text style={[styles.stepNumberText, { color: colors.text }]}>
                    {index + 1}
                  </Text>
                </View>
                <Text style={[styles.stepText, { color: colors.textSecondary }]}>
                  {step}
                </Text>
              </View>
            ))}
          </AnimatedCard>

          {/* App Updates Section */}
          <AnimatedCard index={3} style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionIcon}>🔄</Text>
              <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
                APP UPDATES
              </Text>
            </View>

            <View style={styles.settingRow}>
              <View style={styles.settingTextGroup}>
                <Text style={[styles.settingTitle, { color: colors.text }]}>
                  Current Version
                </Text>
                <Text style={[styles.settingDesc, { color: colors.textSecondary }]}>
                  v{CONFIG.APP_VERSION}
                </Text>
              </View>
              <TouchableOpacity
                style={[
                  styles.logoutPill,
                  {
                    backgroundColor: 'rgba(255,255,255,0.08)',
                    borderColor: colors.cardBorder,
                  },
                ]}
                onPress={async () => {
                  setIsCheckingUpdate(true);
                  try {
                    const info = await updateService.checkForUpdate(true);
                    if (info) {
                      setUpdateInfo(info);
                      setShowUpdateModal(true);
                    } else {
                      Alert.alert('Up to Date', `FiTrack v${CONFIG.APP_VERSION} is currently the latest version.`);
                    }
                  } catch (err: any) {
                    Alert.alert('Update Check Failed', err.message || 'Unable to connect to update server.');
                  } finally {
                    setIsCheckingUpdate(false);
                  }
                }}
                disabled={isCheckingUpdate}
                activeOpacity={0.7}
              >
                <Text style={[styles.logoutText, { color: colors.text }]}>
                  {isCheckingUpdate ? 'Checking...' : 'Check for Updates'}
                </Text>
              </TouchableOpacity>
            </View>
          </AnimatedCard>

          <View style={styles.footer}>
            <Text style={[styles.version, { color: colors.textMuted }]}>
              FiTrack v{CONFIG.APP_VERSION}
            </Text>
          </View>
        </ScrollView>
      </AnimatedScreen>

      <UpdateModal
        visible={showUpdateModal}
        updateInfo={updateInfo}
        onClose={() => setShowUpdateModal(false)}
      />

      <CustomAlert
        visible={showLogoutAlert}
        onClose={() => setShowLogoutAlert(false)}
        title="Logout"
        message="Are you sure you want to logout?"
        actions={[
          { text: 'Cancel', style: 'cancel', onPress: () => setShowLogoutAlert(false) },
          {
            text: 'Logout',
            style: 'destructive',
            onPress: () => {
              setShowLogoutAlert(false);
              logout();
            },
          },
        ]}
      />

      {/* Edit Name Modal */}
      <Modal
        visible={showEditNameModal}
        onClose={() => setShowEditNameModal(false)}
        title="Edit Name"
      >
        <Input
          label="Display Name"
          value={nameInput}
          onChangeText={setNameInput}
          placeholder="Enter your name"
          autoCapitalize="words"
          leftIcon={
            <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <Circle cx="12" cy="7" r="4" />
            </Svg>
          }
        />
        <Button
          title={isUpdatingName ? "Saving..." : "Save"}
          disabled={isUpdatingName}
          onPress={async () => {
            if (!nameInput.trim()) {
              Alert.alert('Error', 'Name cannot be empty');
              return;
            }
            setIsUpdatingName(true);
            try {
              await updateProfile({ name: nameInput.trim() });
              setShowEditNameModal(false);
            } catch (e: any) {
              Alert.alert('Error', e.message || 'Failed to update name');
            } finally {
              setIsUpdatingName(false);
            }
          }}
          fullWidth
          style={{ marginTop: spacing.base }}
        />
      </Modal>
    </SafeAreaView>
  );
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: 120,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.base,
  },
  settingsButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  settingsIcon: {
    fontSize: 20,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: spacing.xl,
  },
  profileCard: {
    marginBottom: spacing.base,
  },
  profileHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  profileLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sectionIcon: {
    fontSize: 16,
    opacity: 0.7,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: 0.8,
  },
  logoutPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.base,
    borderRadius: radius.pill,
    borderWidth: 1,
    gap: spacing.xs,
  },
  logoutIcon: {
    fontSize: 14,
  },
  logoutText: {
    fontSize: 14,
    fontWeight: '500',
  },
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.base,
    marginBottom: spacing.lg,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 20,
    fontWeight: '700',
  },
  userEmail: {
    fontSize: 16,
    marginTop: 4,
  },
  profileNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.base,
    borderTopWidth: 1,
  },
  profileNavText: {
    fontSize: 16,
    fontWeight: '400',
  },
  chevron: {
    fontSize: 22,
    fontWeight: '300',
  },
  sectionCard: {
    marginBottom: spacing.base,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.base,
  },
  settingTextGroup: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  settingDesc: {
    fontSize: 14,
    lineHeight: 20,
  },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.lg,
    marginTop: spacing.lg,
    borderTopWidth: 1,
  },
  navRowText: {
    fontSize: 16,
  },
  crashButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  crashIcon: {
    fontSize: 20,
  },
  crashButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  helpText: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  guideTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: spacing.base,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    fontSize: 14,
    fontWeight: '600',
  },
  stepText: {
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
    paddingTop: 6,
  },
  footer: {
    alignItems: 'center',
    marginTop: spacing.xxxl,
    paddingBottom: spacing.xl,
  },
  version: {
    fontSize: 14,
  },
});
