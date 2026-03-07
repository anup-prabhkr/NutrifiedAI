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
  imageUrl?: string;
}

export interface WeightLog {
  id: string;
  date: string;
  weight: number;
}

export interface Supplement {
  id: string;
  name: string;
  type: "yesno" | "measurable";
  unit?: string;
  takenDates: string[];
  measuredValues?: Record<string, number>; // date -> value for measurable
}

export interface WaterEntry {
  date: string;
  amount: number; // in ml
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
  targetWeight?: number;
  weeklyWeightChange?: number; // kg per week
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
  targetWeight: undefined,
  weeklyWeightChange: undefined,
};

// ── Guest localStorage helpers ────────────────────────────
const GUEST_PREFIX = "nv_guest_";
function guestLoad<T>(key: string, fallback: T): T {
  try { const raw = localStorage.getItem(GUEST_PREFIX + key); return raw ? JSON.parse(raw) : fallback; } catch { return fallback; }
}
function guestSave(key: string, value: any) {
  localStorage.setItem(GUEST_PREFIX + key, JSON.stringify(value));
}

function isGuestMode(): boolean {
  return localStorage.getItem("nv_guest_mode") === "true";
}

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
    imageUrl: m.imageUrl,
  };
}

export function useNutritionStore() {
  const isAuthenticated = !!getAccessToken() || isGuestMode();
  const guest = isGuestMode();

  const [meals, setMeals] = useState<Meal[]>(guest ? guestLoad("meals", []) : []);
  const [weightLogs, setWeightLogs] = useState<WeightLog[]>(guest ? guestLoad("weights", []) : []);
  const [supplements, setSupplements] = useState<Supplement[]>(guest ? guestLoad("supplements", []) : []);
  const [profile, setProfile] = useState<ProfileData>(guest ? guestLoad("profile", defaultProfile) : defaultProfile);
  const [waterLog, setWaterLog] = useState<WaterEntry[]>(guest ? guestLoad("water", []) : []);
  const [waterCupSize, setWaterCupSizeState] = useState<number>(() => {
    try { return parseInt(localStorage.getItem("nv_water_cup_size") || "250") || 250; } catch { return 250; }
  });
  const [loading, setLoading] = useState(!guest);
  const [selectedDate, setSelectedDateState] = useState(TODAY);

  // Persist guest data
  useEffect(() => { if (guest) guestSave("meals", meals); }, [guest, meals]);
  useEffect(() => { if (guest) guestSave("weights", weightLogs); }, [guest, weightLogs]);
  useEffect(() => { if (guest) guestSave("supplements", supplements); }, [guest, supplements]);
  useEffect(() => { if (guest) guestSave("profile", profile); }, [guest, profile]);
  useEffect(() => { if (guest) guestSave("water", waterLog); }, [guest, waterLog]);

  const setWaterCupSize = useCallback((size: number) => {
    setWaterCupSizeState(size);
    localStorage.setItem("nv_water_cup_size", String(size));
  }, []);

  // ── Load data from API on mount (non-guest) ──────────────
  useEffect(() => {
    if (guest || !getAccessToken()) {
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
            type: (s as any).type || "yesno",
            unit: (s as any).unit,
            takenDates: s.takenDates,
            measuredValues: (s as any).measuredValues || {},
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
          targetWeight: (p as any).targetWeight,
          weeklyWeightChange: (p as any).weeklyWeightChange,
        });
      } catch (err) {
        console.error("Failed to fetch data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [guest]);

  // Fetch meals for a specific date
  const fetchMealsForDate = useCallback(async (date: string) => {
    if (guest) return; // guest meals are all in state already
    if (!getAccessToken()) return;
    try {
      const mealsRes = await mealsApi.getByDate(date);
      setMeals((prev) => {
        const otherDates = prev.filter((m) => m.date !== date);
        return [...mealsRes.map(mapMeal), ...otherDates];
      });
    } catch (err) {
      console.error("Failed to fetch meals for date:", err);
    }
  }, [guest]);

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

  // ── Water tracking ──────────────────────────────────────
  const todayWater = waterLog.find((w) => w.date === selectedDate)?.amount || 0;

  const addWater = useCallback((amount: number) => {
    setWaterLog((prev) => {
      const idx = prev.findIndex((w) => w.date === selectedDate);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = { ...updated[idx], amount: Math.max(0, updated[idx].amount + amount) };
        return updated;
      }
      if (amount > 0) return [...prev, { date: selectedDate, amount }];
      return prev;
    });
  }, [selectedDate]);

  const addMeal = useCallback(async (meal: {
    mealName: string;
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
    source: "ai" | "manual";
    aiConfidence?: number;
    imageUrl?: string;
  }) => {
    if (guest) {
      const newMeal: Meal = {
        id: Date.now().toString(),
        name: meal.mealName,
        time: new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }),
        calories: meal.calories,
        protein: meal.protein,
        carbs: meal.carbs,
        fats: meal.fats,
        source: meal.source,
        date: selectedDate,
        imageUrl: meal.imageUrl,
      };
      setMeals((prev) => [newMeal, ...prev]);
      return;
    }
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
  }, [selectedDate, guest]);

  const deleteMeal = useCallback(async (id: string) => {
    if (guest) { setMeals((prev) => prev.filter((m) => m.id !== id)); return; }
    try {
      await mealsApi.delete(id);
      setMeals((prev) => prev.filter((m) => m.id !== id));
    } catch (err: any) {
      toast.error(err.message || "Failed to delete meal");
    }
  }, [guest]);

  const updateMeal = useCallback(async (id: string, updates: {
    mealName?: string; calories?: number; protein?: number; carbs?: number; fats?: number;
  }) => {
    if (guest) {
      setMeals((prev) => prev.map((m) => m.id === id ? { ...m, name: updates.mealName ?? m.name, calories: updates.calories ?? m.calories, protein: updates.protein ?? m.protein, carbs: updates.carbs ?? m.carbs, fats: updates.fats ?? m.fats } : m));
      return;
    }
    try {
      const updated = await mealsApi.update(id, updates);
      setMeals((prev) => prev.map((m) => (m.id === id ? mapMeal(updated) : m)));
    } catch (err: any) {
      toast.error(err.message || "Failed to update meal");
    }
  }, [guest]);

  const addWeightLog = useCallback(async (weight: number, date?: string) => {
    const logDate = date || TODAY;
    if (guest) {
      setWeightLogs((prev) => {
        const existing = prev.findIndex((l) => l.date === logDate);
        if (existing >= 0) {
          const updated = [...prev];
          updated[existing] = { ...updated[existing], weight };
          return updated;
        }
        return [{ id: Date.now().toString(), date: logDate, weight }, ...prev].sort((a, b) => b.date.localeCompare(a.date));
      });
      return;
    }
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
  }, [guest]);

  const deleteWeightLog = useCallback(async (id: string) => {
    if (guest) { setWeightLogs((prev) => prev.filter((l) => l.id !== id)); return; }
    try {
      await weightApi.delete(id);
      setWeightLogs((prev) => prev.filter((l) => l.id !== id));
    } catch (err: any) {
      toast.error(err.message || "Failed to delete weight log");
    }
  }, [guest]);

  const updateWeightLog = useCallback(async (id: string, weight: number, date?: string) => {
    if (guest) {
      setWeightLogs((prev) => prev.map((l) => l.id === id ? { ...l, weight } : l));
      return;
    }
    try {
      const result = await weightApi.update(id, weight, date ? new Date(date + "T12:00:00") : undefined);
      setWeightLogs((prev) =>
        prev.map((l) => (l.id === id ? { id: result._id, date: new Date(result.date).toISOString().split("T")[0], weight: result.weight } : l))
      );
    } catch (err: any) {
      toast.error(err.message || "Failed to update weight log");
    }
  }, [guest]);

  const toggleSupplement = useCallback(async (name: string, date?: string, value?: number) => {
    const sup = supplements.find((s) => s.name === name);
    if (!sup) return;
    const toggleDate = date || TODAY;

    if (guest) {
      setSupplements((prev) => prev.map((s) => {
        if (s.name !== name) return s;
        const taken = s.takenDates.includes(toggleDate);
        const newTaken = taken ? s.takenDates.filter((d) => d !== toggleDate) : [...s.takenDates, toggleDate];
        const newMeasured = { ...(s.measuredValues || {}) };
        if (s.type === "measurable" && !taken && value !== undefined) {
          newMeasured[toggleDate] = value;
        } else if (taken) {
          delete newMeasured[toggleDate];
        }
        return { ...s, takenDates: newTaken, measuredValues: newMeasured };
      }));
      return;
    }
    try {
      const updated = await supplementsApi.toggleTaken(sup.id, toggleDate);
      setSupplements((prev) =>
        prev.map((s) => (s.id === sup.id ? { ...s, takenDates: updated.takenDates } : s))
      );
    } catch (err: any) {
      toast.error(err.message || "Failed to toggle supplement");
    }
  }, [supplements, guest]);

  const addSupplement = useCallback(async (name: string, type: "yesno" | "measurable" = "yesno", unit?: string) => {
    if (guest) {
      if (supplements.some((s) => s.name.toLowerCase() === name.toLowerCase())) {
        toast.error("Supplement already exists");
        return;
      }
      setSupplements((prev) => [...prev, { id: Date.now().toString(), name, type, unit, takenDates: [], measuredValues: {} }]);
      return;
    }
    try {
      const created = await supplementsApi.create({ name, dose: unit, frequency: type });
      setSupplements((prev) => [...prev, { id: created._id, name: created.name, type: type, unit: unit, takenDates: created.takenDates, measuredValues: {} }]);
    } catch (err: any) {
      toast.error(err.message || "Failed to add supplement");
    }
  }, [supplements, guest]);

  const deleteSupplement = useCallback(async (name: string) => {
    const sup = supplements.find((s) => s.name === name);
    if (!sup) return;
    if (guest) { setSupplements((prev) => prev.filter((s) => s.id !== sup.id)); return; }
    try {
      await supplementsApi.delete(sup.id);
      setSupplements((prev) => prev.filter((s) => s.id !== sup.id));
    } catch (err: any) {
      toast.error(err.message || "Failed to delete supplement");
    }
  }, [supplements, guest]);

  const updateSupplement = useCallback(async (currentName: string, newName: string) => {
    const sup = supplements.find((s) => s.name === currentName);
    if (!sup) return;
    if (guest) {
      setSupplements((prev) => prev.map((s) => s.id === sup.id ? { ...s, name: newName } : s));
      return;
    }
    try {
      const updated = await supplementsApi.update(sup.id, { name: newName });
      setSupplements((prev) =>
        prev.map((s) => (s.id === sup.id ? { ...s, name: updated.name } : s))
      );
    } catch (err: any) {
      toast.error(err.message || "Failed to update supplement");
    }
  }, [supplements, guest]);

  const updateProfile = useCallback(async (updates: Partial<ProfileData>) => {
    if (guest) {
      setProfile((prev) => ({ ...prev, ...updates }));
      toast.success("Profile saved");
      return;
    }
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
      if (updates.targetWeight !== undefined) apiUpdates.targetWeight = updates.targetWeight;
      if (updates.weeklyWeightChange !== undefined) apiUpdates.weeklyWeightChange = updates.weeklyWeightChange;

      const res = await profileApi.update(apiUpdates);

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
  }, [guest]);

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
    waterLog,
    todayWater,
    addWater,
    waterCupSize,
    setWaterCupSize,
  };
}
