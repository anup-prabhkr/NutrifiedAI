import { useState, useEffect, useCallback } from "react";
import { mealsApi, weightApi, supplementsApi, profileApi, type MealData, type WeightData, type SupplementData } from "@/lib/api";
import { getAccessToken } from "@/lib/api";
import { toast } from "sonner";

export interface Meal {
  id: string;
  name: string;
  time: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  source: "ai" | "manual";
  date: string;
}

export interface WeightLog {
  id: string;
  date: string;
  weight: number;
}

export interface Supplement {
  id: string;
  name: string;
  takenDates: string[];
}

export interface ProfileData {
  name: string;
  goal: string;
  activity: string;
  height: string;
  weight: string;
  age: string;
  gender: string;
  bodyFat: string;
  calorieTarget: number;
  macroTargets: { protein: number; carbs: number; fats: number };
  bmi: number;
  bmiCategory: string;
  manualMacros: boolean;
  profilePicture: string;
}

const TODAY = new Date().toISOString().split("T")[0];

// ── Fallback defaults when not authenticated ──────────────
const defaultProfile: ProfileData = {
  name: "User",
  goal: "Maintain",
  activity: "Moderately Active",
  height: "0",
  weight: "0",
  age: "0",
  gender: "Male",
  bodyFat: "0",
  calorieTarget: 0,
  macroTargets: { protein: 0, carbs: 0, fats: 0 },
  bmi: 0,
  bmiCategory: "",
  manualMacros: false,
  profilePicture: "",
};

function mapMeal(m: MealData): Meal {
  return {
    id: m._id,
    name: m.mealName,
    time: new Date(m.createdAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }),
    calories: m.calories,
    protein: m.protein,
    carbs: m.carbs,
    fats: m.fats,
    source: m.source as "ai" | "manual",
    date: m.date,
  };
}

