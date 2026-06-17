import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useColors } from '../../hooks';
import { spacing } from '../../theme';
import { Logo } from '../common';

export const WorkoutHeader = () => {
  const colors = useColors();
  const navigation = useNavigation();

  return (
    <View style={styles.container}>
      <Logo size="medium" />
      <TouchableOpacity
        onPress={() => (navigation as any).navigate('Settings')}
        style={styles.settingsButton}
      >
        <Text style={styles.settingsIcon}>⚙️</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.base,
  },
  settingsButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsIcon: {
    fontSize: 24,
  },
});