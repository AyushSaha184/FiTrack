import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { observer } from 'mobx-react-lite';
import Svg, { Path, Line, Polyline } from 'react-native-svg';
import { useColors, useSpacing, useTypography } from '../../hooks';
import type { AIReportResult } from '../../services/ai/aiService';

type AIReportScreenRouteProp = RouteProp<
  {
    AIReport: {
      report: AIReportResult;
    };
  },
  'AIReport'
>;

export const AIReportScreen = observer(() => {
  const colors = useColors();
  const spacing = useSpacing();
  const typography = useTypography();
  const navigation = useNavigation();
  const route = useRoute<AIReportScreenRouteProp>();
  const { report } = route.params;

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
      </ScrollView>
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
    fontSize: 14,
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
    fontSize: 13,
    lineHeight: 18,
  },
});
