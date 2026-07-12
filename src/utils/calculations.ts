export const stepsToCalories = (steps: number, weightKg = 70): number => {
  return Math.round((steps * 0.04 * weightKg) / 60);
};
