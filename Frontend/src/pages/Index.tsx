import React, { useState, useMemo } from "react";
import { RefreshCw, CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import ProgressRing from "@/components/ProgressRing";
import NutrientBar from "@/components/NutrientBar";
import MealItem from "@/components/MealItem";
import AddMealDialog from "@/components/AddMealDialog";
import AppLayout from "@/components/AppLayout";
import { useNutritionStore } from "@/hooks/useNutritionStore";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const Index: React.FC = () => {
  const { selectedDateMeals, totals, profile, macroTargets, addMeal, deleteMeal, updateMeal, selectedDate, setSelectedDate, today } = useNutritionStore();
  const [calendarOpen, setCalendarOpen] = useState(false);

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
              <span className="font-semibold text-foreground">{Math.max(remaining, 0)}</span> kcal remaining
            </p>
            <p className="text-xs text-muted-foreground">{Math.min(percent, 100)}% of daily goal</p>
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
        </div>

        {/* Right column */}
        <div>
          {/* Today's Meals */}
          <div className="mb-4 animate-in fade-in slide-in-from-bottom-3 duration-500 delay-[400ms] fill-backwards">
            <h2 className="mb-3 text-lg font-bold text-primary">
              {selectedDate === today ? "Today's Meals" : `${formatDateDisplay(selectedDate)}'s Meals`}
            </h2>
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
                  <MealItem {...meal} onDelete={deleteMeal} onUpdate={updateMeal} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <AddMealDialog onAdd={addMeal} />
    </AppLayout>
  );
};

export default Index;
