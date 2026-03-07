import React, { useState, useEffect, useMemo } from "react";
import { TrendingUp, Plus, X, ChevronLeft, ChevronRight, Edit3, Check, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import { BarChart, Bar, XAxis, ResponsiveContainer, Cell, LineChart, Line, YAxis, Tooltip, CartesianGrid } from "recharts";
import AppLayout from "@/components/AppLayout";
import { useNutritionStore } from "@/hooks/useNutritionStore";
import { useAuth } from "@/contexts/AuthContext";
import { summaryApi, weightApi, type WeeklySummary } from "@/lib/api";

const Analytics: React.FC = () => {
  const { todayMeals, totals, weightLogs, supplements, profile, addWeightLog, deleteWeightLog, updateWeightLog, toggleSupplement, addSupplement, deleteSupplement, updateSupplement, loading } = useNutritionStore();
  const { isGuest } = useAuth();
  const [weightInput, setWeightInput] = useState("");
  const [weightDateInput, setWeightDateInput] = useState(new Date().toISOString().split("T")[0]);

  // Supplement add form
  const [showAddSup, setShowAddSup] = useState(false);
  const [newSupName, setNewSupName] = useState("");
  const [newSupType, setNewSupType] = useState<"yesno" | "measurable">("yesno");
  const [newSupUnit, setNewSupUnit] = useState("");

  // Supplement editing state
  const [editingSupId, setEditingSupId] = useState<string | null>(null);
  const [editingSupName, setEditingSupName] = useState("");
  const [confirmDeleteSup, setConfirmDeleteSup] = useState<string | null>(null);

  // Measurable input state
  const [measurableInputs, setMeasurableInputs] = useState<Record<string, string>>({});

  // Weight editing state
  const [editingWeightId, setEditingWeightId] = useState<string | null>(null);
  const [editingWeightValue, setEditingWeightValue] = useState("");

  // Weekly summary from API
  const [weeklySummary, setWeeklySummary] = useState<WeeklySummary | null>(null);

  // Weight chart range
  const [weightRange, setWeightRange] = useState<"week" | "month" | "year" | "all">("week");
  const [weightChartData, setWeightChartData] = useState<{ date: string; weight: number }[]>([]);

  // Supplement calendar view
  const [selectedSupplement, setSelectedSupplement] = useState<string | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const today = new Date().toISOString().split("T")[0];

  // ── Fetch weekly summary ──
  useEffect(() => {
    if (isGuest) return;
    summaryApi.getWeekly().then(setWeeklySummary).catch(console.error);
  }, [todayMeals.length, isGuest]);

  // ── Fetch weight chart data by range ──
  useEffect(() => {
    if (isGuest) {
      setWeightChartData(
        weightLogs
          .map((w) => ({
            date: new Date(w.date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }),
            weight: w.weight,
          }))
          .reverse()
      );
      return;
    }
    weightApi.getHistory(weightRange).then((data) => {
      setWeightChartData(
        data
          .map((w) => ({
            date: new Date(w.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
            weight: w.weight,
          }))
          .reverse()
      );
    }).catch(console.error);
  }, [weightRange, weightLogs, isGuest]);

  // ── Weekly bar chart data (empty when no meals logged) ──
  const weeklyData = useMemo(() => {
    if (!weeklySummary) {
      return ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => ({ day, calories: 0 }));
    }
    return weeklySummary.dailyBreakdown.map((d) => ({
      day: d.day,
      calories: d.calories,
    }));
  }, [weeklySummary]);

  const avgCalories = weeklySummary ? weeklySummary.averages.calories : 0;

  const handleAddWeight = () => {
    const w = parseFloat(weightInput);
    if (!isNaN(w) && w > 0) {
      addWeightLog(w, weightDateInput);
      setWeightInput("");
      setWeightDateInput(new Date().toISOString().split("T")[0]);
    }
  };

  const handleAddSupplement = () => {
    if (newSupName.trim()) {
      addSupplement(newSupName.trim(), newSupType, newSupType === "measurable" ? newSupUnit.trim() || "g" : undefined);
      setNewSupName("");
      setNewSupType("yesno");
      setNewSupUnit("");
      setShowAddSup(false);
    }
  };

  // Get current week Sun-Sat for supplement streak
  const last7Days = useMemo(() => {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0=Sun
    const days: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() - dayOfWeek + i);
      days.push(d.toISOString().split("T")[0]);
    }
    return days;
  }, []);

  // ── Calendar helper for supplement view ──
  const calendarDays = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days: (string | null)[] = [];
    for (let i = 0; i < (firstDay === 0 ? 6 : firstDay - 1); i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      days.push(dateStr);
    }
    return days;
  }, [calendarMonth]);

  const selectedSupData = supplements.find((s) => s.name === selectedSupplement);
  const selectedSupTotal = selectedSupData ? selectedSupData.takenDates.length : 0;

  // ── Target weight progress ──
  const currentWeight = parseFloat(profile.weight) || 0;
  const targetWeight = profile.targetWeight || 0;
  const goalLower = profile.goal.toLowerCase();
  const showWeightProgress = targetWeight > 0 && (goalLower === "cut" || goalLower.includes("bulk"));
  const weightProgressPct = showWeightProgress
    ? goalLower === "cut"
      ? currentWeight <= targetWeight ? 100 : Math.max(0, Math.round(((currentWeight - targetWeight) / currentWeight) * -100 + 100))
      : currentWeight >= targetWeight ? 100 : Math.max(0, Math.round((currentWeight / targetWeight) * 100))
    : 0;
  const weeklyChange = profile.weeklyWeightChange || 0.5;
  const weightDiff = Math.abs(currentWeight - targetWeight);
  const estimatedWeeks = weeklyChange > 0 ? Math.ceil(weightDiff / weeklyChange) : 0;
  const estimatedDate = useMemo(() => {
    if (!showWeightProgress || currentWeight === targetWeight || estimatedWeeks <= 0) return null;
    const d = new Date();
    d.setDate(d.getDate() + estimatedWeeks * 7);
    return d.toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" });
  }, [showWeightProgress, currentWeight, targetWeight, estimatedWeeks]);

  return (
    <AppLayout>
      <h1 className="mb-6 text-2xl font-bold text-primary lg:hidden animate-in fade-in slide-in-from-top-2 duration-500">Analytics</h1>
      <h1 className="mb-6 hidden text-2xl font-bold text-foreground lg:block animate-in fade-in slide-in-from-top-2 duration-500">Analytics & Insights</h1>
      {loading ? (
        <div className="animate-pulse lg:grid lg:grid-cols-2 lg:gap-6">
          <div className="space-y-4">
            <div className="glass-card h-48 rounded-2xl bg-secondary" />
            <div className="glass-card h-56 rounded-2xl bg-secondary" />
          </div>
          <div className="space-y-4 mt-4 lg:mt-0">
            <div className="glass-card h-40 rounded-2xl bg-secondary" />
            <div className="glass-card h-72 rounded-2xl bg-secondary" />
          </div>
        </div>
      ) : (
      <>
      {/* Extra bottom padding so content clears fixed bottom nav on mobile */}
      <style>{`@media (max-width: 1023px) { .analytics-wrap { padding-bottom: 2rem; } }`}</style>

      <div className="lg:grid lg:grid-cols-2 lg:gap-6 analytics-wrap animate-in fade-in slide-in-from-bottom-3 duration-500 delay-100 fill-backwards">
        {/* Left column */}
        <div>
          {/* Weekly Calories Chart */}
          <div className="glass-card mb-4 p-4">
            <h3 className="mb-4 text-sm font-semibold text-foreground">Weekly Calories</h3>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={weeklyData}>
                <XAxis
                  dataKey="day"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "hsl(215, 15%, 55%)", fontSize: 12 }}
                />
                <Bar dataKey="calories" radius={[6, 6, 0, 0]}>
                  {weeklyData.map((_, index) => (
                    <Cell key={index} fill="hsl(160, 67%, 50%)" />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Weekly Summary */}
          <div className="glass-card mb-4 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Weekly Summary</h3>
              <span className="flex items-center gap-1 text-xs text-primary">
                <TrendingUp size={14} /> {weeklySummary && weeklySummary.daysLogged > 0 ? `${weeklySummary.daysLogged} days logged` : "No data"}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl bg-secondary p-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Avg Calories</p>
                <p className="text-xl font-bold text-foreground">{weeklySummary && weeklySummary.daysLogged > 0 ? weeklySummary.averages.calories.toLocaleString() : "—"}</p>
              </div>
              <div className="rounded-xl bg-secondary p-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Total Cal</p>
                <p className="text-xl font-bold text-foreground">{weeklySummary && weeklySummary.daysLogged > 0 ? weeklySummary.totals.calories.toLocaleString() : "—"}</p>
              </div>
              <div className="rounded-xl bg-secondary p-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Protein</p>
                <p className="text-xl font-bold text-nblue">{weeklySummary && weeklySummary.daysLogged > 0 ? `${weeklySummary.totals.protein}g` : "—"}</p>
              </div>
              <div className="rounded-xl bg-secondary p-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Carbs</p>
                <p className="text-xl font-bold text-emerald">{weeklySummary && weeklySummary.daysLogged > 0 ? `${weeklySummary.totals.carbs}g` : "—"}</p>
              </div>
              <div className="rounded-xl bg-secondary p-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Fat</p>
                <p className="text-xl font-bold text-npink">{weeklySummary && weeklySummary.daysLogged > 0 ? `${weeklySummary.totals.fats}g` : "—"}</p>
              </div>
              <div className="rounded-xl bg-secondary p-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Fiber (est)</p>
                <p className="text-xl font-bold text-foreground">{weeklySummary && weeklySummary.daysLogged > 0 ? `${Math.round(weeklySummary.totals.carbs * 0.15)}g` : "—"}</p>
              </div>
            </div>
          </div>

          {/* Target Weight Progress */}
          {showWeightProgress && (
            <div className="glass-card mb-4 p-4">
              <h3 className="mb-2 text-sm font-semibold text-foreground">Weight Goal Progress</h3>
              <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                <span>{currentWeight} kg</span>
                <span>{targetWeight} kg</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500"
                  style={{ width: `${Math.min(weightProgressPct, 100)}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {currentWeight === targetWeight ? (
                  <span className="text-primary font-semibold">Goal reached!</span>
                ) : estimatedDate ? (
                  <>You will achieve your goal by <span className="font-semibold text-primary">{estimatedDate}</span></>
                ) : null}
              </p>
            </div>
          )}
        </div>

        {/* Right column — Supplements ABOVE Weight Tracker */}
        <div>
          {/* ═══ Supplement Streak (Redesigned) ═══ */}
          <div className="glass-card mb-4 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Supplement Streak</h3>
              <button
                title="Add supplement"
                onClick={() => setShowAddSup(!showAddSup)}
                className="rounded-lg bg-secondary p-1.5 text-muted-foreground transition-colors hover:text-foreground"
              >
                {showAddSup ? <X size={14} /> : <Plus size={14} />}
              </button>
            </div>

            {/* Add supplement form */}
            {showAddSup && (
              <div className="mb-3 space-y-2 rounded-lg bg-secondary p-3">
                <div className="flex gap-2">
                  <button
                    onClick={() => setNewSupType("yesno")}
                    className={`flex-1 rounded-lg py-1.5 text-xs font-medium transition-colors ${newSupType === "yesno" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
                  >
                    Yes / No
                  </button>
                  <button
                    onClick={() => setNewSupType("measurable")}
                    className={`flex-1 rounded-lg py-1.5 text-xs font-medium transition-colors ${newSupType === "measurable" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
                  >
                    Measurable
                  </button>
                </div>
                <input
                  placeholder="Supplement name"
                  value={newSupName}
                  onChange={(e) => setNewSupName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && newSupType === "yesno" && handleAddSupplement()}
                  className="w-full rounded-lg bg-muted px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground outline-none"
                />
                {newSupType === "measurable" && (
                  <input
                    placeholder="Unit (e.g. g, mg, ml)"
                    value={newSupUnit}
                    onChange={(e) => setNewSupUnit(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddSupplement()}
                    className="w-full rounded-lg bg-muted px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground outline-none"
                  />
                )}
                <button onClick={handleAddSupplement} className="w-full rounded-lg bg-primary py-2 text-xs font-semibold text-primary-foreground">
                  Add
                </button>
              </div>
            )}

            {/* Day + Date header and all rows share one scrollable container */}
            {supplements.length > 0 && (
              <div className="overflow-x-auto">
              <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold text-muted-foreground min-w-max">
                <span className="w-20 shrink-0" />
                {last7Days.map((date, i) => {
                  const d = new Date(date + "T12:00:00");
                  return (
                    <span key={i} className="flex w-10 shrink-0 flex-col items-center leading-tight">
                      <span className="uppercase">{d.toLocaleDateString("en-US", { weekday: "short" })}</span>
                      <span className="text-foreground text-xs">{d.getDate()}</span>
                    </span>
                  );
                })}
              </div>

            {/* Streak rows */}
            {supplements.map((sup) => (
              <div key={sup.name} className="mb-1.5 flex items-center gap-2 group min-w-max">
                {editingSupId === sup.name ? (
                  <div className="flex w-20 items-center gap-1">
                    <input
                      autoFocus
                      placeholder="Name"
                      value={editingSupName}
                      onChange={(e) => setEditingSupName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && editingSupName.trim()) {
                          updateSupplement(sup.name, editingSupName.trim());
                          setEditingSupId(null);
                        } else if (e.key === "Escape") {
                          setEditingSupId(null);
                        }
                      }}
                      className="w-full rounded bg-muted px-1 py-0.5 text-xs text-foreground outline-none"
                    />
                  </div>
                ) : (
                  <button
                    onClick={() => setSelectedSupplement(selectedSupplement === sup.name ? null : sup.name)}
                    className={`w-20 shrink-0 truncate text-xs text-left transition-colors ${selectedSupplement === sup.name ? "text-primary font-semibold" : "text-muted-foreground hover:text-foreground"}`}
                    title={`View calendar for ${sup.name}`}
                  >
                    {sup.name}
                  </button>
                )}
                {last7Days.map((date, j) => {
                  const taken = sup.takenDates.includes(date);
                  const isMeasurable = sup.type === "measurable";
                  const measuredVal = sup.measuredValues?.[date];
                  const inputKey = `${sup.name}-${date}`;

                  if (isMeasurable) {
                    return (
                      <span key={j} className="flex w-10 shrink-0 justify-center">
                        {taken ? (
                          <button
                            onClick={() => toggleSupplement(sup.name, date)}
                            className="flex h-6 w-8 items-center justify-center rounded border-2 border-primary bg-primary/10 text-[9px] font-semibold text-primary cursor-pointer"
                            title={`${measuredVal ?? 0} ${sup.unit || "g"} — click to remove`}
                          >
                            {measuredVal ?? 0}
                            <span className="text-[7px] ml-0.5 text-primary/60">{sup.unit || "g"}</span>
                          </button>
                        ) : (
                          <input
                            type="number"
                            placeholder="0"
                            value={measurableInputs[inputKey] || ""}
                            onChange={(e) => setMeasurableInputs((prev) => ({ ...prev, [inputKey]: e.target.value }))}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                const v = parseFloat(measurableInputs[inputKey] || "0");
                                if (v > 0) {
                                  toggleSupplement(sup.name, date, v);
                                  setMeasurableInputs((prev) => { const n = { ...prev }; delete n[inputKey]; return n; });
                                }
                              }
                            }}
                            className={`h-6 w-8 rounded border-2 border-muted-foreground/30 bg-transparent text-center text-[9px] text-foreground outline-none focus:border-primary/60 ${date === today ? "ring-1 ring-primary/30" : ""}`}
                          />
                        )}
                      </span>
                    );
                  }

                  // Yes/No type — squared box with check/X
                  return (
                    <span key={j} className="flex w-10 shrink-0 justify-center">
                      <button
                        onClick={() => toggleSupplement(sup.name, date)}
                        className={`h-6 w-6 rounded border-2 flex items-center justify-center text-[10px] transition-colors cursor-pointer ${
                          taken
                            ? "bg-primary border-primary text-primary-foreground"
                            : "border-muted-foreground/30 bg-transparent text-muted-foreground/50 hover:border-primary/60"
                        } ${date === today ? "ring-1 ring-primary/30" : ""}`}
                      >
                        {taken ? <Check size={12} /> : <X size={10} className="opacity-50" />}
                      </button>
                    </span>
                  );
                })}
                <div className="ml-auto flex items-center gap-1 shrink-0">
                  {editingSupId === sup.name ? (
                    <button
                      title="Save name"
                      onClick={() => { if (editingSupName.trim()) { updateSupplement(sup.name, editingSupName.trim()); } setEditingSupId(null); }}
                      className="rounded p-0.5 text-primary"
                    >
                      <Check size={12} />
                    </button>
                  ) : (
                    <button
                      title="Rename"
                      onClick={() => { setEditingSupId(sup.name); setEditingSupName(sup.name); }}
                      className="rounded p-0.5 text-muted-foreground opacity-0 hover:text-primary group-hover:opacity-100"
                    >
                      <Edit3 size={12} />
                    </button>
                  )}
                  {confirmDeleteSup === sup.name ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => { deleteSupplement(sup.name); setConfirmDeleteSup(null); }}
                        className="rounded bg-destructive px-1.5 py-0.5 text-[10px] font-semibold text-destructive-foreground"
                      >
                        Yes
                      </button>
                      <button
                        onClick={() => setConfirmDeleteSup(null)}
                        className="rounded bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <button
                      title="Delete"
                      onClick={() => setConfirmDeleteSup(sup.name)}
                      className="rounded p-0.5 text-muted-foreground opacity-0 hover:text-destructive group-hover:opacity-100"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              </div>
            ))}
            </div>
            )}
            {supplements.length === 0 && (
              <p className="py-3 text-center text-xs text-muted-foreground">No supplements tracked yet</p>
            )}

            {/* Calendar view for selected supplement */}
            {selectedSupplement && selectedSupData && (
              <div className="mt-4 rounded-xl bg-secondary p-3">
                <div className="mb-2 flex items-center justify-between">
                  <button title="Previous month" onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))} className="p-1 text-muted-foreground hover:text-foreground"><ChevronLeft size={14} /></button>
                  <span className="text-xs font-semibold text-foreground">
                    {calendarMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })} — {selectedSupplement} <span className="text-primary">({selectedSupTotal} total)</span>
                  </span>
                  <button title="Next month" onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))} className="p-1 text-muted-foreground hover:text-foreground"><ChevronRight size={14} /></button>
                </div>
                <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-muted-foreground mb-1">
                  {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => <span key={i}>{d}</span>)}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {calendarDays.map((dateStr, i) => {
                    if (!dateStr) return <span key={i} />;
                    const taken = selectedSupData.takenDates.includes(dateStr);
                    const isFuture = dateStr > today;
                    return (
                      <button
                        key={i}
                        disabled={isFuture}
                        onClick={() => !isFuture && toggleSupplement(selectedSupplement!, dateStr)}
                        className={`h-6 rounded text-[10px] font-medium transition-colors ${
                          taken ? "bg-primary text-primary-foreground" : isFuture ? "text-muted-foreground/30" : "text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        {new Date(dateStr + "T12:00:00").getDate()}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* ═══ Weight Tracker (now below supplements) ═══ */}
          <div className="glass-card mb-4 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Weight Tracker</h3>
              {weightLogs.length >= 2 && (
                <span className="flex items-center gap-1 text-xs font-semibold text-foreground">
                  {weightLogs[0].weight <= weightLogs[1].weight ? <ArrowDown size={14} /> : <ArrowUp size={14} />}
                  {Math.abs(weightLogs[0].weight - weightLogs[1].weight).toFixed(1)} lbs
                </span>
              )}
            </div>

            {/* Range selector */}
            <div className="mb-3 flex gap-1 rounded-lg bg-secondary p-1">
              {(["week", "month", "year", "all"] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setWeightRange(r)}
                  className={`flex-1 rounded-md py-1.5 text-xs font-medium transition-all capitalize ${
                    weightRange === r ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>

            {/* Line graph */}
            {weightChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={140}>
                <LineChart data={weightChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(215,15%,25%)" />
                  <XAxis dataKey="date" tick={{ fill: "hsl(215,15%,55%)", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis domain={["dataMin - 2", "dataMax + 2"]} tick={{ fill: "hsl(215,15%,55%)", fontSize: 10 }} axisLine={false} tickLine={false} width={35} />
                  <Tooltip
                    contentStyle={{ background: "hsl(220,15%,16%)", border: "1px solid hsl(215,15%,25%)", borderRadius: 8, fontSize: 12, color: "#fff" }}
                    labelStyle={{ color: "hsl(215,15%,55%)" }}
                  />
                  <Line type="monotone" dataKey="weight" stroke="hsl(160,67%,50%)" strokeWidth={2} dot={{ r: 3, fill: "hsl(160,67%,50%)" }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="py-6 text-center text-xs text-muted-foreground">No weight data for this period</p>
            )}

            {/* Recent logs with edit/delete */}
            <div className="mt-3 flex flex-col gap-2">
              {weightLogs.slice(0, 5).map((log) => (
                <div key={log.id} className="flex items-center justify-between rounded-lg bg-secondary px-3 py-2 group">
                  {editingWeightId === log.id ? (
                    <>
                      <span className="text-xs text-muted-foreground">{log.date}</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={editingWeightValue}
                          onChange={(e) => setEditingWeightValue(e.target.value)}
                          placeholder="Weight"
                          className="w-20 rounded bg-muted px-2 py-1 text-xs text-foreground outline-none"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              const w = parseFloat(editingWeightValue);
                              if (!isNaN(w) && w > 0) { updateWeightLog(log.id, w); setEditingWeightId(null); }
                            }
                          }}
                        />
                        <button title="Save" onClick={() => { const w = parseFloat(editingWeightValue); if (!isNaN(w) && w > 0) { updateWeightLog(log.id, w); setEditingWeightId(null); } }} className="text-primary"><Check size={14} /></button>
                        <button title="Cancel" onClick={() => setEditingWeightId(null)} className="text-muted-foreground"><X size={14} /></button>
                      </div>
                    </>
                  ) : (
                    <>
                      <span className="text-xs text-muted-foreground">{log.date}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-foreground">{log.weight}</span>
                        <button
                          title="Edit"
                          onClick={() => { setEditingWeightId(log.id); setEditingWeightValue(String(log.weight)); }}
                          className="rounded p-0.5 text-muted-foreground opacity-0 hover:text-primary group-hover:opacity-100"
                        >
                          <Edit3 size={12} />
                        </button>
                        <button
                          title="Delete"
                          onClick={() => deleteWeightLog(log.id)}
                          className="rounded p-0.5 text-muted-foreground opacity-0 hover:text-destructive group-hover:opacity-100"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>

            {/* Log weight with custom date */}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <input
                type="date"
                title="Log date"
                value={weightDateInput}
                onChange={(e) => setWeightDateInput(e.target.value)}
                className="rounded-lg bg-secondary px-2 py-2 text-xs text-foreground outline-none min-w-0"
              />
              <input
                type="number"
                placeholder="Weight (lbs)"
                value={weightInput}
                onChange={(e) => setWeightInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddWeight()}
                className="w-24 rounded-lg bg-secondary px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground outline-none"
              />
              <button
                onClick={handleAddWeight}
                className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Log
              </button>
            </div>
          </div>
        </div>
      </div>
      </>
      )}
    </AppLayout>
  );
};

export default Analytics;
