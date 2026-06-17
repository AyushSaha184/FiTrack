import { Easing } from 'react-native-reanimated';

export const easing = {
  standard: Easing.bezier(0.4, 0.0, 0.2, 1),
  decelerate: Easing.bezier(0.0, 0.0, 0.2, 1),
  accelerate: Easing.bezier(0.4, 0.0, 1, 1),
  ease: Easing.ease,
  linear: Easing.linear,
};

export const durations = {
  instant: 80,
  fast: 120,
  base: 200,
  medium: 250,
  slow: 300,
  slower: 400,
  pageEntrance: 500,
  chartDraw: 600,
  slowLoader: 600,
} as const;

export const springConfigs = {
  gentle: { damping: 20, stiffness: 120, mass: 1 },
  snappy: { damping: 15, stiffness: 200, mass: 0.8 },
  bouncy: { damping: 10, stiffness: 180, mass: 0.6 },
  stiff: { damping: 25, stiffness: 300, mass: 1 },
  carousel: { damping: 20, stiffness: 250, mass: 0.8 },
  tabSwitch: { damping: 18, stiffness: 280, mass: 0.7 },
  toggle: { damping: 12, stiffness: 200, mass: 0.6 },
} as const;

export const staggerDelay = {
  fast: 50,
  base: 80,
  slow: 120,
} as const;

export type AnimationDuration = keyof typeof durations;
