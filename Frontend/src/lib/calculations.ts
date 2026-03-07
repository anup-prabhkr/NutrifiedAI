// ── Calorie & Macro Calculator (matches server spec) ──────────────────────────
export function calculateCalorieTarget(p: {
  height: string; weight: string; age: string; gender: string;
  activity: string; goal: string; bodyFat: string;
  targetWeight?: string; weeklyWeightChange?: string;
}): { calorieTarget: number; protein: number; carbs: number; fats: number; estimatedWeeks: number | null } {
  const h = parseFloat(p.height); // cm
  const w = parseFloat(p.weight); // kg
  const a = parseInt(p.age);
  const bf = parseFloat(p.bodyFat);
  if (!h || h <= 0 || !w || w <= 0 || !a || a <= 0) return { calorieTarget: 0, protein: 0, carbs: 0, fats: 0, estimatedWeeks: null };

  // BMR
  let bmr: number;
  if (!isNaN(bf) && bf >= 3 && bf <= 60) {
    // Katch-McArdle
    const leanBodyMass = w * (1 - bf / 100);
    bmr = 370 + (21.6 * leanBodyMass);
  } else {
    // Mifflin-St Jeor
    if (p.gender === "Female") {
      bmr = 10 * w + 6.25 * h - 5 * a - 161;
    } else {
      bmr = 10 * w + 6.25 * h - 5 * a + 5;
    }
  }

  // Activity multiplier
  const activityMultiplier: Record<string, number> = {
    "Sedentary": 1.2,
    "Lightly Active": 1.375,
    "Moderately Active": 1.55,
    "Very Active": 1.725,
    "Extremely Active": 1.9,
  };
  const tdee = bmr * (activityMultiplier[p.activity] || 1.2);

  // Determine weekly weight change (kg/week)
  const goalLower = p.goal.toLowerCase();
  const parsedWeeklyChange = parseFloat(p.weeklyWeightChange ?? "");
  let weeklyChange: number;
  if (!isNaN(parsedWeeklyChange) && parsedWeeklyChange >= 0) {
    weeklyChange = parsedWeeklyChange;
  } else {
    switch (goalLower) {
      case "lean bulk": weeklyChange = 0.25; break;
      case "aggressive bulk": weeklyChange = 0.5; break;
      case "cut": weeklyChange = 0.5; break;
      default: weeklyChange = 0; break;
    }
  }

  // Convert weekly weight change to daily calorie adjustment (1 kg ≈ 7700 kcal)
  const dailyCalorieAdjustment = (weeklyChange * 7700) / 7;

  // Goal-based calorie adjustment
  let calories: number;
  switch (goalLower) {
    case "cut": calories = tdee - dailyCalorieAdjustment; break;
    case "lean bulk":
    case "aggressive bulk": calories = tdee + dailyCalorieAdjustment; break;
    default: calories = tdee; break;
  }
  const calorieTarget = Math.max(1200, Math.round(calories));

  // Estimated weeks to reach target weight
  const tw = parseFloat(p.targetWeight ?? "");
  let estimatedWeeks: number | null = null;
  if (!isNaN(tw) && tw > 0 && weeklyChange > 0) {
    estimatedWeeks = Math.ceil(Math.abs(tw - w) / weeklyChange);
  }

  // Macros
  let proteinGrams: number;
  switch (goalLower) {
    case "lean bulk": proteinGrams = Math.round(w * 2.0); break;
    case "aggressive bulk": proteinGrams = Math.round(w * 2.2); break;
    case "cut": proteinGrams = Math.round(w * 2.4); break;
    default: proteinGrams = Math.round(w * 1.8); break;
  }
  const fatCalories = calorieTarget * 0.25;
  const fatGrams = Math.round(fatCalories / 9);
  const remainingCalories = calorieTarget - (proteinGrams * 4 + fatCalories);
  const carbGrams = remainingCalories > 0 ? Math.round(remainingCalories / 4) : 0;

  return { calorieTarget, protein: proteinGrams, carbs: carbGrams, fats: fatGrams, estimatedWeeks };
}

// ── BMI Calculator ─────────────────────────────────────────────────────────────
export function calculateBmi(height: string, weight: string): { bmi: number; category: string } | null {
  const h = parseFloat(height);
  const w = parseFloat(weight);
  if (!h || h <= 0 || !w || w <= 0) return null;
  const hm = h / 100;
  const bmi = parseFloat((w / (hm * hm)).toFixed(1));
  let category: string;
  if (bmi < 18.5) category = "Underweight";
  else if (bmi < 25) category = "Normal";
  else if (bmi < 30) category = "Overweight";
  else category = "Obese";
  return { bmi, category };
}
