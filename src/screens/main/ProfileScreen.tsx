import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Logo } from '../../components/common/Logo';
import { useAuth, useColors, useSettingsStore } from '../../hooks';
import { spacing, typography, radius } from '../../theme';

export const ProfileScreen = () => {
  const colors = useColors();
  const { user, logout } = useAuth();
  const settingsStore = useSettingsStore();

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: () => logout(),
        },
      ],
    );
  };

  interface SettingsItem {
    label: string;
    value: string;
    type?: 'toggle';
    toggleValue?: boolean;
    onToggle?: (val: boolean) => void;
    onPress?: () => void;
  }

  const settingsSections: Array<{ title: string; items: SettingsItem[] }> = [
    {
      title: 'UNITS',
      items: [
        {
          label: 'Weight Unit',
          value: settingsStore.units.weight.toUpperCase(),
          onPress: () => {
            const newUnit = settingsStore.units.weight === 'kg' ? 'lbs' : 'kg';
            settingsStore.setWeightUnit(newUnit);
          },
        },
        {
          label: 'Height Unit',
          value: settingsStore.units.height.toUpperCase(),
          onPress: () => {
            const newUnit = settingsStore.units.height === 'cm' ? 'ft' : 'cm';
            settingsStore.setHeightUnit(newUnit);
          },
        },
      ],
    },
    {
      title: 'WORKOUT',
      items: [
        {
          label: 'Default Rest Time',
          value: `${settingsStore.workout.defaultRestTime}s`,
          onPress: () => {},
        },
        {
          label: 'Auto-start Rest Timer',
          value: '',
          type: 'toggle',
          toggleValue: settingsStore.workout.autoStartRestTimer,
          onToggle: (val: boolean) => settingsStore.setAutoStartRestTimer(val),
        },
        {
          label: 'Keep Screen Awake',
          value: '',
          type: 'toggle',
          toggleValue: settingsStore.workout.keepScreenAwake,
          onToggle: (val: boolean) => settingsStore.setKeepScreenAwake(val),
        },
      ],
    },
    {
      title: 'DEVELOPER OPTIONS',
      items: [
        {
          label: 'Record Bug Reports',
          value: '',
          type: 'toggle',
          toggleValue: settingsStore.recordBugReports,
          onToggle: (val: boolean) => settingsStore.setRecordBugReports(val),
        },
        {
          label: 'View Logged Reports',
          value: '',
          onPress: () => {},
        },
      ],
    },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Logo size="medium" />
        </View>

        <Text style={[styles.pageTitle, { color: colors.text }]}>Settings</Text>

        <Card style={styles.profileCard} padding="xl">
          <View style={[styles.avatar, { backgroundColor: colors.surface }]}>
            <Text style={styles.avatarText}>
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </Text>
          </View>
          <Text style={[styles.userName, { color: colors.text }]}>
            {user?.name || 'User'}
          </Text>
          <Text style={[styles.userEmail, { color: colors.textMuted }]}>
            {user?.email || 'user@example.com'}
          </Text>
          <Button
            title="Logout"
            onPress={handleLogout}
            variant="ghost"
            size="small"
            style={styles.logoutButton}
          />
        </Card>

        {settingsSections.map((section, sectionIndex) => (
          <View key={sectionIndex} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
              {section.title}
            </Text>
            <Card padding="none">
              {section.items.map((item, itemIndex) => (
                <TouchableOpacity
                  key={itemIndex}
                  style={[
                    styles.settingsItem,
                    itemIndex < section.items.length - 1 && {
                      borderBottomWidth: 1,
                      borderBottomColor: colors.cardBorder,
                    },
                  ]}
                  onPress={item.type !== 'toggle' ? item.onPress : undefined}
                  disabled={item.type === 'toggle'}
                >
                  <Text style={[styles.itemLabel, { color: colors.text }]}>
                    {item.label}
                  </Text>
                  {item.type === 'toggle' ? (
                    <Switch
                      value={item.toggleValue}
                      onValueChange={item.onToggle}
                      trackColor={{ false: colors.cardBorder, true: colors.primary }}
                      thumbColor="#FFFFFF"
                    />
                  ) : (
                    <View style={styles.itemRight}>
                      <Text style={[styles.itemValue, { color: colors.textMuted }]}>
                        {item.value}
                      </Text>
                      <Text style={[styles.chevron, { color: colors.textMuted }]}>
                        ›
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </Card>
          </View>
        ))}

        <Card style={styles.helpCard} padding="xl">
          <Text style={[styles.helpTitle, { color: colors.text }]}>
            Help Improve FiTrack
          </Text>
          <Text style={[styles.helpText, { color: colors.textSecondary }]}>
            If FiTrack crashes or experiences an issue, tap the button below to send us a crash report.
          </Text>
          <Button
            title="Send Crash Report"
            onPress={() => Alert.alert('Thanks!', 'Crash report feature coming soon.')}
            variant="secondary"
            fullWidth
            style={styles.crashButton}
          />
        </Card>

        <View style={styles.footer}>
          <Text style={[styles.version, { color: colors.textMuted }]}>
            FiTrack v1.0.0
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.base,
  },
  pageTitle: {
    fontSize: typography.h2.fontSize,
    fontWeight: '700',
    marginBottom: spacing.xl,
  },
  profileCard: {
    alignItems: 'center',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.base,
  },
  avatarText: {
    fontSize: 40,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  userName: {
    fontSize: typography.h4.fontSize,
    fontWeight: '700',
  },
  userEmail: {
    fontSize: typography.body.fontSize,
    marginTop: spacing.xxs,
  },
  logoutButton: {
    marginTop: spacing.base,
  },
  section: {
    marginTop: spacing.xl,
  },
  sectionTitle: {
    fontSize: typography.sectionLabel.fontSize,
    fontWeight: typography.sectionLabel.fontWeight,
    letterSpacing: typography.sectionLabel.letterSpacing,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.base,
    paddingHorizontal: spacing.base,
  },
  itemLabel: {
    fontSize: typography.body.fontSize,
    fontWeight: '500',
  },
  itemRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemValue: {
    fontSize: typography.body.fontSize,
  },
  chevron: {
    fontSize: 20,
    marginLeft: spacing.sm,
  },
  helpCard: {
    marginTop: spacing.xl,
  },
  helpTitle: {
    fontSize: typography.h4.fontSize,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  helpText: {
    fontSize: typography.body.fontSize,
    lineHeight: 22,
    marginBottom: spacing.base,
  },
  crashButton: {
    marginTop: spacing.sm,
  },
  footer: {
    alignItems: 'center',
    marginTop: spacing.xxxl,
    paddingBottom: spacing.xl,
  },
  version: {
    fontSize: typography.caption.fontSize,
  },
});