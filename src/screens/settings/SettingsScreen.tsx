import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Image,
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
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Modal } from '../../components/common/Modal';
import { CustomAlert } from '../../components/common/CustomAlert';
import { Logo } from '../../components/common/Logo';
import { observer } from 'mobx-react-lite';
import { useAuth, useColors, useSettingsStore } from '../../hooks';
import type { ThemeId } from '../../stores/SettingsStore';
import { spacing, radius, responsive } from '../../theme';
import { getErrorLogs, logger } from '../../utils/logger';
import { CONFIG } from '../../config/constants';
import { crashReportsService } from '../../services/firebase/crashReports';
import { aiService, AIProvider, SavedKey } from '../../services/ai/aiService';
import { firebaseAuthService } from '../../services/firebase/auth';
import { storage } from '../../utils/storage';
import { updateService, type UpdateInfo } from '../../services/update/updateService';
import { UpdateModal } from '../../components/common/UpdateModal';

const THEME_OPTIONS: { id: ThemeId; label: string }[] = [
  { id: 'dark', label: 'Dark' },
  { id: 'amoled', label: 'AMOLED' },
  { id: 'light', label: 'Light' },
];

export const SettingsScreen = observer(() => {
  const colors = useColors();
  const navigation = useNavigation();
  const { user, logout, deleteAccount, updateProfile } = useAuth();
  const settingsStore = useSettingsStore();
  const [showLogoutAlert, setShowLogoutAlert] = useState(false);
  const [showDeleteAccountAlert, setShowDeleteAccountAlert] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deleteErrorMessage, setDeleteErrorMessage] = useState('');
  const [showDeleteErrorAlert, setShowDeleteErrorAlert] = useState(false);
  const [showReauthModal, setShowReauthModal] = useState(false);
  const [reauthPassword, setReauthPassword] = useState('');
  const [reauthError, setReauthError] = useState('');
  const [showEditNameModal, setShowEditNameModal] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [isUpdatingName, setIsUpdatingName] = useState(false);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showUpToDateAlert, setShowUpToDateAlert] = useState(false);
  const [updateErrorMessage, setUpdateErrorMessage] = useState('');
  const [showUpdateErrorAlert, setShowUpdateErrorAlert] = useState(false);

  // AI Key configuration state
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiModalStep, setAiModalStep] = useState<1 | 2>(1);
  const [selectedProvider, setSelectedProvider] = useState<AIProvider | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [savedKeys, setSavedKeys] = useState<SavedKey[]>(() => aiService.getSavedKeys());
  const [deleteTargetProvider, setDeleteTargetProvider] = useState<AIProvider | null>(null);

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

  const avatarSource = useMemo(
    () => (user?.avatarUrl ? { uri: user.avatarUrl } : null),
    [user?.avatarUrl]
  );

  const handleLogout = () => {
    setShowLogoutAlert(true);
  };

  const handleDeleteAccount = async () => {
    setIsDeletingAccount(true);
    try {
      await deleteAccount();
    } catch (e: any) {
      logger.error('[SettingsScreen] Failed to delete account:', e);
      const msg = e?.message || 'Failed to delete account. Please try again.';
      const needsReauth =
        e?.code === 'auth/requires-recent-login' ||
        msg.toLowerCase().includes('log out and log back in') ||
        msg.toLowerCase().includes('recent authentication');
      if (needsReauth) {
        setReauthError('');
        setReauthPassword('');
        setShowReauthModal(true);
      } else {
        setDeleteErrorMessage(msg);
        setShowDeleteErrorAlert(true);
      }
    } finally {
      setIsDeletingAccount(false);
    }
  };

  const handleReauthAndDelete = async () => {
    if (!user?.email || !reauthPassword) {
      setReauthError('Please enter your password to confirm.');
      return;
    }
    setIsDeletingAccount(true);
    setReauthError('');
    try {
      await firebaseAuthService.reauthenticate(user.email, reauthPassword);
      // Store the credential so the actual delete call can re-use it without re-asking.
      storage.set(`auth_credentials_${user.id}`, { email: user.email, password: reauthPassword });
      setShowReauthModal(false);
      setReauthPassword('');
      await handleDeleteAccount();
    } catch (e: any) {
      logger.error('[SettingsScreen] Reauth failed:', e);
      setReauthError(e?.message || 'Incorrect password. Please try again.');
    } finally {
      setIsDeletingAccount(false);
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

    crashReportsService.submit(payload);

    const subject = `FiTrack Crash Report - v${payload.app.version}`;
    const emailUrl = `mailto:ayushsaha184@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(crashReport)}`;

    try {
      await Linking.openURL(emailUrl);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to open email app');
    }
  };

  const handleSaveApiKey = () => {
    if (!selectedProvider) {
      return;
    }
    if (!apiKeyInput.trim()) {
      Alert.alert('Error', 'Please enter a valid API key');
      return;
    }
    aiService.addKey(selectedProvider, apiKeyInput.trim());
    setSavedKeys(aiService.getSavedKeys());

    // Reset states and close
    setApiKeyInput('');
    setSelectedProvider(null);
    setAiModalStep(1);
    setShowAiModal(false);
  };

  const handleDeleteApiKey = (provider: AIProvider) => {
    setDeleteTargetProvider(provider);
  };

  const getProviderLabel = (provider: AIProvider): string => {
    const labels: Record<AIProvider, string> = {
      gemini: 'Google Gemini',
      groq: 'Groq',
      openrouter: 'OpenRouter',
      openai: 'OpenAI',
      anthropic: 'Anthropic',
      deepseek: 'DeepSeek',
    };
    return labels[provider] || provider;
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
          <AnimatedCard index={0} style={styles.profileCard}>
            <View style={styles.profileHeader}>
              <View style={styles.profileLabelRow}>
                <Text style={styles.sectionIcon}>👤</Text>
                <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
                  PROFILE
                </Text>
              </View>
              <View style={styles.profileHeaderActions}>
                <TouchableOpacity
                  style={[
                    styles.logoutPill,
                    {
                      backgroundColor: colors.cardSurface,
                      borderColor: colors.cardBorder,
                    },
                  ]}
                  onPress={handleLogout}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.logoutText, { color: colors.text }]}>Logout</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.deleteAccountPill,
                    {
                      backgroundColor: 'rgba(255, 69, 58, 0.12)',
                      borderColor: 'rgba(255, 69, 58, 0.4)',
                    },
                  ]}
                  onPress={() => setShowDeleteAccountAlert(true)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.deleteAccountText, { color: '#FF453A' }]}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.profileInfo}>
              {/* Profile Picture - show image if avatarUrl exists, otherwise initial */}
              {avatarSource ? (
                <Image
                  source={avatarSource}
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
              style={[
                styles.editNamePill,
                {
                  backgroundColor: colors.cardSurface,
                  borderColor: colors.cardBorder,
                },
              ]}
              onPress={() => {
                setNameInput(user?.name || '');
                setShowEditNameModal(true);
              }}
              activeOpacity={0.7}
            >
              <Text style={[styles.editNamePillText, { color: colors.text }]}>
                Edit Name
              </Text>
            </TouchableOpacity>
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

          {/* AI Configuration */}
          <AnimatedCard index={3} style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
                AI CONFIGURATION
              </Text>
            </View>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.base }}>
              {([
                { id: 'gemini', label: 'Gemini' },
                { id: 'groq', label: 'Groq' },
                { id: 'openrouter', label: 'OpenRouter' },
                { id: 'openai', label: 'OpenAI' },
                { id: 'anthropic', label: 'Anthropic' },
                { id: 'deepseek', label: 'DeepSeek' }
              ] as { id: AIProvider; label: string; description?: string }[]).map((prov) => {
                const savedKeyObj = savedKeys.find(k => k.provider === prov.id);
                return (
                  <View key={prov.id} style={[styles.providerGridItem, { backgroundColor: colors.cardSurface, borderColor: colors.cardBorder }]}>
                    <View style={styles.providerInfo}>
                      <Text style={[styles.providerNameText, { color: colors.text }]} numberOfLines={1}>
                        {prov.label}
                      </Text>
                      {prov.description ? (
                        <Text style={[styles.providerDescText, { color: colors.textMuted }]} numberOfLines={1}>
                          {prov.description}
                        </Text>
                      ) : null}
                      {savedKeyObj ? (
                        <Text style={[styles.providerKeyText, { color: colors.textMuted }]}>
                          ************
                        </Text>
                      ) : (
                        <Text style={[styles.providerKeyText, { color: colors.textDisabled, fontStyle: 'italic' }]}>
                          No key
                        </Text>
                      )}
                    </View>
                    {savedKeyObj && (
                      <TouchableOpacity
                        onPress={() => handleDeleteApiKey(prov.id)}
                        style={styles.deleteKeyBtn}
                        activeOpacity={0.7}
                      >
                        <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={colors.error} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                          <Polyline points="3 6 5 6 21 6" />
                          <Path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </Svg>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}
            </View>

            {savedKeys.length < 3 ? (
              <TouchableOpacity
                style={[
                  styles.crashButton,
                  {
                    backgroundColor: colors.cardSurface,
                    borderColor: colors.cardBorder,
                  },
                ]}
                onPress={() => {
                  setAiModalStep(1);
                  setSelectedProvider(null);
                  setApiKeyInput('');
                  setShowAiModal(true);
                }}
                activeOpacity={0.7}
              >
                <Text style={[styles.crashIcon, { color: colors.text }]}>+ </Text>
                <Text style={[styles.crashButtonText, { color: colors.text }]}>
                  Add API Key
                </Text>
              </TouchableOpacity>
            ) : (
              <Text style={[styles.helpText, { color: colors.textMuted, fontStyle: 'italic', textAlign: 'center', marginBottom: 0 }]}>
                Maximum limit of 3 keys reached.
              </Text>
            )}
          </AnimatedCard>

          {/* Help Improve FiTrack (Crash Reports) */}
          <AnimatedCard index={4} style={styles.sectionCard}>
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
          <AnimatedCard index={5} style={styles.sectionCard}>
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
          </AnimatedCard>

          {/* App Updates Section */}
          <AnimatedCard index={6} style={styles.sectionCard}>
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
          <AnimatedCard index={7} style={styles.sectionCard}>
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

      <CustomAlert
        visible={showDeleteAccountAlert}
        onClose={() => setShowDeleteAccountAlert(false)}
        title="Delete Account"
        message="Are you sure you want to permanently delete your account? All your workouts, weight logs, step history, and profile data will be permanently removed. This action cannot be undone."
        actions={[
          { text: 'Cancel', style: 'cancel', onPress: () => setShowDeleteAccountAlert(false) },
          {
            text: isDeletingAccount ? 'Deleting...' : 'Delete',
            style: 'destructive',
            onPress: () => {
              setShowDeleteAccountAlert(false);
              handleDeleteAccount();
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

      <CustomAlert
        visible={showDeleteErrorAlert}
        onClose={() => setShowDeleteErrorAlert(false)}
        title="Deletion Failed"
        message={deleteErrorMessage || 'Failed to delete account. Please try again.'}
        actions={[
          { text: 'OK', onPress: () => setShowDeleteErrorAlert(false) },
        ]}
      />

      {/* Re-auth Modal: shown when Firebase requires a recent login for deletion. */}
      <Modal
        visible={showReauthModal}
        onClose={() => {
          if (!isDeletingAccount) {
            setShowReauthModal(false);
            setReauthPassword('');
            setReauthError('');
          }
        }}
        title="Confirm Your Password"
      >
        <Text style={[styles.modalDescText, { color: colors.textSecondary, marginBottom: spacing.base }]}>
          For security, please re-enter your password to permanently delete your FiTrack account and all associated data.
        </Text>
        <Input
          label="Password"
          value={reauthPassword}
          onChangeText={setReauthPassword}
          placeholder="Your password"
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
        />
        {reauthError ? (
          <Text style={[styles.reauthErrorText, { color: '#FF453A' }]}>{reauthError}</Text>
        ) : null}
        <Button
          title={isDeletingAccount ? 'Verifying...' : 'Verify and Delete'}
          disabled={isDeletingAccount}
          onPress={handleReauthAndDelete}
          fullWidth
          style={{ marginTop: spacing.base, backgroundColor: '#FF453A' }}
        />
        <Button
          title="Cancel"
          variant="secondary"
          disabled={isDeletingAccount}
          onPress={() => {
            setShowReauthModal(false);
            setReauthPassword('');
            setReauthError('');
          }}
          fullWidth
          style={{ marginTop: spacing.sm }}
        />
      </Modal>

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
            <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={colors.textMuted} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
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
          style={{ marginTop: spacing.base, backgroundColor: colors.text }}
          textStyle={{ color: colors.background }}
        />
      </Modal>

      {/* AI Key Manager Modal */}
      <Modal
        visible={showAiModal}
        onClose={() => {
          setShowAiModal(false);
          setAiModalStep(1);
          setSelectedProvider(null);
          setApiKeyInput('');
        }}
        title={aiModalStep === 1 ? 'Select AI Provider' : `Add ${getProviderLabel(selectedProvider!)} Key`}
      >
        {aiModalStep === 1 ? (
          <View>
            <Text style={[styles.modalDescText, { color: colors.textSecondary, marginBottom: spacing.base }]}>
              Choose a provider to add your API key. You can store up to 3 keys.
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
              {([
                { id: 'gemini', label: 'Gemini' },
                { id: 'groq', label: 'Groq' },
                { id: 'openrouter', label: 'OpenRouter' },
                { id: 'openai', label: 'OpenAI' },
                { id: 'anthropic', label: 'Anthropic' },
                { id: 'deepseek', label: 'DeepSeek' }
              ] as { id: AIProvider; label: string; description?: string }[]).map((prov) => {
                const alreadyHasKey = savedKeys.some(k => k.provider === prov.id);
                return (
                  <TouchableOpacity
                    key={prov.id}
                    disabled={alreadyHasKey}
                    style={[
                      styles.modalProviderGridItem,
                      {
                        borderColor: colors.cardBorder,
                        backgroundColor: colors.cardSurface,
                        opacity: alreadyHasKey ? 0.4 : 1
                      }
                    ]}
                    onPress={() => {
                      setSelectedProvider(prov.id);
                      setAiModalStep(2);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingRight: 20 }}>
                      <Text style={[styles.modalProviderText, { color: colors.text }]} numberOfLines={1}>
                        {prov.label}
                      </Text>
                      {prov.description ? (
                        <Text style={[styles.modalProviderDescText, { color: colors.textMuted }]} numberOfLines={1}>
                          {prov.description}
                        </Text>
                      ) : null}
                      {alreadyHasKey && (
                        <Text style={[styles.alreadyHasKeyText, { color: colors.textMuted, fontSize: 10, marginTop: 2 }]}>
                          Added
                        </Text>
                      )}
                    </View>
                    {!alreadyHasKey && (
                      <Text style={[styles.chevron, { color: colors.textMuted, position: 'absolute', right: 8 }]}>›</Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ) : (
          <View>
            {/* Back action */}
            <TouchableOpacity
              onPress={() => {
                setAiModalStep(1);
                setSelectedProvider(null);
                setApiKeyInput('');
              }}
              style={[styles.whiteBackBtn, { backgroundColor: colors.cardSurface, borderRadius: 16 }]}
              activeOpacity={0.7}
            >
              <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={colors.text} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <Line x1="19" y1="12" x2="5" y2="12" />
                <Polyline points="12 19 5 12 12 5" />
              </Svg>
            </TouchableOpacity>

            <Text style={[styles.modalDescText, { color: colors.textSecondary, marginBottom: spacing.md }]}>
              Enter your API key below. The key is encrypted and stored locally on your device.
            </Text>

            <Input
              placeholder="Paste your API key here"
              value={apiKeyInput}
              onChangeText={setApiKeyInput}
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
            />

            <View style={{ marginTop: spacing.md }}>
              <Button
                title="Save Key"
                onPress={handleSaveApiKey}
                variant="primary"
              />
            </View>
          </View>
        )}
      </Modal>

      {/* Delete Key Confirmation CustomAlert */}
      <CustomAlert
        visible={deleteTargetProvider !== null}
        onClose={() => setDeleteTargetProvider(null)}
        title="Remove Key"
        message={deleteTargetProvider ? `Are you sure you want to remove the key for ${getProviderLabel(deleteTargetProvider)}?` : ''}
        actions={[
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => setDeleteTargetProvider(null),
          },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: () => {
              if (deleteTargetProvider) {
                aiService.deleteKey(deleteTargetProvider);
                setSavedKeys(aiService.getSavedKeys());
                setDeleteTargetProvider(null);
              }
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
    fontSize: responsive.font(14),
    fontWeight: '500',
    letterSpacing: 0.8,
  },
  profileHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
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
  editNamePill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    alignSelf: 'flex-start',
    paddingVertical: responsive.sizeNoFont(spacing.xs),
    paddingHorizontal: responsive.sizeNoFont(spacing.sm),
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  editNamePillText: {
    fontSize: responsive.font(14),
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
  logoutIcon: {
    fontSize: 12,
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
