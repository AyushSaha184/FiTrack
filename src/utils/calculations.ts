export const stepsToCalories = (steps: number, weightKg = 70): number => {
  return Math.round((steps * 0.04 * weightKg) / 60);
};

export interface MaintenanceCalorieParams {
  weight: number;
  weightUnit: 'kg' | 'lbs';
  heightCm?: number;
  gender?: 'male' | 'female' | 'other';
  age?: number;
}

export const calculateMaintenanceCalories = (params: MaintenanceCalorieParams): number | null => {
  const { weight, weightUnit, heightCm, gender, age = 25 } = params;
  if (!weight || !heightCm || !gender) return null;

  // Convert weight to kg if in lbs
  const weightKg = weightUnit === 'lbs' ? weight / 2.20462 : weight;

  // Mifflin-St Jeor Equation
  let bmr = 10 * weightKg + 6.25 * heightCm - 5 * age;
  if (gender === 'female') {
    bmr -= 161;
  } else {
    // 'male' or default/other
    bmr += 5;
  }

  // TDEE (Maintenance calories) = BMR * 1.375 (lightly/moderately active multiplier)
  return Math.round(bmr * 1.375);
};
