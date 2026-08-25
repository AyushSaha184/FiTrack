import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { observer } from 'mobx-react-lite';
import Svg, { Path, Line, Polyline } from 'react-native-svg';
import { useColors, useSpacing, useTypography, useAuth } from '../../hooks';
import { responsive } from '../../theme';
import type { AIReportResult } from '../../services/ai/aiService';
import { aiContentReportsService } from '../../services/ai/aiContentReportsService';
import { CustomAlert } from '../../components/common/CustomAlert';
import { CONFIG } from '../../config/constants';
import { logger } from '../../utils/logger';

type AIReportScreenRouteProp = RouteProp<
  {
    AIReport: {
      report: AIReportResult;
    };
  },
  'AIReport'
>;

const REPORT_CATEGORIES = [
  { id: 'inaccurate', label: 'Inaccurate fitness advice' },
  { id: 'harmful', label: 'Potentially harmful or unsafe' },
  { id: 'inappropriate', label: 'Inappropriate or offensive' },
  { id: 'unhelpful', label: 'Low quality / not useful' },
  { id: 'other', label: 'Other' },
] as const;

export const AIReportScreen = observer(() => {
  const colors = useColors();
  const spacing = useSpacing();
  const typography = useTypography();
  const navigation = useNavigation();
  const route = useRoute<AIReportScreenRouteProp>();
  const { user } = useAuth();
  const { report } = route.params;

  const [showReportConfirm, setShowReportConfirm] = useState(false);
  const [showReportSuccess, setShowReportSuccess] = useState(false);
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<typeof REPORT_CATEGORIES[number]['id'] | null>(null);

  const submitReportToBackend = async (category: typeof REPORT_CATEGORIES[number]['id']) => {
    try {
      await aiContentReportsService.submit({
        userId: user?.id || null,
        userEmail: user?.email || null,
        category,
        provider: report.provider || null,
        model: report.model || null,
        coachNotes: report.coachNotes || [],
        exerciseRecap: report.exerciseRecap || [],
        appVersion: CONFIG.APP_VERSION,
        platform: Platform.OS,
      });
    } catch (e: any) {
      logger.error('[AIReportScreen] Failed to record AI content report:', e);
    }
  };

  const handleSendReport = async () => {
    setShowReportConfirm(false);
    if (!selectedCategory) {
      setShowCategoryPicker(true);
      return;
    }
    setIsSubmittingReport(true);
    await submitReportToBackend(selectedCategory);
    setIsSubmittingReport(false);
    setShowReportSuccess(true);

    const subject = encodeURIComponent('FiTrack AI Coach Report - Inappropriate or Inaccurate Content');
    const body = encodeURIComponent(
      `I would like to report inappropriate or inaccurate AI content.\n\nCategory: ${selectedCategory}\n\nCoach Notes:\n${report.coachNotes?.join('\n') || ''}\n\nExercise Recap:\n${report.exerciseRecap?.join('\n') || ''}\n\nAdditional feedback:`
    );
    const mailtoUrl = `mailto:${CONFIG.SUPPORT_EMAIL}?subject=${subject}&body=${body}`;
    try {
      await Linking.openURL(mailtoUrl);
    } catch {
      // Email app unavailable; backend record is enough.
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header bar */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Weekly AI Report</Text>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[styles.backButton, { backgroundColor: 'rgba(255,255,255,0.06)' }]}
          activeOpacity={0.7}
        >
          <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
            <Line x1="19" y1="12" x2="5" y2="12" />
            <Polyline points="12 19 5 12 12 5" />
          </Svg>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Option A: Coach's Notes */}
        {report.coachNotes && report.coachNotes.length > 0 && (
          <View
            style={[
              styles.sectionCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.cardBorder,
                paddingVertical: 16,
              },
            ]}
          >
            <View style={styles.notesList}>
              {report.coachNotes.map((note, index) => (
                <View key={index} style={styles.noteRow}>
                  <Text style={[styles.bulletPoint, { color: colors.primary }]}>•</Text>
                  <Text style={[styles.noteText, { color: colors.textSecondary }]}>{note}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Option B: Exercise Recap (Single Card) */}
        {report.exerciseRecap && report.exerciseRecap.length > 0 && (
          <View
            style={[
              styles.sectionCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.cardBorder,
                paddingVertical: 16,
                marginTop: 16,
              },
            ]}
          >
            <View style={styles.notesList}>
              {report.exerciseRecap.map((recap, index) => (
                <View key={index} style={styles.noteRow}>
                  <Text style={[styles.bulletPoint, { color: colors.primary }]}>•</Text>
                  <Text style={[styles.noteText, { color: colors.textSecondary }]}>{recap}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Report AI Output Option */}
        <TouchableOpacity
          style={styles.flagButton}
          onPress={() => setShowReportConfirm(true)}
          activeOpacity={0.7}
        >
          <Text style={[styles.flagButtonText, { color: colors.textMuted }]}>
            🚩 Report or Flag AI Content
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <CustomAlert
        visible={showCategoryPicker}
        onClose={() => setShowCategoryPicker(false)}
        title="Choose a reason"
        message="What is wrong with this AI-generated report?"
        actions={[
          { text: 'Cancel', style: 'cancel', onPress: () => setShowCategoryPicker(false) },
          ...REPORT_CATEGORIES.map((c) => ({
            text: c.label,
            onPress: async () => {
              setSelectedCategory(c.id);
              setShowCategoryPicker(false);
              setIsSubmittingReport(true);
              await submitReportToBackend(c.id);
              setIsSubmittingReport(false);
              setShowReportSuccess(true);
            },
          })),
        ]}
      />

      <CustomAlert
        visible={showReportConfirm}
        onClose={() => setShowReportConfirm(false)}
        title="Report AI Content"
        message="Would you like to flag this AI-generated workout report as inappropriate, harmful, or inaccurate?"
        actions={[
          { text: 'Cancel', style: 'cancel', onPress: () => setShowReportConfirm(false) },
          {
            text: isSubmittingReport ? 'Submitting...' : 'Continue',
            style: 'destructive',
            onPress: handleSendReport,
          },
        ]}
      />

      <CustomAlert
        visible={showReportSuccess}
        onClose={() => setShowReportSuccess(false)}
        title="Report Received"
        message="Thank you. Your feedback has been recorded to help us improve AI safety and accuracy."
        actions={[
          { text: 'OK', onPress: () => setShowReportSuccess(false) },
        ]}
      />
    </SafeAreaView>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  sectionCard: {
    borderRadius: 12,
    borderWidth: 1.5,
    padding: 16,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 8,
  },
  sectionIcon: {
    fontSize: 18,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  notesList: {
    gap: 12,
  },
  noteRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  bulletPoint: {
    fontSize: 18,
    lineHeight: 20,
  },
  noteText: {
    fontSize: responsive.font(14),
    lineHeight: 20,
    flex: 1,
  },
  recapHeading: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 14,
  },
  recapCard: {
    borderRadius: 12,
    borderWidth: 1.5,
    padding: 16,
    marginBottom: 12,
  },
  exerciseName: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 10,
  },
  divider: {
    height: 1,
    marginBottom: 10,
  },
  cardInfoRow: {
    marginTop: 6,
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: responsive.font(13),
    lineHeight: 18,
  },
  flagButton: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  flagButtonText: {
    fontSize: responsive.font(13),
    fontWeight: '500',
  },
});
