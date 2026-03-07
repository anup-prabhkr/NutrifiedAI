import React, { useState, useMemo, useCallback, useEffect } from "react";
import { RefreshCw, CalendarDays, ChevronLeft, ChevronRight, Zap, X, Plus, Minus, Settings, GlassWater, Star } from "lucide-react";
import ProgressRing from "@/components/ProgressRing";
import NutrientBar from "@/components/NutrientBar";
import MealItem from "@/components/MealItem";
import AddMealDialog from "@/components/AddMealDialog";
import AppLayout from "@/components/AppLayout";
import { useNutritionStore } from "@/hooks/useNutritionStore";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";

export interface RecurringMeal {
  id: string;
  mealName: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
}

const RECURRING_KEY = "nv_recurring_meals";

function loadRecurringMeals(): RecurringMeal[] {
  try {
    return JSON.parse(localStorage.getItem(RECURRING_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveRecurringMeals(meals: RecurringMeal[]) {
  localStorage.setItem(RECURRING_KEY, JSON.stringify(meals));
}

const Index: React.FC = () => {
  const { selectedDateMeals, totals, profile, macroTargets, addMeal, deleteMeal, updateMeal, selectedDate, setSelectedDate, today, loading, todayWater, addWater, waterCupSize, setWaterCupSize } = useNutritionStore();
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [recurringMeals, setRecurringMeals] = useState<RecurringMeal[]>(loadRecurringMeals);
  const [showRecurringManager, setShowRecurringManager] = useState(false);
  const [showWaterSettings, setShowWaterSettings] = useState(false);
  const [cupSizeInput, setCupSizeInput] = useState(String(waterCupSize));

  const handleSaveRecurring = useCallback((meal: { name: string; calories: number; protein: number; carbs: number; fats: number }) => {
    setRecurringMeals((prev) => {
      if (prev.some((m) => m.mealName.toLowerCase() === meal.name.toLowerCase())) {
        toast.info(`"${meal.name}" is already in quick add`);
        return prev;
      }
      const newMeal: RecurringMeal = {
        id: Date.now().toString(),
        mealName: meal.name,
        calories: meal.calories,
        protein: meal.protein,
        carbs: meal.carbs,
        fats: meal.fats,
      };
      const updated = [...prev, newMeal];
      saveRecurringMeals(updated);
      toast.success(`"${meal.name}" saved to Quick Add`);
      return updated;
    });
  }, []);

  const handleRemoveRecurring = useCallback((id: string) => {
    setRecurringMeals((prev) => {
      const updated = prev.filter((m) => m.id !== id);
      saveRecurringMeals(updated);
      return updated;
    });
  }, []);

  const handleQuickAdd = useCallback((meal: RecurringMeal) => {
    addMeal({
      mealName: meal.mealName,
      calories: meal.calories,
      protein: meal.protein,
      carbs: meal.carbs,
      fats: meal.fats,
      source: "manual",
    });
    toast.success(`"${meal.mealName}" added`);
  }, [addMeal]);

  const remaining = profile.calorieTarget - totals.calories;
  const percent = Math.round((totals.calories / profile.calorieTarget) * 100);

  // Generate week days centered around selected date
  const weekDays = useMemo(() => {
    const selected = new Date(selectedDate + "T12:00:00");
    const days: { date: string; dayName: string; dayNum: number; isToday: boolean; isSelected: boolean }[] = [];
    
    // Get start of week (Sunday) for the selected date
    const startOfWeek = new Date(selected);
    startOfWeek.setDate(selected.getDate() - selected.getDay());
    
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      const dateStr = d.toISOString().split("T")[0];
      days.push({
        date: dateStr,
        dayName: d.toLocaleDateString("en-US", { weekday: "short" }),
        dayNum: d.getDate(),
        isToday: dateStr === today,
        isSelected: dateStr === selectedDate,
      });
    }
    return days;
  }, [selectedDate, today]);

  const navigateWeek = (direction: number) => {
    const current = new Date(selectedDate + "T12:00:00");
    current.setDate(current.getDate() + direction * 7);
    setSelectedDate(current.toISOString().split("T")[0]);
  };

  const formatDateDisplay = (dateStr: string) => {
    if (dateStr === today) return "Today";
    const d = new Date(dateStr + "T12:00:00");
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (dateStr === yesterday.toISOString().split("T")[0]) return "Yesterday";
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  return (
    <AppLayout>
      {loading ? (
        <div className="animate-pulse space-y-4">
          <div className="flex items-center justify-between">
            <div className="h-6 w-32 rounded-lg bg-secondary" />
            <div className="h-8 w-8 rounded-lg bg-secondary" />
          </div>
          <div className="flex gap-2">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="h-16 flex-1 rounded-xl bg-secondary" />
            ))}
          </div>
          <div className="flex flex-col items-center gap-4 py-6">
            <div className="h-40 w-40 rounded-full bg-secondary" />
            <div className="h-4 w-48 rounded bg-secondary" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 rounded-xl bg-secondary" />
            ))}
          </div>
          <div className="space-y-3 pt-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 rounded-xl bg-secondary" />
            ))}
          </div>
        </div>
      ) : (
      <>
      {/* Header */}
      <div className="mb-4 flex items-center justify-between animate-in fade-in slide-in-from-top-2 duration-500">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-xs font-medium text-primary">{formatDateDisplay(selectedDate)}</p>
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <button
                  title="Pick a date"
                  className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                >
                  <CalendarDays size={14} />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={new Date(selectedDate + "T12:00:00")}
                  onSelect={(date) => {
                    if (date) {
                      setSelectedDate(date.toISOString().split("T")[0]);
                      setCalendarOpen(false);
                    }
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          <h1 className="text-2xl font-bold text-foreground">NutrifiedAI</h1>
        </div>
        <button
          aria-label="Refresh"
          onClick={() => window.location.reload()}
          className="rounded-full bg-secondary p-2.5 text-muted-foreground transition-all hover:text-foreground hover:rotate-180 duration-500"
        >
          <RefreshCw size={18} />
        </button>
      </div>

      {/* Week Day Selector */}
      <div className="mb-4 flex items-center gap-1 animate-in fade-in slide-in-from-top-2 duration-500 delay-75 fill-backwards">
        <button
          title="Previous week"
          onClick={() => navigateWeek(-1)}
          className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <ChevronLeft size={18} />
        </button>
        <div className="flex flex-1 justify-between gap-1">
          {weekDays.map((day) => (
            <button
              key={day.date}
              onClick={() => setSelectedDate(day.date)}
              className={`flex flex-1 flex-col items-center rounded-xl py-2 transition-all ${
                day.isSelected
                  ? "bg-primary text-primary-foreground"
                  : day.isToday
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:bg-secondary/50"
              }`}
            >
              <span className="text-[10px] font-medium">{day.dayName}</span>
              <span className={`text-sm font-bold ${day.isSelected ? "" : day.isToday ? "text-primary" : ""}`}>
                {day.dayNum}
              </span>
            </button>
          ))}
        </div>
        <button
          title="Next week"
          onClick={() => navigateWeek(1)}
          className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Desktop: 2-column layout */}
      <div className="lg:grid lg:grid-cols-2 lg:gap-6">
        {/* Left column */}
        <div>
          {/* Calorie Ring */}
          <div className="glass-card mb-4 flex flex-col items-center py-6 animate-in fade-in zoom-in-95 duration-500 delay-100 fill-backwards">
            <ProgressRing
              value={totals.calories}
              max={profile.calorieTarget}
              size={160}
              strokeWidth={12}
              color="emerald"
              unit="kcal"
            />
            <p className="mt-3 text-sm text-muted-foreground">
              {remaining >= 0 ? (
                <><span className="font-semibold text-foreground">{remaining}</span> kcal remaining</>
              ) : (
                <><span className="font-semibold text-destructive">{Math.abs(remaining)}</span> kcal over</>
              )}
            </p>
            <p className={`text-xs ${percent > 100 ? "font-medium text-destructive" : "text-muted-foreground"}`}>{percent}% of daily goal</p>
          </div>

          {/* Macro Rings */}
          <div className="glass-card mb-4 flex items-center justify-around py-5 animate-in fade-in slide-in-from-bottom-3 duration-500 delay-200 fill-backwards">
            <div className="flex flex-col items-center">
              <ProgressRing value={totals.protein} max={macroTargets.protein} size={80} strokeWidth={8} color="blue" unit="g" />
              <span className="mt-2 text-xs text-muted-foreground">Protein</span>
              <span className="text-[10px] text-muted-foreground">{totals.protein}/{macroTargets.protein}g</span>
            </div>
            <div className="flex flex-col items-center">
              <ProgressRing value={totals.carbs} max={macroTargets.carbs} size={80} strokeWidth={8} color="emerald" unit="g" />
              <span className="mt-2 text-xs text-muted-foreground">Carbs</span>
              <span className="text-[10px] text-muted-foreground">{totals.carbs}/{macroTargets.carbs}g</span>
            </div>
            <div className="flex flex-col items-center">
              <ProgressRing value={totals.fats} max={macroTargets.fats} size={80} strokeWidth={8} color="pink" unit="g" />
              <span className="mt-2 text-xs text-muted-foreground">Fat</span>
              <span className="text-[10px] text-muted-foreground">{totals.fats}/{macroTargets.fats}g</span>
            </div>
          </div>

          {/* Sugar & Fiber */}
          <div className="mb-4 grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-bottom-3 duration-500 delay-300 fill-backwards">
            <NutrientBar label="Sugar" value={Math.round(totals.carbs * 0.3)} max={50} color="emerald" />
            <NutrientBar label="Fiber" value={Math.round(totals.carbs * 0.15)} max={30} color="emerald" />
          </div>

          {/* Water Tracker */}
          <div className="glass-card mb-4 p-4 animate-in fade-in slide-in-from-bottom-3 duration-500 fill-backwards" style={{ animationDelay: '350ms' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/15">
                  <GlassWater size={24} className="text-blue-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Water</p>
                  <p className="text-xs text-muted-foreground">{todayWater} ml</p>
                </div>
                <button
                  title="Water settings"
                  onClick={() => setShowWaterSettings(!showWaterSettings)}
                  className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Settings size={14} />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => addWater(-waterCupSize)}
                  className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-border text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
                >
                  <Minus size={18} />
                </button>
                <button
                  onClick={() => addWater(waterCupSize)}
                  className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-foreground text-foreground transition-colors hover:border-primary hover:bg-primary/10"
                >
                  <Plus size={18} />
                </button>
              </div>
            </div>
            {showWaterSettings && (
              <div className="mt-3 flex items-center gap-2 rounded-lg bg-secondary p-2">
                <span className="text-xs text-muted-foreground">Cup size:</span>
                <input
                  type="number"
                  value={cupSizeInput}
                  onChange={(e) => setCupSizeInput(e.target.value)}
                  onBlur={() => { const v = parseInt(cupSizeInput); if (v > 0) setWaterCupSize(v); }}
                  onKeyDown={(e) => { if (e.key === "Enter") { const v = parseInt(cupSizeInput); if (v > 0) { setWaterCupSize(v); setShowWaterSettings(false); } } }}
                  className="w-20 rounded bg-muted px-2 py-1 text-xs text-foreground outline-none"
                />
                <span className="text-xs text-muted-foreground">ml</span>
              </div>
            )}
          </div>
        </div>

        {/* Right column */}
        <div>
          {/* Today's Meals */}
          <div className="mb-4 animate-in fade-in slide-in-from-bottom-3 duration-500 fill-backwards" style={{ animationDelay: '400ms' }}>
            <h2 className="mb-3 text-lg font-bold text-primary">
              {selectedDate === today ? "Today's Meals" : `${formatDateDisplay(selectedDate)}'s Meals`}
            </h2>

            {/* Quick Add (Recurring Meals) */}
            <div className="mb-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                  <Zap size={12} className="text-primary" /> Quick Add
                </span>
                {recurringMeals.length > 0 && (
                  <button
                    onClick={() => setShowRecurringManager(!showRecurringManager)}
                    className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showRecurringManager ? "Done" : "Edit"}
                  </button>
                )}
              </div>
              {recurringMeals.length === 0 ? (
                <p className="rounded-lg bg-secondary/50 px-3 py-3 text-center text-xs text-muted-foreground">
                  No quick meals yet. Tap the <span className="inline-flex align-text-bottom"><Star size={12} className="text-yellow-500" /></span> button on any meal to save it here for quick logging.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {recurringMeals.map((meal) => (
                    <button
                      key={meal.id}
                      onClick={() => showRecurringManager ? handleRemoveRecurring(meal.id) : handleQuickAdd(meal)}
                      className={`group relative flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all active:scale-95 ${
                        showRecurringManager
                          ? "bg-destructive/10 text-destructive hover:bg-destructive/20"
                          : "bg-primary/10 text-primary hover:bg-primary/20"
                      }`}
                    >
                      {showRecurringManager ? (
                        <>
                          <X size={12} />
                          {meal.mealName}
                        </>
                      ) : (
                        <>
                          <Plus size={12} />
                          {meal.mealName}
                          <span className="text-[10px] opacity-60">{meal.calories}cal</span>
                        </>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {selectedDateMeals.length === 0 && (
              <p className="rounded-xl bg-secondary px-4 py-6 text-center text-sm text-muted-foreground">
                {selectedDate === today 
                  ? "No meals logged yet. Tap + to add your first meal!"
                  : "No meals logged for this day."}
              </p>
            )}
            <div className="flex flex-col gap-2">
              {selectedDateMeals.map((meal, i) => (
                <div key={meal.id} className="animate-in fade-in slide-in-from-left-3 duration-300 fill-backwards" style={{ animationDelay: `${450 + i * 60}ms` }}>
                  <MealItem {...meal} onDelete={deleteMeal} onUpdate={updateMeal} onSaveRecurring={handleSaveRecurring} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <AddMealDialog onAdd={addMeal} />
      </>
      )}
    </AppLayout>
  );
};

export default Index;
