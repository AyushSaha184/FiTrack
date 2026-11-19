import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Image,
  ActivityIndicator,
  Alert,
  Linking,
  TextInput,
  LayoutChangeEvent,
} from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Svg, { Path, Circle, Line, Polyline } from 'react-native-svg';
import { AnimatedCard } from '../../components/common/AnimatedCard';
import { AnimatedScreen } from '../../components/common/AnimatedScreen';
import { CustomAlert } from '../../components/common/CustomAlert';
import { Logo } from '../../components/common/Logo';
import { observer } from 'mobx-react-lite';
import { useAuth, useColors, useSettingsStore } from '../../hooks';
import type { ThemeId } from '../../stores/SettingsStore';
import { spacing, radius, responsive } from '../../theme';
import { getErrorLogs, logger } from '../../utils/logger';
import { CONFIG } from '../../config/constants';
import { crashReportsService } from '../../services/crashReports';
import { updateService, type UpdateInfo } from '../../services/update/updateService';
import { UpdateModal } from '../../components/common/UpdateModal';
import { avatarService } from '../../services/profile/avatarService';
import { stepCounterService } from '../../services/stepCounterService';

const THEME_OPTIONS: { id: ThemeId; label: string }[] = [
  { id: 'dark', label: 'Dark' },
  { id: 'amoled', label: 'AMOLED' },
  { id: 'light', label: 'Light' },
];