export function useNutritionStore() {
  const isAuthenticated = !!getAccessToken();

  const [meals, setMeals] = useState<Meal[]>([]);
  const [weightLogs, setWeightLogs] = useState<WeightLog[]>([]);
  const [supplements, setSupplements] = useState<Supplement[]>([]);
  const [profile, setProfile] = useState<ProfileData>(defaultProfile);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDateState] = useState(TODAY);

  // ── Load data from API on mount ─────────────────────────
  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    const fetchAll = async () => {
      try {
        const [mealsRes, weightRes, supRes, profileRes] = await Promise.all([
          mealsApi.getByDate(TODAY),
          weightApi.getHistory("month"),
          supplementsApi.getAll(),
          profileApi.get(),
        ]);

        setMeals(mealsRes.map(mapMeal));

        setWeightLogs(
          weightRes.map((w) => ({
            id: w._id,
            date: new Date(w.date).toISOString().split("T")[0],
            weight: w.weight,
          }))
        );

        setSupplements(
          supRes.map((s) => ({
            id: s._id,
            name: s.name,
            takenDates: s.takenDates,
          }))
        );

        const p = profileRes.profile || {};
        const targets = p.macroTargets || { protein: 0, carbs: 0, fats: 0 };
        const calorieTarget = p.calorieTarget || 0;

        setProfile({
          name: profileRes.name || "User",
          goal: p.goal || "Maintain",
          activity: p.activityLevel || "Moderately Active",
          height: p.height ? String(p.height) : "0",
          weight: p.weight ? String(p.weight) : "0",
          age: p.age ? String(p.age) : "0",
          gender: p.gender || "Male",
          bodyFat: p.bodyFatPercentage ? String(p.bodyFatPercentage) : "0",
          calorieTarget,
          macroTargets: {
            protein: targets.protein,
            carbs: targets.carbs,
            fats: targets.fats,
          },
          bmi: p.bmi || 0,
          bmiCategory: p.bmiCategory || "",
          manualMacros: !!p.manualMacros,
          profilePicture: p.profilePicture || "",
        });
      } catch (err) {
        console.error("Failed to fetch data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [isAuthenticated]);

  // Fetch meals for a specific date
  const fetchMealsForDate = useCallback(async (date: string) => {
    if (!isAuthenticated) return;
    try {
      const mealsRes = await mealsApi.getByDate(date);
      // Merge with existing meals, replacing any for the same date
      setMeals((prev) => {
        const otherDates = prev.filter((m) => m.date !== date);
        return [...mealsRes.map(mapMeal), ...otherDates];
      });
    } catch (err) {
      console.error("Failed to fetch meals for date:", err);
    }
  }, [isAuthenticated]);

  const setSelectedDate = useCallback((date: string) => {
    setSelectedDateState(date);
    fetchMealsForDate(date);
  }, [fetchMealsForDate]);

  const selectedDateMeals = meals.filter((m) => m.date === selectedDate);
  const todayMeals = meals.filter((m) => m.date === TODAY);

  const totals = selectedDateMeals.reduce(
    (acc, m) => ({
      calories: acc.calories + m.calories,
      protein: acc.protein + m.protein,
      carbs: acc.carbs + m.carbs,
      fats: acc.fats + m.fats,
    }),
    { calories: 0, protein: 0, carbs: 0, fats: 0 }
  );

  const addMeal = useCallback(async (meal: {
    mealName: string;
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
    source: "ai" | "manual";
    aiConfidence?: number;
  }) => {
    try {
      const created = await mealsApi.create({
        mealName: meal.mealName,
        calories: meal.calories,
        protein: meal.protein,
        carbs: meal.carbs,
        fats: meal.fats,
        source: meal.source,
        aiConfidence: meal.aiConfidence,
        date: selectedDate,
      });
      setMeals((prev) => [mapMeal(created), ...prev]);
    } catch (err: any) {
      toast.error(err.message || "Failed to add meal");
    }
  }, [selectedDate]);

  const deleteMeal = useCallback(async (id: string) => {
    try {
      await mealsApi.delete(id);
      setMeals((prev) => prev.filter((m) => m.id !== id));
    } catch (err: any) {
      toast.error(err.message || "Failed to delete meal");
    }
  }, []);

  const updateMeal = useCallback(async (id: string, updates: {
    mealName?: string; calories?: number; protein?: number; carbs?: number; fats?: number;
  }) => {
    try {
      const updated = await mealsApi.update(id, updates);
      setMeals((prev) => prev.map((m) => (m.id === id ? mapMeal(updated) : m)));
    } catch (err: any) {
      toast.error(err.message || "Failed to update meal");
    }
  }, []);

  const addWeightLog = useCallback(async (weight: number, date?: string) => {
    const logDate = date || TODAY;
    try {
      const result = await weightApi.log(weight, date ? new Date(date + "T12:00:00") : undefined);
      setWeightLogs((prev) => {
        const existing = prev.findIndex((l) => l.date === logDate);
        if (existing >= 0) {
          const updated = [...prev];
          updated[existing] = { id: result._id, date: logDate, weight };
          return updated;
        }
        return [{ id: result._id, date: logDate, weight }, ...prev].sort((a, b) => b.date.localeCompare(a.date));
      });
    } catch (err: any) {
      toast.error(err.message || "Failed to log weight");
    }
  }, []);

  const deleteWeightLog = useCallback(async (id: string) => {
    try {
      await weightApi.delete(id);
      setWeightLogs((prev) => prev.filter((l) => l.id !== id));
    } catch (err: any) {
      toast.error(err.message || "Failed to delete weight log");
    }
  }, []);

  const updateWeightLog = useCallback(async (id: string, weight: number, date?: string) => {
    try {
      const result = await weightApi.update(id, weight, date ? new Date(date + "T12:00:00") : undefined);
      setWeightLogs((prev) =>
        prev.map((l) => (l.id === id ? { id: result._id, date: new Date(result.date).toISOString().split("T")[0], weight: result.weight } : l))
      );
    } catch (err: any) {
      toast.error(err.message || "Failed to update weight log");
    }
  }, []);

  const toggleSupplement = useCallback(async (name: string, date?: string) => {
    const sup = supplements.find((s) => s.name === name);
    if (!sup) return;
    const toggleDate = date || TODAY;
    try {
      const updated = await supplementsApi.toggleTaken(sup.id, toggleDate);
      setSupplements((prev) =>
        prev.map((s) => (s.id === sup.id ? { ...s, takenDates: updated.takenDates } : s))
      );
    } catch (err: any) {
      toast.error(err.message || "Failed to toggle supplement");
    }
  }, [supplements]);

  const addSupplement = useCallback(async (name: string) => {
    try {
      const created = await supplementsApi.create({ name });
      setSupplements((prev) => [...prev, { id: created._id, name: created.name, takenDates: created.takenDates }]);
    } catch (err: any) {
      toast.error(err.message || "Failed to add supplement");
    }
  }, []);

  const deleteSupplement = useCallback(async (name: string) => {
    const sup = supplements.find((s) => s.name === name);
    if (!sup) return;
    try {
      await supplementsApi.delete(sup.id);
      setSupplements((prev) => prev.filter((s) => s.id !== sup.id));
    } catch (err: any) {
      toast.error(err.message || "Failed to delete supplement");
    }
  }, [supplements]);

  const updateSupplement = useCallback(async (currentName: string, newName: string) => {
    const sup = supplements.find((s) => s.name === currentName);
    if (!sup) return;
    try {
      const updated = await supplementsApi.update(sup.id, { name: newName });
      setSupplements((prev) =>
        prev.map((s) => (s.id === sup.id ? { ...s, name: updated.name } : s))
      );
    } catch (err: any) {
      toast.error(err.message || "Failed to update supplement");
    }
  }, [supplements]);

  const updateProfile = useCallback(async (updates: Partial<ProfileData>) => {
    try {
      const apiUpdates: Record<string, any> = {};
      if (updates.height) apiUpdates.height = parseFloat(updates.height);
      if (updates.weight) apiUpdates.weight = parseFloat(updates.weight);
      if (updates.age) apiUpdates.age = parseInt(updates.age);
      if (updates.gender) apiUpdates.gender = updates.gender;
      if (updates.activity) apiUpdates.activityLevel = updates.activity;
      if (updates.goal) apiUpdates.goal = updates.goal;
      if (updates.bodyFat !== undefined) apiUpdates.bodyFatPercentage = parseFloat(updates.bodyFat) || 0;
      if (updates.manualMacros !== undefined) apiUpdates.manualMacros = updates.manualMacros;
      if (updates.name) apiUpdates.name = updates.name;
      if (updates.profilePicture !== undefined) apiUpdates.profilePicture = updates.profilePicture;
      if (updates.calorieTarget) apiUpdates.calorieTarget = updates.calorieTarget;
      if (updates.macroTargets) apiUpdates.macroTargets = updates.macroTargets;

      const res = await profileApi.update(apiUpdates);

      // Use server-computed values (BMI, calories, macros) from the response
      const p = res.profile || {};
      const targets = p.macroTargets || updates.macroTargets || { protein: 0, carbs: 0, fats: 0 };
      setProfile((prev) => ({
        ...prev,
        ...updates,
        calorieTarget: p.calorieTarget ?? updates.calorieTarget ?? prev.calorieTarget,
        macroTargets: {
          protein: targets.protein,
          carbs: targets.carbs,
          fats: targets.fats,
        },
        bmi: p.bmi ?? prev.bmi,
        bmiCategory: p.bmiCategory ?? prev.bmiCategory,
      }));
      toast.success("Profile saved");
    } catch (err: any) {
      toast.error(err.message || "Failed to update profile");
    }
  }, []);

  // Use server-computed macro targets directly
  const macroTargets = profile.macroTargets;

  return {
    meals,
    todayMeals,
    selectedDateMeals,
    totals,
    weightLogs,
    supplements,
    profile,
    macroTargets,
    loading,
    addMeal,
    deleteMeal,
    updateMeal,
    addWeightLog,
    deleteWeightLog,
    updateWeightLog,
    toggleSupplement,
    addSupplement,
    deleteSupplement,
    updateSupplement,
    updateProfile,
    today: TODAY,
    selectedDate,
    setSelectedDate,
  };
}
