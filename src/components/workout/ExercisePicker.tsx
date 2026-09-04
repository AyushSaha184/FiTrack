import React, { memo, useState, useMemo, useCallback, useEffect, useDeferredValue } from 'react';
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
import { spacing, radius, typography, responsive } from '../../theme';
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

  // 250ms debounce: `searchQuery` updates instantly so the TextInput stays
  // responsive, but `debouncedQuery` only updates 250ms after typing stops.
  // `searchExercises` is then computed off the debounced value so we don't
  // re-run fuzzy/Levenshtein scoring on every intermediate keystroke.
  const [debouncedQuery, setDebouncedQuery] = useState('');
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (trimmed.length === 0) {
      setDebouncedQuery('');
      return;
    }
    const handle = setTimeout(() => setDebouncedQuery(trimmed), 250);
    return () => clearTimeout(handle);
  }, [searchQuery]);

  // useDeferredValue is a second safety net: if React is busy with the
  // modal animation or the TextInput is in the middle of a long-press
  // selection, the deprioritized re-render of searchResults won't block
  // the UI thread.
  const deferredQuery = useDeferredValue(debouncedQuery);
  const isStale = deferredQuery !== debouncedQuery;

  const searchResults = useMemo(() => {
    if (deferredQuery.length === 0) return [];
    return searchExercises(deferredQuery);
  }, [deferredQuery]);

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
          !isLastInBox && [styles.exerciseItemBorder, { borderBottomColor: colors.cardBorder }],
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
              <View style={[styles.customBadge, { backgroundColor: colors.cardBorder, borderColor: colors.cardBorder }]}>
                <Text style={[styles.customBadgeText, { color: colors.text }]}>CUSTOM</Text>
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
          <View style={[styles.expandedCategoryBox, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
            {category.id === 'custom' && (
              <View
                style={[
                  styles.exerciseItem,
                  styles.exerciseItemBorder,
                  { borderBottomColor: colors.cardBorder },
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
      bodyStyle={[styles.modalBody, { backgroundColor: colors.card }]}
    >
      <View style={[styles.container, { paddingBottom: insets.bottom, backgroundColor: colors.card }]}>
        {/* Search Bar */}
        <View
          style={[
            styles.searchContainer,
            {
              backgroundColor: colors.surface,
              borderColor: colors.cardBorder,
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
                RESULTS {isStale ? '…' : `(${searchResults.length})`}
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
    padding: 0,
  },
  container: {
    height: 550,
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
    fontSize: responsive.font(14),
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
    borderRadius: radius.md,
    borderWidth: 1,
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
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 0.5,
  },
  customBadgeText: {
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