export const SettingsScreen = observer(() => {
  const colors = useColors();
  const navigation = useNavigation();
  const { user, resetApp, updateProfile } = useAuth();
  const settingsStore = useSettingsStore();
  const [showResetAlert, setShowResetAlert] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [nameInput, setNameInput] = useState(user?.name || '');
  const [isUpdatingName, setIsUpdatingName] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [showRemoveAvatarAlert, setShowRemoveAvatarAlert] = useState(false);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showUpToDateAlert, setShowUpToDateAlert] = useState(false);
  const [updateErrorMessage, setUpdateErrorMessage] = useState('');
  const [showUpdateErrorAlert, setShowUpdateErrorAlert] = useState(false);
  const [isXiaomi, setIsXiaomi] = useState(false);

  useEffect(() => {
    stepCounterService.isXiaomiDevice().then((val) => setIsXiaomi(val)).catch(() => {});
  }, []);

  // Physical stats state
  const initialGender = user?.profile?.gender || 'male';
  const [gender, setGender] = useState<'male' | 'female'>(initialGender as any);
  const [heightInput, setHeightInput] = useState(user?.profile?.height ? String(user.profile.height) : '');
  const [containerWidth, setContainerWidth] = useState(0);

  // Theme picker state (same pill-bubble pattern as gender)
  const [themeContainerWidth, setThemeContainerWidth] = useState(0);
  const themeSlideOffset = useSharedValue(0);

  useEffect(() => {
    if (themeContainerWidth > 0) {
      const idx = Math.max(0, THEME_OPTIONS.findIndex((o) => o.id === settingsStore.theme));
      themeSlideOffset.value = idx * (themeContainerWidth / THEME_OPTIONS.length);
    }
  }, [settingsStore.theme, themeContainerWidth, themeSlideOffset]);

  const handleThemeChange = (id: ThemeId) => {
    settingsStore.setTheme(id);
  };

  const slideOffset = useSharedValue(0);

  useEffect(() => {
    if (containerWidth > 0) {
      slideOffset.value = gender === 'male' ? 0 : containerWidth / 2;
    }
  }, [gender, containerWidth, slideOffset]);

  const handleGenderChange = async (newGender: 'male' | 'female') => {
    setGender(newGender);
    try {
      const profileData: any = { gender: newGender };
      if (heightInput && !isNaN(Number(heightInput)) && Number(heightInput) > 0) {
        profileData.height = Number(heightInput);
      }
      await updateProfile({
        profile: profileData,
      });
    } catch (e: any) {
      logger.error('[SettingsScreen] Failed to update gender:', e);
    }
  };

  const handleHeightChangeText = (text: string) => {
    const cleanText = text.replace(/[^0-9]/g, '');
    setHeightInput(cleanText);
  };

  const handleHeightBlur = async () => {
    try {
      const profileData: any = { gender };
      if (heightInput && !isNaN(Number(heightInput)) && Number(heightInput) > 0) {
        profileData.height = Number(heightInput);
      }
      await updateProfile({
        profile: profileData,
      });
    } catch (e: any) {
      logger.error('[SettingsScreen] Failed to update height:', e);
    }
  };

  const animatedBubbleStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: withSpring(slideOffset.value, { damping: 20, stiffness: 220 }) }],
  }));

  const animatedThemeBubbleStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: withSpring(themeSlideOffset.value, { damping: 20, stiffness: 220 }) }],
  }));

  useEffect(() => {
    if (user?.name) {
      setNameInput(user.name);
    }
  }, [user?.name]);

  const handleSaveName = async () => {
    const trimmed = nameInput.trim();
    if (!trimmed) {
      setNameInput(user?.name || 'Athlete');
      return;
    }
    if (trimmed === user?.name) {
      return;
    }
    setIsUpdatingName(true);
    try {
      await updateProfile({ name: trimmed });
    } catch (e: any) {
      logger.error('[SettingsScreen] Failed to update name:', e);
      Alert.alert('Error', e.message || 'Failed to update name');
    } finally {
      setIsUpdatingName(false);
    }
  };

  const handlePickAvatar = async () => {
    if (!user?.id) {
      return;
    }
    try {
      setIsUploadingAvatar(true);
      const photoUri = await avatarService.pickAvatar(user.id);
      if (photoUri) {
        await updateProfile({ avatarUrl: photoUri });
      }
    } catch (e: any) {
      logger.error('[SettingsScreen] Failed to pick avatar:', e);
      Alert.alert('Photo Error', e.message || 'Could not update profile photo.');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleRemoveAvatar = async () => {
    if (!user?.id) {
      return;
    }
    try {
      setIsUploadingAvatar(true);
      await avatarService.removeAvatar(user.id);
      await updateProfile({ avatarUrl: '' });
    } catch (e: any) {
      logger.error('[SettingsScreen] Failed to remove avatar:', e);
      Alert.alert('Photo Error', e.message || 'Could not remove profile photo.');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleResetApp = async () => {
    setIsResetting(true);
    try {
      await resetApp();
    } catch (e: any) {
      logger.error('[SettingsScreen] Failed to reset app:', e);
      Alert.alert('Reset Failed', e?.message || 'Unable to erase local data.');
    } finally {
      setIsResetting(false);
    }
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
      diagnosticLogs: getErrorLogs(),
    });

    const crashReport = JSON.stringify(payload, null, 2);

    // Keep a copy on-device as well; there is no backend to upload to.
    crashReportsService.saveLocally(payload);

    const subject = `FiTrack Crash Report - v${payload.app.version}`;
    const emailUrl = `mailto:ayushsaha184@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(crashReport)}`;

    try {
      await Linking.openURL(emailUrl);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to open email app');
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
              style={[styles.settingsButton, { backgroundColor: colors.cardSurface }]}
            >
              <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={colors.text} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <Line x1="19" y1="12" x2="5" y2="12" />
                <Polyline points="12 19 5 12 12 5" />
              </Svg>
            </TouchableOpacity>
          </View>

          <Text style={[styles.pageTitle, { color: colors.text }]}>Settings</Text>

          {/* Profile Section */}
          <AnimatedCard index={0} style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionIcon}>👤</Text>
              <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
                PROFILE
              </Text>
            </View>

            <View style={styles.profileContent}>
              {/* DP / Avatar Section */}
              <View style={styles.avatarContainer}>
                <TouchableOpacity
                  onPress={handlePickAvatar}
                  activeOpacity={0.8}
                  style={[styles.avatarButton, { borderColor: colors.cardBorder }]}
                  disabled={isUploadingAvatar}
                >
                  {user?.avatarUrl ? (
                    <Image source={{ uri: user.avatarUrl }} style={styles.avatarImage} />
                  ) : (
                    <View style={[styles.avatarPlaceholder, { backgroundColor: colors.surface }]}>
                      <Text style={styles.avatarText}>
                        {nameInput?.trim()?.charAt(0)?.toUpperCase() || user?.name?.charAt(0)?.toUpperCase() || 'U'}
                      </Text>
                    </View>
                  )}

                  {isUploadingAvatar ? (
                    <View style={styles.avatarLoadingOverlay}>
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    </View>
                  ) : (
                    <View style={[styles.cameraBadge, { backgroundColor: colors.primary, borderColor: colors.cardSurface }]}>
                      <Svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                        <Path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                        <Circle cx="12" cy="13" r="4" />
                      </Svg>
                    </View>
                  )}
                </TouchableOpacity>

                <View style={styles.avatarActionsRow}>
                  <TouchableOpacity
                    style={[
                      styles.avatarActionPill,
                      {
                        backgroundColor: colors.cardSurface,
                        borderColor: colors.cardBorder,
                      },
                    ]}
                    onPress={handlePickAvatar}
                    disabled={isUploadingAvatar}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.avatarActionPillText, { color: colors.text }]}>
                      {user?.avatarUrl ? 'Change Photo' : 'Upload Photo'}
                    </Text>
                  </TouchableOpacity>

                  {Boolean(user?.avatarUrl) && (
                    <TouchableOpacity
                      style={[styles.avatarActionPill, styles.avatarRemovePill]}
                      onPress={() => setShowRemoveAvatarAlert(true)}
                      disabled={isUploadingAvatar}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.avatarActionPillText, styles.avatarRemoveText]}>
                        Remove
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Name Field */}
              <View style={styles.nameFieldSection}>
                <Text style={[styles.statsLabel, { color: colors.textMuted }]}>NAME</Text>
                <View
                  style={[
                    styles.nameInputContainer,
                    {
                      backgroundColor: colors.cardSurface,
                      borderColor: colors.cardBorder,
                    },
                  ]}
                >
                  <View style={styles.nameIconBox}>
                    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={colors.textMuted} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <Circle cx="12" cy="7" r="4" />
                    </Svg>
                  </View>
                  <TextInput
                    placeholder="Enter your name"
                    placeholderTextColor={colors.textDisabled}
                    value={nameInput}
                    onChangeText={setNameInput}
                    onBlur={handleSaveName}
                    onSubmitEditing={handleSaveName}
                    autoCapitalize="words"
                    returnKeyType="done"
                    style={[styles.nameInputText, { color: colors.text }]}
                    maxLength={32}
                  />
                  {nameInput.trim() !== (user?.name || '') && nameInput.trim().length > 0 && (
                    <TouchableOpacity
                      style={[styles.nameSavePill, { backgroundColor: colors.text }]}
                      onPress={handleSaveName}
                      disabled={isUpdatingName}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.nameSavePillText, { color: colors.background }]}>
                        {isUpdatingName ? '...' : 'Save'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>
          </AnimatedCard>

          {/* Physical Stats Section */}
          <AnimatedCard index={1} style={styles.sectionCard}>
            <View style={styles.statsCardRow}>
              {/* Gender selection */}
              <View style={styles.statsColLeft}>
                <Text style={[styles.statsLabel, { color: colors.textMuted }]}>GENDER</Text>
                <View
                  onLayout={(e: LayoutChangeEvent) => setContainerWidth(e.nativeEvent.layout.width)}
                  style={[styles.genderContainer, { backgroundColor: colors.cardSurface, borderColor: colors.cardBorder }]}
                >
                  {/* Bubble animation */}
                  {containerWidth > 0 && (
                    <Animated.View
                      style={[
                        styles.genderBubble,
                        { backgroundColor: colors.cardBorder, width: containerWidth / 2 },
                        animatedBubbleStyle,
                      ]}
                    />
                  )}
                  <TouchableOpacity
                    style={styles.genderPill}
                    onPress={() => handleGenderChange('male')}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.genderText, { color: gender === 'male' ? colors.text : colors.textMuted }]}>
                      Male
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.genderPill}
                    onPress={() => handleGenderChange('female')}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.genderText, { color: gender === 'female' ? colors.text : colors.textMuted }]}>
                      Female
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Vertical divider */}
              <View style={[styles.statsDivider, { backgroundColor: colors.cardBorder }]} />

              {/* Height selection */}
              <View style={styles.statsColRight}>
                <Text style={[styles.statsLabel, { color: colors.textMuted }]}>HEIGHT</Text>
                <View style={[styles.heightInputContainer, { backgroundColor: colors.cardSurface, borderColor: colors.cardBorder }]}>
                  <TextInput
                    keyboardType="numeric"
                    placeholder="--"
                    placeholderTextColor={colors.textDisabled}
                    value={heightInput}
                    onChangeText={handleHeightChangeText}
                    onBlur={handleHeightBlur}
                    style={[styles.heightInputText, { color: colors.text }]}
                    maxLength={3}
                  />
                  <Text style={[styles.heightUnitLabel, { color: colors.textMuted }]}>cm</Text>
                </View>
              </View>
            </View>
          </AnimatedCard>

          <AnimatedCard index={2} style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
                THEME
              </Text>
            </View>

            <View
              onLayout={(e: LayoutChangeEvent) => setThemeContainerWidth(e.nativeEvent.layout.width)}
              style={[styles.themeContainer, { backgroundColor: colors.cardSurface, borderColor: colors.cardBorder }]}
            >
              {themeContainerWidth > 0 && (
                <Animated.View
                  style={[
                    styles.themeBubble,
                    { backgroundColor: colors.cardBorder, width: themeContainerWidth / THEME_OPTIONS.length },
                    animatedThemeBubbleStyle,
                  ]}
                />
              )}
              {THEME_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.id}
                  style={styles.themePill}
                  onPress={() => handleThemeChange(opt.id)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.themeText,
                      { color: settingsStore.theme === opt.id ? colors.text : colors.textMuted },
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </AnimatedCard>

          {/* Help Improve FiTrack (Crash Reports) */}
          <AnimatedCard index={3} style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
                HELP IMPROVE FITRACK
              </Text>
            </View>

            <TouchableOpacity
              style={[
                styles.crashButton,
                {
                  backgroundColor: colors.cardSurface,
                  borderColor: colors.cardBorder,
                },
              ]}
              onPress={handleSendCrashReport}
              activeOpacity={0.7}
            >
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
              'The "Record Bug Reports" toggle controls local error logging. It is off by default — turn it on to help us fix issues.',
              'Tap "Send Crash Report" to manually send a report anytime.',
              'Your reports help us make FiTrack better for everyone.',
            ].map((step, index) => (
              <View key={index} style={styles.stepRow}>
                <View style={[styles.stepNumber, { backgroundColor: colors.cardSurface }]}>
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

          {/* Developer Options */}
          <AnimatedCard index={4} style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
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
                  false: colors.cardBorder,
                  true: colors.primary,
                }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View style={styles.settingRow}>
              <View style={styles.settingTextGroup}>
                <Text style={[styles.settingTitle, { color: colors.text }]}>
                  Restart Step Tracking on Boot
                </Text>
                <Text style={[styles.settingDesc, { color: colors.textSecondary }]}>
                  Automatically resume step counting after a device reboot when step
                  tracking was active.
                </Text>
              </View>
              <Switch
                value={settingsStore.restartOnBoot}
                onValueChange={(val) => settingsStore.setRestartOnBoot(val)}
                trackColor={{
                  false: colors.cardBorder,
                  true: colors.primary,
                }}
                thumbColor="#FFFFFF"
              />
            </View>

            {isXiaomi && (
              <View style={styles.settingRow}>
                <View style={styles.settingTextGroup}>
                  <Text style={[styles.settingTitle, { color: colors.text }]}>
                    Xiaomi / MIUI Background Tracking
                  </Text>
                  <Text style={[styles.settingDesc, { color: colors.textSecondary }]}>
                    Enable Autostart and set Battery Saver to "No restrictions" so MIUI does not kill step tracking when clearing recents.
                  </Text>
                </View>
                <TouchableOpacity
                  style={[
                    styles.logoutPill,
                    {
                      backgroundColor: colors.cardSurface,
                      borderColor: colors.cardBorder,
                    },
                  ]}
                  onPress={() => stepCounterService.openAutostartSettings()}
                >
                  <Text style={{ color: colors.primary, fontSize: 13, fontWeight: '600' }}>
                    Settings
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.settingRow}>
              <View style={styles.settingTextGroup}>
                <Text style={[styles.settingTitle, { color: colors.text }]}>
                  Erase All Data
                </Text>
                <Text style={[styles.settingDesc, { color: colors.textSecondary }]}>
                  Deletes your profile, workouts, weight logs, and step history from
                  this device, then restarts FiTrack from the welcome screen.
                </Text>
              </View>
              <TouchableOpacity
                style={[
                  styles.deleteAccountPill,
                  {
                    backgroundColor: 'rgba(255, 69, 58, 0.12)',
                    borderColor: 'rgba(255, 69, 58, 0.4)',
                  },
                ]}
                onPress={() => setShowResetAlert(true)}
                activeOpacity={0.7}
              >
                <Text style={[styles.deleteAccountText, { color: '#FF453A' }]}>Reset</Text>
              </TouchableOpacity>
            </View>
          </AnimatedCard>

          {/* App Updates Section */}
          <AnimatedCard index={5} style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
                APP UPDATES
              </Text>
            </View>

            <View style={styles.settingRow}>
              <View style={styles.settingTextGroup}>
                <Text style={[styles.settingTitle, { color: colors.text }]}>
                  Check for Updates
                </Text>
                <Text style={[styles.settingDesc, { color: colors.textSecondary }]}>
                  FiTrack v{CONFIG.APP_VERSION} is installed.
                </Text>
              </View>
              <TouchableOpacity
                style={[
                  styles.logoutPill,
                  {
                    backgroundColor: colors.cardSurface,
                    borderColor: colors.cardBorder,
                  },
                ]}
                onPress={async () => {
                  setIsCheckingUpdate(true);
                  // Force-check clears the in-memory "Later" so a deferred
                  // update is shown again when the user explicitly asks.
                  updateService.clearSessionDismissed();
                  try {
                    const info = await updateService.checkForUpdate(true);
                    if (info) {
                      setUpdateInfo(info);
                      setShowUpdateModal(true);
                    } else {
                      setShowUpToDateAlert(true);
                    }
                  } catch (err: any) {
                    setUpdateErrorMessage(err.message || 'Unable to connect to update server.');
                    setShowUpdateErrorAlert(true);
                  } finally {
                    setIsCheckingUpdate(false);
                  }
                }}
                disabled={isCheckingUpdate}
                activeOpacity={0.7}
              >
                <Text style={[styles.logoutText, { color: colors.text }]}>
                  {isCheckingUpdate ? 'Checking...' : 'Check'}
                </Text>
              </TouchableOpacity>
            </View>
          </AnimatedCard>

          {/* About Section */}
          <AnimatedCard index={6} style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
                ABOUT
              </Text>
            </View>

            <View style={[styles.legalRow, { borderBottomColor: colors.cardBorder }]}>
              <Text style={[styles.legalText, { color: colors.text }]}>Check old APKs</Text>
              <TouchableOpacity
                style={[
                  styles.logoutPill,
                  {
                    backgroundColor: colors.cardSurface,
                    borderColor: colors.cardBorder,
                  },
                ]}
                onPress={() => Linking.openURL(CONFIG.GITHUB_RELEASES_URL)}
                activeOpacity={0.7}
              >
                <Text style={[styles.logoutText, { color: colors.text }]}>View</Text>
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

      <CustomAlert
        visible={showResetAlert}
        onClose={() => setShowResetAlert(false)}
        title="Erase All Data"
        message="This permanently deletes your profile, workouts, weight logs, and step history from this device. This action cannot be undone."
        actions={[
          { text: 'Cancel', style: 'cancel', onPress: () => setShowResetAlert(false) },
          {
            text: isResetting ? 'Erasing...' : 'Erase',
            style: 'destructive',
            onPress: () => {
              setShowResetAlert(false);
              handleResetApp();
            },
          },
        ]}
      />

      <UpdateModal
        visible={showUpdateModal}
        updateInfo={updateInfo}
        onClose={() => setShowUpdateModal(false)}
      />

      <CustomAlert
        visible={showUpToDateAlert}
        onClose={() => setShowUpToDateAlert(false)}
        title="Up to Date"
        message={`FiTrack v${CONFIG.APP_VERSION} is currently the latest version.`}
        actions={[
          { text: 'OK', onPress: () => setShowUpToDateAlert(false) },
        ]}
      />

      <CustomAlert
        visible={showUpdateErrorAlert}
        onClose={() => setShowUpdateErrorAlert(false)}
        title="Update Check Failed"
        message={updateErrorMessage || 'Unable to connect to update server.'}
        actions={[
          { text: 'OK', onPress: () => setShowUpdateErrorAlert(false) },
        ]}
      />

      {/* Remove Avatar Confirmation */}
      <CustomAlert
        visible={showRemoveAvatarAlert}
        onClose={() => setShowRemoveAvatarAlert(false)}
        title="Remove Photo"
        message="Are you sure you want to remove your profile picture?"
        actions={[
          { text: 'Cancel', style: 'cancel', onPress: () => setShowRemoveAvatarAlert(false) },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: () => {
              setShowRemoveAvatarAlert(false);
              handleRemoveAvatar();
            },
          },
        ]}
      />

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
  sectionIcon: {
    fontSize: 16,
    opacity: 0.7,
  },
  sectionLabel: {
    fontSize: responsive.font(14),
    fontWeight: '500',
    letterSpacing: 0.8,
  },
  profileContent: {
    alignItems: 'center',
    width: '100%',
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  avatarButton: {
    width: 88,
    height: 88,
    borderRadius: 44,
    position: 'relative',
    borderWidth: 2,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 42,
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  avatarActionPill: {
    paddingVertical: responsive.sizeNoFont(spacing.xs),
    paddingHorizontal: responsive.sizeNoFont(spacing.md),
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  avatarActionPillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  avatarRemovePill: {
    backgroundColor: 'rgba(255, 69, 58, 0.12)',
    borderColor: 'rgba(255, 69, 58, 0.4)',
  },
  avatarRemoveText: {
    color: '#FF453A',
  },
  nameFieldSection: {
    width: '100%',
  },
  nameInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 42,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
  },
  nameIconBox: {
    marginRight: spacing.sm,
    marginLeft: spacing.xs,
  },
  nameInputText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    paddingVertical: 0,
  },
  nameSavePill: {
    paddingVertical: 4,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
  },
  nameSavePillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  logoutPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: responsive.sizeNoFont(spacing.xs),
    paddingHorizontal: responsive.sizeNoFont(spacing.md),
    borderRadius: radius.pill,
    borderWidth: 1,
    gap: spacing.xs,
  },
  deleteAccountPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: responsive.sizeNoFont(spacing.xs),
    paddingHorizontal: responsive.sizeNoFont(spacing.md),
    borderRadius: radius.pill,
    borderWidth: 1,
    gap: spacing.xs,
  },
  deleteAccountText: {
    fontSize: 12,
    fontWeight: '500',
  },
  legalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
  },
  legalText: {
    fontSize: responsive.font(14),
    fontWeight: '500',
  },
  logoutText: {
    fontSize: 12,
    fontWeight: '500',
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
    fontSize: responsive.font(14),
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
    fontSize: responsive.font(14),
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
    fontSize: responsive.font(14),
    fontWeight: '600',
  },
  stepText: {
    fontSize: responsive.font(14),
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
    fontSize: responsive.font(14),
  },
  providerGridItem: {
    width: '48.5%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    position: 'relative',
  },
  providerInfo: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  providerNameText: {
    fontSize: responsive.font(14),
    fontWeight: '600',
    textAlign: 'center',
  },
  providerDescText: {
    fontSize: 10,
    marginTop: 1,
    textAlign: 'center',
  },
  providerKeyText: {
    fontSize: 12,
    marginTop: 2,
    textAlign: 'center',
  },
  deleteKeyBtn: {
    position: 'absolute',
    right: 4,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    padding: 6,
    zIndex: 5,
  },
  modalDescText: {
    fontSize: responsive.font(13),
    lineHeight: 18,
  },
  modalProviderGridItem: {
    width: '48.5%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    marginBottom: spacing.xs,
    position: 'relative',
  },
  modalProviderText: {
    fontSize: responsive.font(13),
    fontWeight: '600',
    textAlign: 'center',
  },
  modalProviderDescText: {
    fontSize: 9,
    marginTop: 1,
    textAlign: 'center',
  },
  alreadyHasKeyText: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  whiteBackBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.base,
  },
  statsCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  statsColLeft: {
    flex: 1,
    paddingRight: spacing.md,
  },
  statsDivider: {
    width: 1,
    height: 44,
    alignSelf: 'center',
  },
  statsColRight: {
    flex: 1,
    paddingLeft: spacing.md,
  },
  statsLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: spacing.xs,
  },
  genderContainer: {
    flexDirection: 'row',
    width: '100%',
    height: 38,
    borderRadius: radius.md,
    borderWidth: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  genderBubble: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: radius.md - 1,
  },
  genderPill: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  genderText: {
    fontSize: 13,
    fontWeight: '600',
  },
  themeContainer: {
    flexDirection: 'row',
    width: '100%',
    height: 38,
    borderRadius: radius.md,
    borderWidth: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  themeBubble: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: radius.md - 1,
  },
  themePill: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  themeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  heightInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: 38,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    gap: spacing.xs,
  },
  heightInputText: {
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
    padding: 0,
    minWidth: 36,
  },
  heightUnitLabel: {
    fontSize: responsive.font(13),
    fontWeight: '600',
  },
  reauthErrorText: {
    fontSize: responsive.font(13),
    marginTop: spacing.sm,
  },
});
