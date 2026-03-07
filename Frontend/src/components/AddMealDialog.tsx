import React, { useState, useRef, useCallback, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Camera, MessageSquare, Edit3, Loader2, Sparkles, Check, X, Tag, Upload } from "lucide-react";
import { mealsApi, type AnalysisResult } from "@/lib/api";
import { toast } from "sonner";

/**
 * Compress an image (base64 data-URL) to a target max dimension and JPEG quality.
 * Returns a new base64 data-URL.
 */
function compressImage(
  dataUrl: string,
  maxDimension = 1024,
  quality = 0.7,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width > maxDimension || height > maxDimension) {
        const ratio = Math.min(maxDimension / width, maxDimension / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Canvas not supported"));
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = dataUrl;
  });
}

interface AddMealDialogProps {
  onAdd: (meal: {
    mealName: string;
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
    source: "ai" | "manual";
    aiConfidence?: number;
  }) => void;
}

type Tab = "image" | "text" | "manual";

const AddMealDialog: React.FC<AddMealDialogProps> = ({ onAdd }) => {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("image");
  const [loading, setLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  // Image tab state
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageDescription, setImageDescription] = useState("");

  // Text tab state
  const [textDescription, setTextDescription] = useState("");
  const [nutritionLabel, setNutritionLabel] = useState("");

  // Manual tab state
  const [manualForm, setManualForm] = useState({
    name: "", calories: "", protein: "", carbs: "", fats: "",
  });

  const resetState = () => {
    setAnalysisResult(null);
    setImagePreview(null);
    setImageBase64(null);
    setImageDescription("");
    setTextDescription("");
    setNutritionLabel("");
    setManualForm({ name: "", calories: "", protein: "", carbs: "", fats: "" });
    setLoading(false);
    setDragging(false);
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) resetState();
  };

  // ── Process a file (shared by input & drag) ─────────────
  const processFile = useCallback(async (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image must be under 10MB");
      return;
    }
    const reader = new FileReader();
    reader.onloadend = async () => {
      const rawBase64 = reader.result as string;
      try {
        const compressed = await compressImage(rawBase64, 1024, 0.7);
        setImagePreview(compressed);
        setImageBase64(compressed);
      } catch {
        setImagePreview(rawBase64);
        setImageBase64(rawBase64);
      }
    };
    reader.readAsDataURL(file);
  }, []);

  // ── Image handling ──────────────────────────────────────
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processFile(file);
  };

  // ── Drag & drop handlers ────────────────────────────────
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      processFile(file);
    } else {
      toast.error("Please drop an image file");
    }
  }, [processFile]);

  // ── AI Analysis ─────────────────────────────────────────
  const handleAnalyze = async () => {
    setLoading(true);
    try {
      let result: AnalysisResult;

      if (tab === "image" && imageBase64) {
        const desc = imageDescription.trim() || undefined;
        result = await mealsApi.analyze({ imageBase64, description: desc });
      } else if (tab === "text" && (textDescription.trim() || nutritionLabel.trim())) {
        let description = textDescription.trim();
        if (nutritionLabel.trim()) {
          description = description
            ? `${description}\n\nNutrition Label Information:\n${nutritionLabel.trim()}`
            : `Estimate calories and macros from this nutrition label:\n${nutritionLabel.trim()}`;
        }
        result = await mealsApi.analyze({ description });
      } else {
        toast.error("Please provide an input to analyze");
        setLoading(false);
        return;
      }

      setAnalysisResult(result);
    } catch (err: any) {
      toast.error(err.message || "Analysis failed");
    } finally {
      setLoading(false);
    }
  };

  // ── Confirm AI result ───────────────────────────────────
  const handleConfirmAnalysis = () => {
    if (!analysisResult) return;
    onAdd({
      mealName: analysisResult.mealName,
      calories: analysisResult.calories,
      protein: analysisResult.protein,
      carbs: analysisResult.carbs,
      fats: analysisResult.fats,
      source: "ai",
      aiConfidence: analysisResult.confidence,
    });
    setOpen(false);
    resetState();
    toast.success("Meal added!");
  };

  // ── Manual submit ───────────────────────────────────────
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualForm.name || !manualForm.calories) return;
    onAdd({
      mealName: manualForm.name,
      calories: Number(manualForm.calories),
      protein: Number(manualForm.protein) || 0,
      carbs: Number(manualForm.carbs) || 0,
      fats: Number(manualForm.fats) || 0,
      source: "manual",
    });
    setOpen(false);
    resetState();
    toast.success("Meal added!");
  };

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setManualForm((prev) => ({ ...prev, [key]: e.target.value }));

  // ── Global keyboard shortcut: Enter to analyze/confirm ──
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      // Don't intercept when typing in textareas
      const target = e.target as HTMLElement;
      if (target.tagName === "TEXTAREA") return;

      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        if (analysisResult) {
          handleConfirmAnalysis();
        } else if (tab === "image" && imageBase64 && !loading) {
          handleAnalyze();
        } else if (tab === "text" && (textDescription.trim() || nutritionLabel.trim()) && !loading) {
          handleAnalyze();
        }
        // Manual tab uses native form submit via Enter
      }

      // Escape to dismiss result and retry
      if (e.key === "Escape" && analysisResult) {
        e.preventDefault();
        e.stopPropagation();
        setAnalysisResult(null);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, analysisResult, tab, imageBase64, textDescription, nutritionLabel, loading]);

  const tabs: { key: Tab; icon: typeof Camera; label: string }[] = [
    { key: "image", icon: Camera, label: "Photo" },
    { key: "text", icon: MessageSquare, label: "Describe" },
    { key: "manual", icon: Edit3, label: "Manual" },
  ];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <button aria-label="Add meal" className="fixed bottom-20 left-1/2 z-40 flex h-14 w-14 -translate-x-1/2 items-center justify-center rounded-full bg-primary shadow-lg shadow-primary/30 transition-transform hover:scale-110 active:scale-95 animate-fab-pulse lg:bottom-8">
          <Plus size={28} className="text-primary-foreground" />
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-md border-border bg-card text-foreground overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-foreground">Add Meal</DialogTitle>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex gap-1 rounded-lg bg-secondary p-1">
          {tabs.map(({ key, icon: Icon, label }) => (
            <button
              key={key}
              onClick={() => { setTab(key); setAnalysisResult(null); }}
              className={`relative flex flex-1 items-center justify-center gap-1.5 rounded-md py-2 text-xs font-medium transition-all duration-200 ${tab === key
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
                }`}
            >
              <Icon size={14} className={`transition-transform duration-200 ${tab === key ? "scale-110" : ""}`} />
              {label}
            </button>
          ))}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-10 animate-in fade-in duration-300">
            <div className="relative mb-4">
              <div className="h-16 w-16 rounded-full border-4 border-secondary" />
              <div className="absolute inset-0 h-16 w-16 rounded-full border-4 border-primary border-t-transparent animate-spin" />
              <Sparkles size={20} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-primary animate-pulse" />
            </div>
            <p className="text-sm font-medium text-foreground animate-pulse">Analyzing your meal...</p>
            <p className="mt-1 text-xs text-muted-foreground">AI is identifying ingredients & nutrients</p>
          </div>
        )}

        {/* AI Result View */}
        {analysisResult && !loading ? (
          <div className="flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-4 duration-400">
            <div className="flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-2 animate-in fade-in duration-300">
              <Sparkles size={14} className="text-primary" />
              <span className="text-xs font-medium text-primary">
                {analysisResult.phase === 'verified' ? 'Verified Breakdown' : 'Initial Guess'} • {Math.round(analysisResult.confidence * 100)}% confidence
              </span>
            </div>

            <div className="rounded-xl bg-secondary p-4 animate-in fade-in slide-in-from-bottom-2 duration-400 delay-100">
              <h4 className="mb-2 font-semibold text-foreground">{analysisResult.mealName}</h4>
              <div className="grid grid-cols-5 gap-2 text-center text-xs">
                {[
                  { val: analysisResult.calories, unit: "kcal", color: "text-foreground" },
                  { val: `${analysisResult.protein}g`, unit: "Protein", color: "text-nblue" },
                  { val: `${analysisResult.carbs}g`, unit: "Carbs", color: "text-emerald" },
                  { val: `${analysisResult.fats}g`, unit: "Fat", color: "text-npink" },
                  { val: `${analysisResult.fiber || 0}g`, unit: "Fiber", color: "text-foreground" },
                ].map((m, i) => (
                  <div key={i} className="animate-in fade-in zoom-in-95 duration-300 fill-backwards" style={{ animationDelay: `${150 + i * 60}ms` }}>
                    <p className={`text-lg font-bold ${m.color}`}>{m.val}</p>
                    <p className="text-muted-foreground">{m.unit}</p>
                  </div>
                ))}
              </div>
            </div>

            {analysisResult.items.length > 0 && (
              <div className="max-h-32 overflow-y-auto rounded-lg bg-secondary p-3 animate-in fade-in slide-in-from-bottom-2 duration-400 delay-200">
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Detected Items
                </p>
                {analysisResult.items.map((item, i) => (
                  <div key={i} className="flex items-center justify-between text-xs py-1 animate-in fade-in slide-in-from-left-2 duration-300 fill-backwards" style={{ animationDelay: `${250 + i * 50}ms` }}>
                    <span className="text-foreground">{item.name}<span className="text-muted-foreground ml-1">({item.portion})</span></span>
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <span>{item.calories} kcal</span>
                      <span className="text-nblue">P{item.protein}g</span>
                      <span className="text-emerald">C{item.carbs}g</span>
                      <span className="text-npink">F{item.fats}g</span>
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2 animate-in fade-in slide-in-from-bottom-2 duration-300 delay-300">
              <button
                onClick={() => setAnalysisResult(null)}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-secondary py-2.5 text-sm font-medium text-foreground transition-all hover:bg-secondary/80 active:scale-[0.98]"
              >
                <X size={14} /> Retry
              </button>
              <button
                onClick={handleConfirmAnalysis}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 active:scale-[0.98]"
              >
                <Check size={14} /> Add Meal <span className="ml-1 text-[10px] opacity-70">↵</span>
              </button>
            </div>
          </div>
        ) : !loading ? (
          <>
            {/* Image Tab */}
            {tab === "image" && (
              <div className="flex flex-col gap-3 animate-in fade-in slide-in-from-right-2 duration-300">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  aria-label="Select meal photo"
                  onChange={handleImageSelect}
                  className="hidden"
                />
                {imagePreview ? (
                  <div className="relative animate-in fade-in zoom-in-95 duration-300">
                    <img
                      src={imagePreview}
                      alt="Meal preview"
                      className="h-48 w-full rounded-xl object-cover"
                    />
                    <button
                      aria-label="Remove photo"
                      onClick={() => { setImagePreview(null); setImageBase64(null); }}
                      className="absolute right-2 top-2 rounded-full bg-black/50 p-1 text-white transition-all hover:bg-black/70 hover:scale-110"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`flex h-48 flex-col items-center justify-center rounded-xl border-2 border-dashed bg-secondary/50 text-muted-foreground transition-all duration-200 ${
                      dragging
                        ? "border-primary bg-primary/10 text-foreground scale-[1.02]"
                        : "border-border hover:border-primary/40 hover:text-foreground"
                    }`}
                  >
                    {dragging ? (
                      <>
                        <Upload size={32} className="mb-2 text-primary animate-bounce" />
                        <span className="text-sm font-medium text-primary">Drop image here</span>
                      </>
                    ) : (
                      <>
                        <Camera size={32} className="mb-2" />
                        <span className="text-sm font-medium">Take a photo, upload, or drag & drop</span>
                        <span className="text-xs">Supports JPG, PNG (max 10MB)</span>
                      </>
                    )}
                  </button>
                )}
                <textarea
                  value={imageDescription}
                  onChange={(e) => setImageDescription(e.target.value)}
                  placeholder='Optionally describe the meal, e.g. "2 eggs sunny side up with toast and butter"'
                  rows={2}
                  className="w-full resize-none rounded-lg bg-secondary px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30 transition-all duration-200"
                />
                <button
                  onClick={handleAnalyze}
                  disabled={loading || !imageBase64}
                  className="flex items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50"
                >
                  <Sparkles size={16} />
                  Analyze with AI
                  <span className="text-[10px] opacity-70">↵</span>
                </button>
              </div>
            )}

            {/* Text Tab */}
            {tab === "text" && (
              <div className="flex flex-col gap-3 animate-in fade-in slide-in-from-right-2 duration-300">
                <textarea
                  value={textDescription}
                  onChange={(e) => setTextDescription(e.target.value)}
                  placeholder='Describe your meal, e.g. "2 scrambled eggs, one toast with butter, and a glass of orange juice"'
                  rows={3}
                  className="w-full resize-none rounded-lg bg-secondary px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30 transition-all duration-200"
                />
                <div className="animate-in fade-in duration-200 delay-75">
                  <div className="mb-1.5 flex items-center gap-1.5">
                    <Tag size={12} className="text-muted-foreground" />
                    <span className="text-[11px] font-medium text-muted-foreground">Nutrition Label (optional)</span>
                  </div>
                  <textarea
                    value={nutritionLabel}
                    onChange={(e) => setNutritionLabel(e.target.value)}
                    placeholder='Paste nutrition label info, e.g. "Serving size: 1 bar (40g), Calories: 170, Total Fat: 7g, Protein: 10g, Total Carbs: 20g"'
                    rows={2}
                    className="w-full resize-none rounded-lg bg-secondary px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30 transition-all duration-200"
                  />
                </div>
                <button
                  onClick={handleAnalyze}
                  disabled={loading || (!textDescription.trim() && !nutritionLabel.trim())}
                  className="flex items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50"
                >
                  <Sparkles size={16} />
                  Analyze with AI
                  <span className="text-[10px] opacity-70">↵</span>
                </button>
              </div>
            )}

            {/* Manual Tab */}
            {tab === "manual" && (
              <form onSubmit={handleManualSubmit} className="flex flex-col gap-3 animate-in fade-in slide-in-from-right-2 duration-300">
                <input
                  placeholder="Meal name"
                  value={manualForm.name}
                  onChange={set("name")}
                  className="rounded-lg bg-secondary px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-all duration-200 focus:ring-2 focus:ring-primary/30"
                  required
                />
                <div className="grid grid-cols-2 gap-2">
                  <input placeholder="Calories" type="number" value={manualForm.calories} onChange={set("calories")} className="rounded-lg bg-secondary px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-all duration-200 focus:ring-2 focus:ring-primary/30" required />
                  <input placeholder="Protein (g)" type="number" value={manualForm.protein} onChange={set("protein")} className="rounded-lg bg-secondary px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-all duration-200 focus:ring-2 focus:ring-primary/30" />
                  <input placeholder="Carbs (g)" type="number" value={manualForm.carbs} onChange={set("carbs")} className="rounded-lg bg-secondary px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-all duration-200 focus:ring-2 focus:ring-primary/30" />
                  <input placeholder="Fats (g)" type="number" value={manualForm.fats} onChange={set("fats")} className="rounded-lg bg-secondary px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-all duration-200 focus:ring-2 focus:ring-primary/30" />
                </div>
                <button type="submit" className="flex items-center justify-center gap-1 rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 active:scale-[0.98]">
                  Add Meal <span className="text-[10px] opacity-70">↵</span>
                </button>
              </form>
            )}
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
};

export default AddMealDialog;
