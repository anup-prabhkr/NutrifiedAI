import React from "react";

interface ProgressRingProps {
  value: number;
  max: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  label?: string;
  unit?: string;
  showValue?: boolean;
}

const ProgressRing: React.FC<ProgressRingProps> = ({
  value,
  max,
  size = 140,
  strokeWidth = 10,
  color = "emerald",
  label,
  unit = "",
  showValue = true,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = max > 0 ? Math.min(value / max, 1) : 0;
  const offset = circumference - progress * circumference;

  const colorMap: Record<string, string> = {
    emerald: "hsl(160, 67%, 50%)",
    blue: "hsl(210, 90%, 60%)",
    pink: "hsl(330, 80%, 60%)",
    amber: "hsl(40, 90%, 55%)",
  };

  const strokeColor = colorMap[color] || colorMap.emerald;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          className="ring-track"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{
            transition: "stroke-dashoffset 1s ease-out",
          }}
        />
      </svg>
      {showValue && (
        <div className="absolute flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-foreground">{value}</span>
          {unit && <span className="text-xs text-muted-foreground">{unit}</span>}
          {label && <span className="text-xs text-muted-foreground">{label}</span>}
        </div>
      )}
    </div>
  );
};

export default ProgressRing;
