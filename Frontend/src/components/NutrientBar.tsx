import React from "react";

interface NutrientBarProps {
  label: string;
  value: number;
  max: number;
  color?: string;
}

const NutrientBar: React.FC<NutrientBarProps> = ({ label, value, max, color = "emerald" }) => {
  const percentage = Math.min((value / max) * 100, 100);
  
  const colorMap: Record<string, string> = {
    emerald: "bg-emerald",
    blue: "bg-nblue",
    pink: "bg-npink",
    amber: "bg-namber",
  };

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-secondary px-4 py-3">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">
          {value} / {max}g
        </span>
        <div className="h-2 w-16 rounded-full bg-muted">
          <div
            className={`h-2 rounded-full ${colorMap[color] || colorMap.emerald}`}
            style={{ width: `${percentage}%`, transition: "width 0.8s ease-out" }}
          />
        </div>
      </div>
    </div>
  );
};

export default NutrientBar;
