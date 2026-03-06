import React, { useState } from "react";
import { Trash2, Edit3, Check, X, Star } from "lucide-react";

interface MealItemProps {
  id: string;
  name: string;
  time: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  source: "ai" | "manual";
  onDelete?: (id: string) => void;
  onUpdate?: (id: string, updates: { mealName?: string; calories?: number; protein?: number; carbs?: number; fats?: number }) => void;
  onSaveRecurring?: (meal: { name: string; calories: number; protein: number; carbs: number; fats: number }) => void;
}

const MealItem: React.FC<MealItemProps> = ({ id, name, time, calories, protein, carbs, fats, source, onDelete, onUpdate, onSaveRecurring }) => {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name, calories, protein, carbs, fats });

  const handleSave = () => {
    if (onUpdate) {
      onUpdate(id, {
        mealName: form.name,
        calories: Number(form.calories),
        protein: Number(form.protein),
        carbs: Number(form.carbs),
        fats: Number(form.fats),
      });
    }
    setEditing(false);
  };

  const handleCancel = () => {
    setForm({ name, calories, protein, carbs, fats });
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="rounded-xl bg-secondary px-4 py-3 flex flex-col gap-2">
        <input
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="rounded bg-muted px-2 py-1 text-sm font-semibold text-foreground outline-none"
        />
        <div className="grid grid-cols-4 gap-2">
          <div className="flex flex-col">
            <label className="text-[10px] text-muted-foreground mb-0.5">Calories</label>
            <input type="number" value={form.calories} onChange={(e) => setForm({ ...form, calories: Number(e.target.value) })} className="rounded bg-muted px-2 py-1 text-xs text-foreground outline-none w-full" />
          </div>
          <div className="flex flex-col">
            <label className="text-[10px] text-nblue mb-0.5">Protein</label>
            <input type="number" value={form.protein} onChange={(e) => setForm({ ...form, protein: Number(e.target.value) })} className="rounded bg-muted px-2 py-1 text-xs text-foreground outline-none w-full" />
          </div>
          <div className="flex flex-col">
            <label className="text-[10px] text-emerald mb-0.5">Carbs</label>
            <input type="number" value={form.carbs} onChange={(e) => setForm({ ...form, carbs: Number(e.target.value) })} className="rounded bg-muted px-2 py-1 text-xs text-foreground outline-none w-full" />
          </div>
          <div className="flex flex-col">
            <label className="text-[10px] text-npink mb-0.5">Fat</label>
            <input type="number" value={form.fats} onChange={(e) => setForm({ ...form, fats: Number(e.target.value) })} className="rounded bg-muted px-2 py-1 text-xs text-foreground outline-none w-full" />
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <button onClick={handleCancel} className="flex items-center gap-1 rounded-lg bg-muted px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground">
            <X size={12} /> Cancel
          </button>
          <button onClick={handleSave} className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">
            <Check size={12} /> Save
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between rounded-xl bg-secondary px-4 py-3 group transition-all duration-200 hover:bg-secondary/80 hover:shadow-md">
      <div className="flex flex-col">
        <span className="text-sm font-semibold text-foreground">{name}</span>
        <span className="text-xs text-muted-foreground">{time}</span>
        {source === "ai" && (
          <span className="mt-0.5 text-[10px] font-medium text-primary">AI Detected</span>
        )}
      </div>
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <div className="flex flex-col items-center transition-transform duration-200 group-hover:scale-105">
          <span className="font-semibold text-foreground">{calories}</span>
          <span>kcal</span>
        </div>
        <div className="flex flex-col items-center transition-transform duration-200 group-hover:scale-105">
          <span className="font-semibold text-nblue">{protein}g</span>
          <span>P</span>
        </div>
        <div className="flex flex-col items-center transition-transform duration-200 group-hover:scale-105">
          <span className="font-semibold text-emerald">{carbs}g</span>
          <span>C</span>
        </div>
        <div className="flex flex-col items-center transition-transform duration-200 group-hover:scale-105">
          <span className="font-semibold text-npink">{fats}g</span>
          <span>F</span>
        </div>
        {onUpdate && (
          <button
            aria-label="Edit meal"
            onClick={() => setEditing(true)}
            className="ml-1 rounded-lg p-1.5 text-muted-foreground opacity-0 transition-all hover:bg-primary/10 hover:text-primary group-hover:opacity-100"
          >
            <Edit3 size={14} />
          </button>
        )}
        {onSaveRecurring && (
          <button
            aria-label="Save as recurring"
            onClick={() => onSaveRecurring({ name, calories, protein, carbs, fats })}
            className="rounded-lg p-1.5 text-muted-foreground opacity-0 transition-all hover:bg-yellow-500/10 hover:text-yellow-500 group-hover:opacity-100"
            title="Save to Quick Add"
          >
            <Star size={14} />
          </button>
        )}
        {onDelete && (
          <button
            aria-label="Delete meal"
            onClick={() => onDelete(id)}
            className="rounded-lg p-1.5 text-muted-foreground opacity-0 transition-all hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
    </div>
  );
};

export default MealItem;
