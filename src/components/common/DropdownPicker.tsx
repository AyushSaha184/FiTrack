import React, { memo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal as RNModal,
  Pressable,
  FlatList,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import { useColors } from '../../hooks';
import { spacing, radius, typography } from '../../theme';

interface DropdownOption {
  value: string;
  label: string;
}

interface DropdownPickerProps {
  options: DropdownOption[];
  selectedValue: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
}

export const DropdownPicker = memo<DropdownPickerProps>(({
  options,
  selectedValue,
  onValueChange,
  placeholder = 'Select',
}) => {
  const colors = useColors();
  const [isOpen, setIsOpen] = useState(false);
  const opacity = useSharedValue(0);

  const selectedLabel =
    options.find((o) => o.value === selectedValue)?.label || placeholder;

  const handleOpen = () => {
    setIsOpen(true);
    opacity.value = withTiming(1, { duration: 200 });
  };

  const handleClose = () => {
    opacity.value = withTiming(0, { duration: 150 });
    setTimeout(() => setIsOpen(false), 150);
  };

  const handleSelect = (value: string) => {
    onValueChange(value);
    handleClose();
  };

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const contentStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <>
      <TouchableOpacity
        style={[
          styles.trigger,
          {
            backgroundColor: colors.cardSurface,
            borderColor: colors.cardBorder,
          },
        ]}
        onPress={handleOpen}
        activeOpacity={0.7}
      >
        <Text style={[styles.triggerText, { color: colors.text }]}>
          {selectedLabel}
        </Text>
        <Text style={[styles.chevron, { color: colors.textMuted }]}>▾</Text>
      </TouchableOpacity>

      <RNModal
        visible={isOpen}
        transparent
        animationType="none"
        onRequestClose={handleClose}
        statusBarTranslucent
      >
        <Animated.View
          style={[styles.backdrop, { backgroundColor: colors.overlay }, backdropStyle]}
        >
          <Pressable style={styles.backdropPress} onPress={handleClose} />
        </Animated.View>
        <View style={styles.modalContainer}>
          <Animated.View
            style={[
              styles.dropdown,
              {
                backgroundColor: colors.surface,
                borderColor: colors.cardBorder,
              },
              contentStyle,
            ]}
          >
            {options.map((option, index) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.option,
                  index < options.length - 1 && {
                    borderBottomWidth: 1,
                    borderBottomColor: colors.cardBorder,
                  },
                  option.value === selectedValue && {
                    backgroundColor: 'rgba(255,255,255,0.05)',
                  },
                ]}
                onPress={() => handleSelect(option.value)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.optionText,
                    {
                      color:
                        option.value === selectedValue
                          ? colors.text
                          : colors.textSecondary,
                      fontWeight:
                        option.value === selectedValue ? '600' : '400',
                    },
                  ]}
                >
                  {option.label}
                </Text>
                {option.value === selectedValue && (
                  <Text style={[styles.checkMark, { color: colors.text }]}>
                    ✓
                  </Text>
                )}
              </TouchableOpacity>
            ))}
          </Animated.View>
        </View>
      </RNModal>
    </>
  );
});

DropdownPicker.displayName = 'DropdownPicker';

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.base,
    borderRadius: radius.pill,
    borderWidth: 1,
    gap: spacing.xs,
  },
  triggerText: {
    fontSize: typography.caption.fontSize,
    fontWeight: '500',
  },
  chevron: {
    fontSize: 12,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  backdropPress: {
    flex: 1,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdown: {
    width: '70%',
    maxWidth: 280,
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.base,
    paddingHorizontal: spacing.xl,
  },
  optionText: {
    fontSize: typography.body.fontSize,
  },
  checkMark: {
    fontSize: 16,
    fontWeight: '600',
  },
});
