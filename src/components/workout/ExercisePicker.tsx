import React, { memo, useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
} from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '../../hooks';
import { spacing, radius, typography } from '../../theme';
import { Modal } from '../common/Modal';
import {
  getExerciseCategories,
  searchExercises,
  saveCustomExercise,
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
  const [inlineCustomName, setInlineCustomName] = useState('');

  // Memoize static category list (js-combine-iterations, rerender-memo)
  const categories = useMemo(() => {
    if (!visible) return [];
    return getExerciseCategories().map((cat) => ({
      ...cat,
      exercises: [...cat.exercises].sort((a, b) => a.name.localeCompare(b.name)),
    }));
  }, [visible]);

  // Memoize search query results (rerender-use-deferred-value / useMemo)
  const searchResults = useMemo(() => {
    const trimmed = searchQuery.trim();
    if (trimmed.length === 0) return [];
    return [...searchExercises(trimmed)].sort((a, b) => a.name.localeCompare(b.name));
  }, [searchQuery]);

  const resetForm = useCallback(() => {
    setSearchQuery('');
    setSelectedCategory(null);
    setInlineCustomName('');
  }, []);

  const handleSelect = useCallback(
    (exercise: ExerciseItem) => {
      onSelectExercise(exercise);
      resetForm();
      onClose();
    },
    [onSelectExercise, resetForm, onClose]
  );

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [resetForm, onClose]);

  const handleAddInlineCustom = useCallback(() => {
    const trimmed = inlineCustomName.trim();
    if (!trimmed) return;
    const created = saveCustomExercise({
      name: trimmed,
      muscleGroup: 'chest',
      equipment: 'other',
    });
    setInlineCustomName('');
    handleSelect(created);
  }, [inlineCustomName, handleSelect]);

  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
  }, []);

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
          !isLastInBox && styles.exerciseItemBorder,
        ]}
        onPress={() => handleSelect(exercise)}
        activeOpacity={0.7}
      >
        <View style={styles.exerciseInfo}>
          <View style={styles.exerciseTitleRow}>
            <Text style={[styles.exerciseName, { color: colors.text }]}>
              {exercise.name}
            </Text>
            {exercise.isCustom && (
              <View style={styles.customBadge}>
                <Text style={styles.customBadgeText}>CUSTOM</Text>
              </View>
            )}
          </View>
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
            {category.id === 'custom' && (
              <View
                style={[
                  styles.exerciseItem,
                  styles.exerciseItemBorder,
                ]}
              >
                <View style={styles.exerciseInfo}>
                  <TextInput
                    style={[
                      styles.exerciseName,
                      styles.inlineCustomInput,
                      { color: colors.text },
                    ]}
                    placeholder="Type exercise name..."
                    placeholderTextColor={colors.textMuted}
                    value={inlineCustomName}
                    onChangeText={setInlineCustomName}
                    onSubmitEditing={handleAddInlineCustom}
                    returnKeyType="done"
                  />
                </View>
                <TouchableOpacity
                  onPress={handleAddInlineCustom}
                  activeOpacity={0.7}
                  hitSlop={10}
                >
                  <Text style={[styles.addIcon, { color: colors.textMuted }]}>+</Text>
                </TouchableOpacity>
              </View>
            )}

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
      bodyStyle={styles.modalBody}
    >
      <View style={[styles.container, { paddingBottom: insets.bottom }]}>
        {/* Search Bar */}
        <View
          style={[
            styles.searchContainer,
            {
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              borderColor: 'rgba(255, 255, 255, 0.1)',
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
          {searchQuery.length > 0 ? (
            <TouchableOpacity onPress={handleClearSearch}>
              <Text style={[styles.clearSearch, { color: colors.textMuted }]}>
                ✕
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Categories / Search Results Content */}
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
              {categories.map(renderCategory)}
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
});

ExercisePicker.displayName = 'ExercisePicker';

const styles = StyleSheet.create({
  modalBody: {
    backgroundColor: '#09090B',
  },
  container: {
    height: 550,
    backgroundColor: '#09090B',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.xl,
    marginTop: spacing.base,
    marginBottom: spacing.base,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.base,
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
  exerciseItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.07)',
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  exerciseName: {
    fontSize: typography.body.fontSize,
    fontWeight: '500',
  },
  exerciseMeta: {
    fontSize: typography.small.fontSize,
    marginTop: 2,
  },
  inlineCustomInput: {
    padding: 0,
    margin: 0,
  },
  customBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  customBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
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
