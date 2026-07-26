import React, { useState, useEffect } from 'react';
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
  TextInput,
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
import { spacing, typography, radius } from '../../theme';
import { errorLogs, logger } from '../../utils/logger';
import { CONFIG } from '../../config/constants';
import { crashReportsService } from '../../services/firebase/crashReports';
import { aiService, AIProvider, SavedKey } from '../../services/ai/aiService';
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

  const slideOffset = useSharedValue(initialGender === 'male' ? 0 : 70);

  useEffect(() => {
    // Sync shared value when gender changes
    slideOffset.value = gender === 'male' ? 0 : 70;
  }, [gender]);

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
      await Linking.openURL(emailUrl);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to open email app');
    }
  };

  const handleSaveApiKey = () => {
    if (!selectedProvider) return;
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
      cohere: 'Cohere',
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

          {/* Physical Stats Section */}
          <AnimatedCard index={1} style={styles.sectionCard}>
            <View style={styles.statsCardRow}>
              {/* Gender selection */}
              <View style={styles.statsCol}>
                <Text style={[styles.statsLabel, { color: colors.textMuted }]}>GENDER</Text>
                <View style={[styles.genderContainer, { backgroundColor: 'rgba(255,255,255,0.06)', borderColor: colors.cardBorder }]}>
                  {/* Bubble animation */}
                  <Animated.View style={[styles.genderBubble, { backgroundColor: 'rgba(255, 255, 255, 0.15)' }, animatedBubbleStyle]} />
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

              {/* Height selection */}
              <View style={[styles.statsCol, { borderLeftWidth: 1, borderLeftColor: colors.cardBorder, paddingLeft: spacing.lg }]}>
                <Text style={[styles.statsLabel, { color: colors.textMuted }]}>HEIGHT</Text>
                <View style={styles.heightInputContainer}>
                  <TextInput
                    keyboardType="numeric"
                    placeholder="--"
                    placeholderTextColor={colors.textDisabled}
                    value={heightInput}
                    onChangeText={handleHeightChangeText}
                    onBlur={handleHeightBlur}
                    style={[styles.heightInputText, { color: colors.text, borderBottomColor: colors.cardBorder }]}
                  />
                  <Text style={[styles.heightUnitLabel, { color: colors.textSecondary }]}>cm</Text>
                </View>
              </View>
            </View>
          </AnimatedCard>

          {/* AI Configuration */}
          <AnimatedCard index={2} style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
                AI CONFIGURATION
              </Text>
            </View>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.base }}>
              {([
                { id: 'gemini', label: 'Google Gemini' },
                { id: 'groq', label: 'Groq' },
                { id: 'openrouter', label: 'OpenRouter' },
                { id: 'openai', label: 'OpenAI' },
                { id: 'anthropic', label: 'Anthropic' },
                { id: 'deepseek', label: 'DeepSeek' },
                { id: 'cohere', label: 'Cohere' }
              ] as const).map((prov) => {
                const savedKeyObj = savedKeys.find(k => k.provider === prov.id);
                return (
                  <View key={prov.id} style={[styles.providerGridItem, { backgroundColor: 'rgba(255,255,255,0.03)', borderColor: colors.cardBorder }]}>
                    <View style={styles.providerInfo}>
                      <Text style={[styles.providerNameText, { color: colors.text }]} numberOfLines={1}>
                        {prov.label}
                      </Text>
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
                    backgroundColor: 'rgba(255,255,255,0.06)',
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
                <Text style={styles.crashIcon}>+ </Text>
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
          <AnimatedCard index={3} style={styles.sectionCard}>
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

          {/* Developer Options */}
          <AnimatedCard index={4} style={styles.sectionCard}>
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

          {/* App Updates Section */}
          <AnimatedCard index={5} style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionIcon}>🔄</Text>
              <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
                APP UPDATES
              </Text>
            </View>

            <View style={styles.settingRow}>
              <View style={styles.settingTextGroup}>
                <Text style={[styles.settingTitle, { color: colors.text }]}>
                  Check for Updates
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
                { id: 'gemini', label: 'Google Gemini' },
                { id: 'groq', label: 'Groq' },
                { id: 'openrouter', label: 'OpenRouter' },
                { id: 'openai', label: 'OpenAI' },
                { id: 'anthropic', label: 'Anthropic' },
                { id: 'deepseek', label: 'DeepSeek' },
                { id: 'cohere', label: 'Cohere' }
              ] as const).map((prov) => {
                const alreadyHasKey = savedKeys.some(k => k.provider === prov.id);
                return (
                  <TouchableOpacity
                    key={prov.id}
                    disabled={alreadyHasKey}
                    style={[
                      styles.modalProviderGridItem,
                      {
                        borderColor: colors.cardBorder,
                        backgroundColor: 'rgba(255,255,255,0.03)',
                        opacity: alreadyHasKey ? 0.4 : 1
                      }
                    ]}
                    onPress={() => {
                      setSelectedProvider(prov.id);
                      setAiModalStep(2);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={{ flex: 1, marginRight: 4 }}>
                      <Text style={[styles.modalProviderText, { color: colors.text }]} numberOfLines={1}>
                        {prov.label}
                      </Text>
                      {alreadyHasKey && (
                        <Text style={[styles.alreadyHasKeyText, { color: colors.textMuted, fontSize: 10, marginTop: 2 }]}>
                          Added
                        </Text>
                      )}
                    </View>
                    {!alreadyHasKey && (
                      <Text style={[styles.chevron, { color: colors.textMuted }]}>›</Text>
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
              style={styles.whiteBackBtn}
              activeOpacity={0.7}
            >
              <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
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
  providerGridItem: {
    width: '48.5%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  providerInfo: {
    flex: 1,
  },
  providerNameText: {
    fontSize: 14,
    fontWeight: '600',
  },
  providerKeyText: {
    fontSize: 12,
    marginTop: 2,
  },
  deleteKeyBtn: {
    padding: 8,
  },
  modalDescText: {
    fontSize: 13,
    lineHeight: 18,
  },
  modalProviderGridItem: {
    width: '48.5%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    marginBottom: spacing.xs,
  },
  modalProviderText: {
    fontSize: 13,
    fontWeight: '600',
  },
  alreadyHasKeyText: {
    fontSize: 12,
    fontWeight: '500',
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
    justifyContent: 'space-between',
  },
  statsCol: {
    flex: 1,
  },
  statsLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  genderContainer: {
    flexDirection: 'row',
    width: 140,
    height: 32,
    borderRadius: radius.sm,
    borderWidth: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  genderBubble: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 70,
  },
  genderPill: {
    width: 70,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  genderText: {
    fontSize: 13,
    fontWeight: '600',
  },
  heightInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  heightInputText: {
    width: 60,
    height: 32,
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    borderBottomWidth: 1,
    padding: 0,
  },
  heightUnitLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
});
