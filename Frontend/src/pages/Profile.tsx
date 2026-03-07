import React, { useState, useEffect, useRef } from "react";
import { Ruler, Weight, Calendar, UserRound, Activity, Target, Flame, Edit3, Check, Percent, LogOut, AlertTriangle, Camera, Mail, Lock, Eye, EyeOff, Loader2, Trash2, TrendingDown, TrendingUp, Sun, Moon } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { useNutritionStore } from "@/hooks/useNutritionStore";
import { useAuth } from "@/contexts/AuthContext";
import { authApi } from "@/lib/api";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useTheme } from "@/contexts/ThemeContext";

const goalOptions = ["Maintain", "Lean Bulk", "Aggressive Bulk", "Cut"];
const activityOptions = ["Sedentary", "Lightly Active", "Moderately Active", "Very Active", "Extremely Active"];
const genderOptions = ["Male", "Female", "Other"];

// ── Calorie & Macro Calculator (matches server spec) ─────
function calculateCalorieTarget(p: {
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
    // Goal-based defaults
    switch (goalLower) {
      case "lean bulk": weeklyChange = 0.25; break;
      case "aggressive bulk": weeklyChange = 0.5; break;
      case "cut": weeklyChange = 0.5; break;
      default: weeklyChange = 0; break; // Maintain
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
    default: calories = tdee; break; // Maintain
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

function calculateBmi(height: string, weight: string): { bmi: number; category: string } | null {
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

const Profile: React.FC = () => {
  const { profile, macroTargets, updateProfile, loading } = useNutritionStore();
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(profile);
  const [manualMacros, setManualMacros] = useState(profile.manualMacros || false);
  const [unitSystem, setUnitSystem] = useState<"metric" | "imperial">("metric");
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [heightFt, setHeightFt] = useState<string>("");
  const [heightIn, setHeightIn] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Keep form in sync with profile when NOT editing (fixes stale data after login)
  useEffect(() => {
    if (!editing) {
      setForm(profile);
      setManualMacros(profile.manualMacros || false);
      setValidationErrors({});
    }
  }, [profile, editing]);

  // Sync imperial height fields when entering edit mode or switching units
  useEffect(() => {
    if (editing && unitSystem === "imperial") {
      const cm = parseFloat(form.height) || 0;
      const totalIn = cm / 2.54;
      setHeightFt(cm > 0 ? String(Math.floor(totalIn / 12)) : "");
      setHeightIn(cm > 0 ? String(Math.round(totalIn % 12)) : "");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing, unitSystem]);

  // ── Profile picture ──────────────────────────────────────
  const compressImage = (file: File, maxSize = 200): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let { width, height } = img;
          if (width > maxSize || height > maxSize) {
            if (width > height) { height = (maxSize * height) / width; width = maxSize; }
            else { width = (maxSize * width) / height; height = maxSize; }
          }
          canvas.width = width;
          canvas.height = height;
          canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", 0.8));
        };
        img.onerror = reject;
        img.src = e.target!.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleProfilePicChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImage(file);
      setForm((prev) => ({ ...prev, profilePicture: compressed }));
    } catch {
      console.error("Failed to process image");
    }
  };

  const handleImperialHeight = (ft: string, inches: string) => {
    setHeightFt(ft);
    setHeightIn(inches);
    const cm = Math.round(((parseInt(ft) || 0) * 12 + (parseInt(inches) || 0)) * 2.54);
    setForm((prev) => ({ ...prev, height: String(cm) }));
    const err = validateField("height", String(cm));
    setValidationErrors((prev) => {
      const next = { ...prev };
      if (err) next.height = err; else delete next.height;
      return next;
    });
  };

  // ── Unit conversion helpers ────────────────────────────
  const cmToFtIn = (cm: number) => {
    const totalIn = cm / 2.54;
    const ft = Math.floor(totalIn / 12);
    const inches = Math.round(totalIn % 12);
    return `${ft}'${inches}"`;
  };
  const kgToLbs = (kg: number) => Math.round(kg * 2.20462);
  const lbsToKg = (lbs: number) => +(lbs / 2.20462).toFixed(1);
  const ftInToCm = (ftIn: string) => {
    const match = ftIn.match(/(\d+)'?\s*(\d+)?/);
    if (!match) return 0;
    const ft = parseInt(match[1]) || 0;
    const inches = parseInt(match[2]) || 0;
    return Math.round((ft * 12 + inches) * 2.54);
  };

  // Get display value in currently selected unit
  const getDisplayValue = (key: string, rawValue: string) => {
    const num = parseFloat(rawValue);
    if (!num || num <= 0) return rawValue;
    if (unitSystem === "imperial") {
      if (key === "height") return cmToFtIn(num);
      if (key === "weight") return String(kgToLbs(num));
    }
    return rawValue;
  };

  const getUnitLabel = (key: string) => {
    if (unitSystem === "imperial") {
      if (key === "height") return "ft'in\"";
      if (key === "weight") return "lbs";
    } else {
      if (key === "height") return "cm";
      if (key === "weight") return "kg";
    }
    if (key === "age") return "years";
    if (key === "bodyFat") return "%";
    return "";
  };

  // ── Validation ─────────────────────────────────────────
  const validateField = (key: string, value: string) => {
    const num = parseFloat(value);
    if (key === "height" || key === "weight" || key === "age") {
      if (value && (isNaN(num) || num <= 0)) {
        return `${key.charAt(0).toUpperCase() + key.slice(1)} must be a positive number`;
      }
    }
    if (key === "bodyFat" && value && parseFloat(value) !== 0) {
      if (isNaN(num) || num < 0) return "Body fat cannot be negative";
      if (num > 60) return "Body fat must be below 60%";
    }
    return "";
  };

  const handleFieldChange = (key: string, raw: string) => {
    let value = raw;
    // For imperial height, convert back to cm for storage
    if (unitSystem === "imperial" && key === "height") {
      const cm = ftInToCm(raw);
      if (cm > 0) value = String(cm);
      else value = raw; // Keep raw while typing
    }
    // For imperial weight, convert lbs to kg for storage
    if (unitSystem === "imperial" && key === "weight") {
      const num = parseFloat(raw);
      if (!isNaN(num) && num > 0) value = String(lbsToKg(num));
      else value = raw;
    }
    setForm((prev) => ({ ...prev, [key]: value }));
    const err = validateField(key, value);
    setValidationErrors((prev) => {
      const next = { ...prev };
      if (err) next[key] = err;
      else delete next[key];
      return next;
    });
  };

  // Recalculate calorie target whenever relevant body-stat fields change
  useEffect(() => {
    if (!editing || manualMacros) return;
    const computed = calculateCalorieTarget({
      ...form,
      bodyFat: form.bodyFat || "0",
      targetWeight: String(form.targetWeight ?? ""),
      weeklyWeightChange: String(form.weeklyWeightChange ?? ""),
    });
    if (computed.calorieTarget > 0) {
      setForm((prev) => ({
        ...prev,
        calorieTarget: computed.calorieTarget,
        macroTargets: { protein: computed.protein, carbs: computed.carbs, fats: computed.fats },
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing, manualMacros, form.height, form.weight, form.age, form.gender, form.activity, form.goal, form.bodyFat, form.weeklyWeightChange, form.targetWeight]);

  const bmiInfo = calculateBmi(editing ? form.height : profile.height, editing ? form.weight : profile.weight);

  const hasValidationErrors = Object.keys(validationErrors).length > 0;

  const handleSave = () => {
    // Re-validate all fields before saving
    const errors: Record<string, string> = {};
    ["height", "weight", "age", "bodyFat"].forEach((key) => {
      const err = validateField(key, (form as any)[key]);
      if (err) errors[key] = err;
    });
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }
    updateProfile({ ...form, manualMacros });
    setEditing(false);
  };

  const handleCancel = () => {
    setForm(profile);
    setManualMacros(profile.manualMacros || false);
    setValidationErrors({});
    setEditing(false);
  };

  const handleLogout = async () => {
    if (!window.confirm("Are you sure you want to sign out?")) return;
    await logout();
    navigate("/login");
  };

  const bodyStats = [
    { icon: Ruler, label: "Height", key: "height" },
    { icon: Weight, label: "Weight", key: "weight" },
    { icon: Calendar, label: "Age", key: "age" },
    { icon: UserRound, label: "Gender", key: "gender" },
    { icon: Percent, label: "Body Fat %", key: "bodyFat" },
    { icon: Activity, label: "Activity Level", key: "activity" },
  ];

  return (
    <AppLayout>
      {loading ? (
        <div className="animate-pulse space-y-4">
          <div className="flex items-center justify-between">
            <div className="h-7 w-24 rounded-lg bg-secondary" />
            <div className="h-8 w-16 rounded-lg bg-secondary" />
          </div>
          <div className="glass-card flex items-center gap-5 p-5">
            <div className="h-20 w-20 rounded-full bg-secondary" />
            <div className="flex-1 space-y-2">
              <div className="h-5 w-32 rounded bg-secondary" />
              <div className="h-3 w-48 rounded bg-secondary" />
              <div className="h-3 w-40 rounded bg-secondary" />
            </div>
          </div>
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg bg-secondary px-4 py-3">
                <div className="h-4 w-20 rounded bg-muted" />
                <div className="h-4 w-16 rounded bg-muted" />
              </div>
            ))}
          </div>
        </div>
      ) : (
      <>
      <div className="mb-6 flex items-center justify-between animate-in fade-in slide-in-from-top-2 duration-500">
        <h1 className="text-2xl font-bold text-primary lg:text-foreground">Profile</h1>
        <button
          onClick={() => editing ? handleCancel() : setEditing(true)}
          className="flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <Edit3 size={14} />
          {editing ? "Cancel" : "Edit"}
        </button>
      </div>

      <div className="lg:grid lg:grid-cols-2 lg:gap-6 animate-in fade-in slide-in-from-bottom-3 duration-500 delay-100 fill-backwards">
        {/* Left column */}
        <div>
          {/* Profile Card */}
          <div className="glass-card mb-6 flex items-center gap-5 p-5">
            <div className="relative shrink-0">
              <div
                className={`flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-secondary ${editing ? "cursor-pointer ring-2 ring-primary/30" : ""}`}
                onClick={() => editing && fileInputRef.current?.click()}
              >
                {(editing ? form.profilePicture : profile.profilePicture) ? (
                  <img src={editing ? form.profilePicture : profile.profilePicture} alt="Profile" className="h-full w-full object-cover" />
                ) : (
                  <UserRound size={40} className="text-primary" />
                )}
              </div>
              {editing && (
                <button
                  type="button"
                  title="Change profile picture"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg"
                >
                  <Camera size={14} />
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleProfilePicChange}
              />
            </div>
            <div className="min-w-0 flex-1">
              {editing ? (
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="mb-0.5 w-full bg-transparent text-lg font-bold text-foreground outline-none border-b border-primary/30"
                  placeholder="Your name"
                />
              ) : (
                <h2 className="text-lg font-bold text-foreground">{profile.name}</h2>
              )}
              <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {profile.goal} · {profile.activity}
              </p>
            </div>
          </div>

          {/* Appearance (mobile) */}
          <div className="mb-6 lg:hidden">
            <ThemeToggle />
          </div>

          {/* Account Settings */}
          <AccountSettings userEmail={user?.email || ""} />

          {/* Body Stats */}
          <div className="mb-6">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Body Stats
              </h3>
              <button
                title="Toggle unit system"
                onClick={() => setUnitSystem(unitSystem === "metric" ? "imperial" : "metric")}
                className="flex items-center gap-1.5 rounded-md bg-secondary px-2.5 py-1 text-[10px] font-semibold text-muted-foreground transition-colors hover:text-foreground"
              >
                {unitSystem === "metric" ? "Metric" : "Imperial"}
              </button>
            </div>
            <div className="glass-card divide-y divide-border">
              {bodyStats.map(({ icon: Icon, label, key }) => {
                const rawValue = (form as any)[key] ?? "";
                const displayVal = getDisplayValue(key, String(rawValue));
                const unit = getUnitLabel(key);
                const error = validationErrors[key];
                return (
                  <div key={key}>
                    <div className="flex items-center justify-between px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Icon size={16} className="text-muted-foreground" />
                        <span className="text-sm text-foreground">{label}</span>
                      </div>
                      {editing ? (
                        key === "gender" ? (
                          <select
                            value={form.gender}
                            onChange={(e) => setForm({ ...form, gender: e.target.value })}
                            className="rounded bg-secondary px-2 py-1 text-sm font-semibold text-foreground outline-none"
                          >
                            {genderOptions.map((g) => <option key={g} value={g}>{g}</option>)}
                          </select>
                        ) : key === "activity" ? (
                          <select
                            value={form.activity}
                            onChange={(e) => setForm({ ...form, activity: e.target.value })}
                            className="rounded bg-secondary px-2 py-1 text-sm font-semibold text-foreground outline-none"
                          >
                            {activityOptions.map((a) => <option key={a} value={a}>{a}</option>)}
                          </select>
                        ) : key === "height" && unitSystem === "imperial" ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              value={heightFt}
                              onChange={(e) => handleImperialHeight(e.target.value, heightIn)}
                              className={`w-12 rounded bg-secondary px-1.5 py-1 text-right text-sm font-semibold text-foreground outline-none ${error ? "ring-1 ring-destructive" : ""}`}
                            />
                            <span className="text-xs text-muted-foreground">ft</span>
                            <input
                              type="number"
                              value={heightIn}
                              onChange={(e) => handleImperialHeight(heightFt, e.target.value)}
                              className={`w-12 rounded bg-secondary px-1.5 py-1 text-right text-sm font-semibold text-foreground outline-none ${error ? "ring-1 ring-destructive" : ""}`}
                            />
                            <span className="text-xs text-muted-foreground">in</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              placeholder={key === "bodyFat" ? "Optional" : ""}
                              value={displayVal === "0" && key === "bodyFat" ? "" : displayVal}
                              onChange={(e) => handleFieldChange(key, e.target.value)}
                              className={`w-24 rounded bg-secondary px-2 py-1 text-right text-sm font-semibold text-foreground outline-none ${error ? "ring-1 ring-destructive" : ""}`}
                            />
                            {unit && <span className="text-xs text-muted-foreground">{unit}</span>}
                          </div>
                        )
                      ) : (
                        <span className="text-sm font-semibold text-foreground">
                          {displayVal}{unit ? <span className="ml-1 text-xs font-normal text-muted-foreground">{unit}</span> : null}
                        </span>
                      )}
                    </div>
                    {editing && error && (
                      <div className="flex items-center gap-1.5 px-4 pb-2 text-[11px] text-destructive">
                        <AlertTriangle size={12} />
                        {error}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right column */}
        <div>
          {/* Goals & Targets */}
          <div className="mb-6">
            <h3 className="mb-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Goals & Targets
            </h3>
            <div className="glass-card divide-y divide-border">
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  <Target size={16} className="text-muted-foreground" />
                  <span className="text-sm text-foreground">Fitness Goal</span>
                </div>
                {editing ? (
                  <select
                    value={form.goal}
                    onChange={(e) => setForm({ ...form, goal: e.target.value })}
                    className="rounded bg-secondary px-2 py-1 text-sm font-semibold text-foreground outline-none"
                  >
                    {goalOptions.map((g) => <option key={g} value={g}>{g}</option>)}
                  </select>
                ) : (
                  <span className="text-sm font-semibold text-foreground">{profile.goal}</span>
                )}
              </div>
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  <Flame size={16} className="text-muted-foreground" />
                  <span className="text-sm text-foreground">Calorie Target</span>
                </div>
                {editing ? (
                  manualMacros ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        value={form.calorieTarget}
                        onChange={(e) => setForm({ ...form, calorieTarget: Number(e.target.value) || 0 })}
                        className="w-20 rounded bg-secondary px-2 py-1 text-right text-sm font-semibold text-foreground outline-none"
                      />
                      <span className="text-xs text-muted-foreground">kcal</span>
                    </div>
                  ) : (
                    <span className="text-sm font-semibold text-primary">{form.calorieTarget} kcal <span className="text-[10px] text-muted-foreground">(auto)</span></span>
                  )
                ) : (
                  <span className="text-sm font-semibold text-foreground">{profile.calorieTarget} kcal</span>
                )}
              </div>
              {/* Manual Override Toggle */}
              {editing && (
                <div className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Edit3 size={16} className="text-muted-foreground" />
                    <span className="text-sm text-foreground">Manual Override</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setManualMacros(!manualMacros)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      manualMacros ? "bg-primary" : "bg-secondary"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-foreground transition-transform ${
                        manualMacros ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
              )}

              {/* Target Weight (visible for Cut/Bulk goals) */}
              {(() => {
                const g = (editing ? form.goal : profile.goal).toLowerCase();
                const showTarget = g === "cut" || g.includes("bulk");
                if (!showTarget) return null;
                return (
                  <>
                    <div className="flex items-center justify-between px-4 py-3">
                      <div className="flex items-center gap-3">
                        {g === "cut" ? <TrendingDown size={16} className="text-muted-foreground" /> : <TrendingUp size={16} className="text-muted-foreground" />}
                        <span className="text-sm text-foreground">Target Weight</span>
                      </div>
                      {editing ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            placeholder="e.g. 70"
                            value={form.targetWeight ?? ""}
                            onChange={(e) => setForm({ ...form, targetWeight: e.target.value === "" ? undefined : Number(e.target.value) })}
                            className="w-20 rounded bg-secondary px-2 py-1 text-right text-sm font-semibold text-foreground outline-none"
                          />
                          <span className="text-xs text-muted-foreground">{unitSystem === "imperial" ? "lbs" : "kg"}</span>
                        </div>
                      ) : (
                        <span className="text-sm font-semibold text-foreground">
                          {profile.targetWeight ? `${profile.targetWeight} ${unitSystem === "imperial" ? "lbs" : "kg"}` : "—"}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Activity size={16} className="text-muted-foreground" />
                        <span className="text-sm text-foreground">Weekly Change</span>
                      </div>
                      {editing ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            step="0.1"
                            placeholder={g === "lean bulk" ? "0.25" : "0.5"}
                            value={form.weeklyWeightChange ?? ""}
                            onChange={(e) => setForm({ ...form, weeklyWeightChange: e.target.value === "" ? undefined : Number(e.target.value) })}
                            className="w-20 rounded bg-secondary px-2 py-1 text-right text-sm font-semibold text-foreground outline-none"
                          />
                          <span className="text-xs text-muted-foreground">kg/wk</span>
                        </div>
                      ) : (
                        <span className="text-sm font-semibold text-foreground">
                          {profile.weeklyWeightChange ? `${profile.weeklyWeightChange} kg/wk` : `${g === "lean bulk" ? "0.25" : "0.5"} kg/wk`}
                        </span>
                      )}
                    </div>
                  </>
                );
              })()}
            </div>
          </div>

          {/* BMI */}
          {bmiInfo && (
            <div className="mb-6">
              <h3 className="mb-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Body Mass Index
              </h3>
              <div className="glass-card flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  <Activity size={16} className="text-muted-foreground" />
                  <span className="text-sm text-foreground">BMI</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-semibold text-foreground">{bmiInfo.bmi}</span>
                  <span className={`ml-2 text-xs ${bmiInfo.category === "Normal" ? "text-primary" : bmiInfo.category === "Underweight" ? "text-amber-400" : "text-destructive"}`}>
                    {bmiInfo.category}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Macro Targets (computed or manual) */}
          <div className="mb-6">
            <h3 className="mb-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Macro Targets
            </h3>
            <div className="glass-card p-4">
              {(() => {
                const p = editing ? (form.macroTargets?.protein ?? macroTargets.protein) : macroTargets.protein;
                const c = editing ? (form.macroTargets?.carbs ?? macroTargets.carbs) : macroTargets.carbs;
                const f = editing ? (form.macroTargets?.fats ?? macroTargets.fats) : macroTargets.fats;
                const totalCal = p * 4 + c * 4 + f * 9;
                const pPct = totalCal > 0 ? Math.round((p * 4 / totalCal) * 100) : 33;
                const cPct = totalCal > 0 ? Math.round((c * 4 / totalCal) * 100) : 34;
                const fPct = totalCal > 0 ? Math.round((f * 9 / totalCal) * 100) : 33;
                return (
                  <>
                    <div className="mb-3 flex h-4 overflow-hidden rounded-full">
                      <div className="bg-nblue transition-all" style={{ width: `${pPct}%` }} />
                      <div className="bg-emerald transition-all" style={{ width: `${cPct}%` }} />
                      <div className="bg-npink transition-all" style={{ width: `${fPct}%` }} />
                    </div>
                    {editing && manualMacros ? (
                      <div className="grid grid-cols-3 gap-3 text-center text-xs">
                        <div>
                          <label className="mb-1 flex items-center justify-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-nblue" />
                            <span className="text-muted-foreground">Protein</span>
                          </label>
                          <input
                            type="number"
                            value={form.macroTargets?.protein ?? p}
                            onChange={(e) => setForm({ ...form, macroTargets: { ...(form.macroTargets || macroTargets), protein: Number(e.target.value) || 0 } })}
                            className="w-full rounded bg-secondary px-2 py-1 text-center text-sm font-semibold text-foreground outline-none"
                          />
                          <span className="text-[10px] text-muted-foreground">g</span>
                        </div>
                        <div>
                          <label className="mb-1 flex items-center justify-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-emerald" />
                            <span className="text-muted-foreground">Carbs</span>
                          </label>
                          <input
                            type="number"
                            value={form.macroTargets?.carbs ?? c}
                            onChange={(e) => setForm({ ...form, macroTargets: { ...(form.macroTargets || macroTargets), carbs: Number(e.target.value) || 0 } })}
                            className="w-full rounded bg-secondary px-2 py-1 text-center text-sm font-semibold text-foreground outline-none"
                          />
                          <span className="text-[10px] text-muted-foreground">g</span>
                        </div>
                        <div>
                          <label className="mb-1 flex items-center justify-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-npink" />
                            <span className="text-muted-foreground">Fat</span>
                          </label>
                          <input
                            type="number"
                            value={form.macroTargets?.fats ?? f}
                            onChange={(e) => setForm({ ...form, macroTargets: { ...(form.macroTargets || macroTargets), fats: Number(e.target.value) || 0 } })}
                            className="w-full rounded bg-secondary px-2 py-1 text-center text-sm font-semibold text-foreground outline-none"
                          />
                          <span className="text-[10px] text-muted-foreground">g</span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-6 text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full bg-nblue" />
                          <span className="text-muted-foreground">Protein {p}g</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full bg-emerald" />
                          <span className="text-muted-foreground">Carbs {c}g</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full bg-npink" />
                          <span className="text-muted-foreground">Fat {f}g</span>
                        </div>
                      </div>
                    )}
                    {editing && !manualMacros && (
                      <p className="mt-2 text-center text-[10px] text-muted-foreground">
                        Auto-calculated: {p}g\u00d74 + {c}g\u00d74 + {f}g\u00d79 = {totalCal} kcal
                      </p>
                    )}
                  </>
                );
              })()}
            </div>
          </div>

          {editing && (
            <button
              onClick={handleSave}
              disabled={hasValidationErrors}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Check size={16} />
              Save Changes
            </button>
          )}
        </div>
      </div>

      {/* Mobile Sign-Out */}
      <div className="mt-8 lg:hidden">
        <button
          onClick={handleLogout}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-destructive/30 py-3 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/10"
        >
          <LogOut size={16} />
          Sign Out
        </button>
      </div>

      {/* Delete Account */}
      <DeleteAccountSection />
      </>
      )}
    </AppLayout>
  );
};

// ── Account Settings (Change Email & Password) ─────────────
const AccountSettings: React.FC<{ userEmail: string }> = ({ userEmail }) => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  // Change Email state
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [emailPassword, setEmailPassword] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);

  // Change Password state
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  const handleChangeEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailLoading(true);
    try {
      const res = await authApi.changeEmail({ newEmail, password: emailPassword });
      toast.success(res.message);
      setShowEmailForm(false);
      setNewEmail("");
      setEmailPassword("");
      // Email changed & unverified — log user out so they must re-verify
      await logout();
      navigate("/login");
    } catch (err: any) {
      toast.error(err.message || "Failed to change email");
    } finally {
      setEmailLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmNewPassword) {
      toast.error("New passwords do not match");
      return;
    }
    setPasswordLoading(true);
    try {
      const res = await authApi.changePassword({ currentPassword, newPassword });
      toast.success(res.message);
      setShowPasswordForm(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    } catch (err: any) {
      toast.error(err.message || "Failed to change password");
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="mb-6">
      <h3 className="mb-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        Account Settings
      </h3>
      <div className="glass-card divide-y divide-border">
        {/* Change Email */}
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Mail size={16} className="text-muted-foreground" />
              <div>
                <span className="text-sm text-foreground">Email</span>
                <p className="text-xs text-muted-foreground">{userEmail}</p>
              </div>
            </div>
            <button
              onClick={() => { setShowEmailForm(!showEmailForm); setShowPasswordForm(false); }}
              className="text-xs font-medium text-primary hover:underline"
            >
              {showEmailForm ? "Cancel" : "Change"}
            </button>
          </div>
          {showEmailForm && (
            <form onSubmit={handleChangeEmail} className="mt-3 flex flex-col gap-2.5">
              <input
                type="email"
                placeholder="New email address"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                required
                className="w-full rounded-lg bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30"
              />
              <input
                type="password"
                placeholder="Confirm your password"
                value={emailPassword}
                onChange={(e) => setEmailPassword(e.target.value)}
                required
                className="w-full rounded-lg bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30"
              />
              <p className="text-[11px] text-muted-foreground">
                You'll need to verify the new email address. You will be signed out.
              </p>
              <button
                type="submit"
                disabled={emailLoading}
                className="flex items-center justify-center gap-2 rounded-lg bg-primary py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                {emailLoading && <Loader2 size={14} className="animate-spin" />}
                Update Email
              </button>
            </form>
          )}
        </div>

        {/* Change Password */}
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Lock size={16} className="text-muted-foreground" />
              <div>
                <span className="text-sm text-foreground">Password</span>
                <p className="text-xs text-muted-foreground">••••••••</p>
              </div>
            </div>
            <button
              onClick={() => { setShowPasswordForm(!showPasswordForm); setShowEmailForm(false); }}
              className="text-xs font-medium text-primary hover:underline"
            >
              {showPasswordForm ? "Cancel" : "Change"}
            </button>
          </div>
          {showPasswordForm && (
            <form onSubmit={handleChangePassword} className="mt-3 flex flex-col gap-2.5">
              <div className="relative">
                <input
                  type={showCurrent ? "text" : "password"}
                  placeholder="Current password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  className="w-full rounded-lg bg-secondary px-3 py-2 pr-10 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30"
                />
                <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showCurrent ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              <div className="relative">
                <input
                  type={showNew ? "text" : "password"}
                  placeholder="New password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full rounded-lg bg-secondary px-3 py-2 pr-10 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30"
                />
                <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showNew ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              <input
                type="password"
                placeholder="Confirm new password"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                required
                minLength={6}
                className="w-full rounded-lg bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30"
              />
              <button
                type="submit"
                disabled={passwordLoading}
                className="flex items-center justify-center gap-2 rounded-lg bg-primary py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                {passwordLoading && <Loader2 size={14} className="animate-spin" />}
                Update Password
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Delete Account Section ─────────────────────────────────
const DeleteAccountSection: React.FC = () => {
  const { logout, isGuest } = useAuth();
  const navigate = useNavigate();
  const [confirmStep, setConfirmStep] = useState(0); // 0=hidden, 1=first confirm, 2=type-confirm
  const [confirmText, setConfirmText] = useState("");
  const [delLoading, setDelLoading] = useState(false);

  const handleDelete = async () => {
    if (isGuest) {
      // Guest: clear all local data
      Object.keys(localStorage).forEach((k) => { if (k.startsWith("nv_guest_") || k === "nv_guest_mode") localStorage.removeItem(k); });
      await logout();
      navigate("/login");
      return;
    }
    setDelLoading(true);
    try {
      await authApi.deleteAccount();
      toast.success("Account deleted successfully");
      await logout();
      navigate("/login");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete account");
    } finally {
      setDelLoading(false);
    }
  };

  return (
    <div className="mt-6 mb-8">
      <h3 className="mb-3 text-[10px] font-bold uppercase tracking-widest text-destructive">
        Danger Zone
      </h3>
      <div className="glass-card border border-destructive/20 p-4">
        {confirmStep === 0 && (
          <button
            onClick={() => setConfirmStep(1)}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-destructive/30 py-2.5 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/10"
          >
            <Trash2 size={16} />
            Delete Account
          </button>
        )}
        {confirmStep === 1 && (
          <div className="space-y-3">
            <div className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3">
              <AlertTriangle size={16} className="mt-0.5 shrink-0 text-destructive" />
              <p className="text-xs text-destructive">
                This will permanently delete your account and <strong>all</strong> your data (meals, weight logs, supplements, profile). This action cannot be undone.
              </p>
            </div>
            {isGuest ? (
              <div className="flex gap-2">
                <button onClick={() => setConfirmStep(0)} className="flex-1 rounded-lg bg-secondary py-2 text-xs font-medium text-muted-foreground">
                  Cancel
                </button>
                <button onClick={handleDelete} className="flex-1 rounded-lg bg-destructive py-2 text-xs font-semibold text-destructive-foreground">
                  Yes, Clear All Data
                </button>
              </div>
            ) : (
              <>
                <p className="text-xs text-muted-foreground">
                  Type <strong className="text-foreground">DELETE</strong> to confirm:
                </p>
                <input
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="DELETE"
                  className="w-full rounded-lg bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-destructive/30"
                />
                <div className="flex gap-2">
                  <button onClick={() => { setConfirmStep(0); setConfirmText(""); }} className="flex-1 rounded-lg bg-secondary py-2 text-xs font-medium text-muted-foreground">
                    Cancel
                  </button>
                  <button
                    disabled={confirmText !== "DELETE" || delLoading}
                    onClick={handleDelete}
                    className="flex-1 rounded-lg bg-destructive py-2 text-xs font-semibold text-destructive-foreground disabled:opacity-50"
                  >
                    {delLoading ? <Loader2 size={14} className="mx-auto animate-spin" /> : "Permanently Delete"}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ── Theme Toggle (Mobile) ──────────────────────────────────
const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  return (
    <div className="rounded-2xl bg-card p-4 shadow-sm border border-border">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {theme === "dark" ? <Moon size={18} className="text-primary" /> : <Sun size={18} className="text-primary" />}
          <div>
            <p className="text-sm font-semibold text-foreground">Appearance</p>
            <p className="text-xs text-muted-foreground">{theme === "dark" ? "Dark" : "Light"} mode</p>
          </div>
        </div>
        <button
          onClick={toggleTheme}
          className="rounded-lg bg-secondary px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-secondary/80"
        >
          {theme === "dark" ? "Light" : "Dark"}
        </button>
      </div>
    </div>
  );
};

export default Profile;
