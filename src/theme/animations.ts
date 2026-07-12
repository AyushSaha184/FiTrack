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

export const staggerDelay = {
  fast: 50,
  base: 80,
  slow: 120,
} as const;

export type AnimationDuration = keyof typeof durations;
