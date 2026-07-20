import React, { memo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
} from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import Animated, { SlideInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '../../hooks';
import { spacing, radius, typography } from '../../theme';
import { Modal } from '../common/Modal';
import {
  exerciseCategories,
  searchExercises,
  type ExerciseItem,
  type ExerciseCategory,
} from '../../utils/exerciseData';

interface ExercisePickerProps {
  visible: boolean;
  onClose: () => void;
  onSelectExercise: (exercise: ExerciseItem) => void;
}

export const ExercisePicker = memo<ExercisePickerProps>(({
  visible,
  onClose,
  onSelectExercise,
}) => {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const searchResults = searchQuery.length > 0 ? searchExercises(searchQuery) : [];

  const handleSelect = (exercise: ExerciseItem) => {
    onSelectExercise(exercise);
    setSearchQuery('');
    setSelectedCategory(null);
    onClose();
  };

  const handleClose = () => {
    setSearchQuery('');
    setSelectedCategory(null);
    onClose();
  };

  const renderExerciseItem = (
    exercise: ExerciseItem,
    index: number,
    isLastInBox = false,
  ) => {
    return (
      <TouchableOpacity
        key={exercise.id}
        style={[
          styles.exerciseItem,
          !isLastInBox && {
            borderBottomWidth: 1,
            borderBottomColor: 'rgba(255, 255, 255, 0.07)',
          },
        ]}
        onPress={() => handleSelect(exercise)}
        activeOpacity={0.7}
      >
        <View style={styles.exerciseInfo}>
          <Text style={[styles.exerciseName, { color: colors.text }]}>
            {exercise.name}
          </Text>
          <Text style={[styles.exerciseMeta, { color: colors.textMuted }]}>
            {exercise.equipment.charAt(0).toUpperCase() + exercise.equipment.slice(1).replace('_', ' ')}
          </Text>
        </View>
        <Text style={[styles.addIcon, { color: colors.textMuted }]}>+</Text>
      </TouchableOpacity>
    );
  };

  const renderCategory = (category: ExerciseCategory) => {
    const isExpanded = selectedCategory === category.id;
    return (
      <View key={category.id} style={styles.categoryContainer}>
        <TouchableOpacity
          style={[
            styles.categoryHeader,
            {
              borderBottomColor: colors.cardBorder,
            },
          ]}
          onPress={() =>
            setSelectedCategory(isExpanded ? null : category.id)
          }
          activeOpacity={0.7}
        >
          <View style={styles.categoryLeft}>
            <Text style={[styles.categoryName, { color: colors.text }]}>
              {category.name}
            </Text>
          </View>
          <View style={styles.categoryRight}>
            <Text style={[styles.categoryCount, { color: colors.textMuted }]}>
              {category.exercises.length}
            </Text>
            <Text style={[styles.expandIcon, { color: colors.textMuted }]}>
              {isExpanded ? '▾' : '›'}
            </Text>
          </View>
        </TouchableOpacity>
        {isExpanded && (
          <View style={styles.expandedCategoryBox}>
            {category.exercises.map((exercise, index) =>
              renderExerciseItem(
                exercise,
                index,
                index === category.exercises.length - 1,
              ),
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      onClose={handleClose}
      title="Add Exercise"
      sheet
      noPadding
      bodyStyle={{ backgroundColor: '#09090B' }}
    >
      <View style={{ height: 550, paddingBottom: insets.bottom, backgroundColor: '#09090B' }}>
        {/* Search */}
        <View
          style={[
            styles.searchContainer,
            {
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              borderColor: 'rgba(255, 255, 255, 0.1)',
              marginTop: spacing.base,
            },
          ]}
        >
          <Svg
            width={18}
            height={18}
            viewBox="0 0 24 24"
            fill="none"
            stroke={colors.textMuted}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            style={styles.searchSvg}
          >
            <Circle cx="11" cy="11" r="8" />
            <Path d="m21 21-4.3-4.3" />
          </Svg>
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search exercises..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Text style={[styles.clearSearch, { color: colors.textMuted }]}>
                ✕
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Content */}
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {searchQuery.length > 0 ? (
            <>
              <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
                RESULTS ({searchResults.length})
              </Text>
              {searchResults.length > 0 ? (
                searchResults.map((item, index) => renderExerciseItem(item, index))
              ) : (
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                  No exercises found for "{searchQuery}"
                </Text>
              )}
            </>
          ) : (
            <>
              <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
                CATEGORIES
              </Text>
              {exerciseCategories.map(renderCategory)}
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
});

ExercisePicker.displayName = 'ExercisePicker';

const styles = StyleSheet.create({
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.xl,
    marginBottom: spacing.base,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.base,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: spacing.sm,
  },
  searchSvg: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.body.fontSize,
    paddingVertical: spacing.md,
  },
  clearSearch: {
    fontSize: 14,
    padding: spacing.xs,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: typography.sectionLabel.fontSize,
    fontWeight: '500',
    letterSpacing: 0.8,
    marginBottom: spacing.base,
    marginTop: spacing.sm,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.base,
    borderBottomWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    marginBottom: 2,
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  categoryIcon: {
    fontSize: 22,
  },
  categoryName: {
    fontSize: typography.body.fontSize,
    fontWeight: '600',
  },
  categoryRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  categoryCount: {
    fontSize: typography.caption.fontSize,
  },
  expandIcon: {
    fontSize: 16,
    fontWeight: '600',
  },
  categoryContainer: {
    marginBottom: spacing.xs,
  },
  expandedCategoryBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.035)',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
    marginLeft: spacing.base,
    paddingHorizontal: spacing.base,
    overflow: 'hidden',
  },
  exerciseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
  },
  exerciseIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  exerciseIconText: {
    fontSize: 18,
  },
  exerciseImage: {
    width: 26,
    height: 26,
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    fontSize: typography.body.fontSize,
    fontWeight: '500',
  },
  exerciseMeta: {
    fontSize: typography.small.fontSize,
    marginTop: 2,
  },
  addIcon: {
    fontSize: 22,
    fontWeight: '300',
    paddingHorizontal: spacing.sm,
  },
  emptyText: {
    fontSize: typography.body.fontSize,
    textAlign: 'center',
    paddingVertical: spacing.xxxl,
  },
});
