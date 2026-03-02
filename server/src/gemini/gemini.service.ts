import { Injectable, BadRequestException } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';

export interface NutritionItem {
    name: string;
    portion: string;
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
}

export interface NutritionAnalysis {
    mealName: string;
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
    fiber: number;
    confidence: number;
    items: NutritionItem[];
    vitamins?: Record<string, string>;
    phase: 'flash' | 'verified';
}

@Injectable()
export class GeminiService {
    private genAI: GoogleGenerativeAI;
    private flashModel: any;
    private proModel: any;

    constructor() {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            console.warn('⚠️  GEMINI_API_KEY not set — AI analysis will be unavailable');
            return;
        }
        this.genAI = new GoogleGenerativeAI(apiKey);
        // Phase 1: Fast model for instant estimates
        this.flashModel = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
        // Phase 2: Pro model for deep verified breakdown
        this.proModel = this.genAI.getGenerativeModel({ model: 'gemini-2.5-pro' });
    }

    // ── Public: Image analysis (hybrid) ─────────────────────
    async analyzeImage(imageBase64: string, contextDescription?: string): Promise<NutritionAnalysis> {
        if (!this.flashModel) {
            throw new BadRequestException('AI analysis is not configured. Set GEMINI_API_KEY.');
        }

        const imageData = {
            inlineData: {
                mimeType: 'image/jpeg',
                data: imageBase64.replace(/^data:image\/\w+;base64,/, ''),
            },
        };

        // Run both phases in parallel
        const [flashResult, proResult] = await Promise.allSettled([
            this.runFlashAnalysis(imageData, contextDescription),
            this.runProAnalysis(imageData, contextDescription),
        ]);

        // Always prefer pro result if available; fall back to flash
        if (proResult.status === 'fulfilled') {
            return { ...proResult.value, phase: 'verified' };
        }
        if (flashResult.status === 'fulfilled') {
            return { ...flashResult.value, phase: 'flash' };
        }

        // Both failed
        const err = proResult.status === 'rejected' ? proResult.reason : flashResult.status === 'rejected' ? flashResult.reason : new Error('Analysis failed');
        throw new BadRequestException(`AI analysis failed: ${err.message}`);
    }

    // ── Public: Text analysis (hybrid) ──────────────────────
    async analyzeText(description: string): Promise<NutritionAnalysis> {
        if (!this.flashModel) {
            throw new BadRequestException('AI analysis is not configured. Set GEMINI_API_KEY.');
        }

        const textPart = { text: this.buildPrompt(description) };

        const [flashResult, proResult] = await Promise.allSettled([
            this.runModel(this.flashModel, [textPart]),
            this.runModel(this.proModel, [textPart]),
        ]);

        if (proResult.status === 'fulfilled') {
            return { ...proResult.value, phase: 'verified' };
        }
        if (flashResult.status === 'fulfilled') {
            return { ...flashResult.value, phase: 'flash' };
        }

        const err = proResult.status === 'rejected' ? proResult.reason : flashResult.status === 'rejected' ? flashResult.reason : new Error('Analysis failed');
        throw new BadRequestException(`AI analysis failed: ${err.message}`);
    }

    // ── Phase 1: Flash — quick estimate ─────────────────────
    private async runFlashAnalysis(imageData: any, contextDescription?: string): Promise<NutritionAnalysis> {
        const prompt = contextDescription
            ? this.buildImageWithContextPrompt(contextDescription)
            : this.buildPrompt();
        return this.runModel(this.flashModel, [{ text: prompt }, imageData]);
    }

    // ── Phase 2: Pro — verified deep breakdown ──────────────
    private async runProAnalysis(imageData: any, contextDescription?: string): Promise<NutritionAnalysis> {
        const prompt = contextDescription
            ? this.buildImageWithContextPrompt(contextDescription)
            : this.buildDetailedPrompt();
        return this.runModel(this.proModel, [{ text: prompt }, imageData]);
    }

    // ── Core model runner ───────────────────────────────────
    private async runModel(model: any, parts: any[]): Promise<NutritionAnalysis> {
        try {
            const result = await model.generateContent({
                contents: [{ role: 'user', parts }],
                generationConfig: {
                    responseMimeType: 'application/json',
                    temperature: 0.1,
                },
            });

            const text = result.response.text();
            return this.parseAndValidate(text);
        } catch (error: any) {
            if (error.message?.includes('RATE_LIMIT')) {
                throw new BadRequestException('AI service rate limited. Please try again in a moment.');
            }
            throw error;
        }
    }

    private buildPrompt(textDescription?: string): string {
        const base = textDescription
            ? `Analyze this meal description and estimate the nutritional content: "${textDescription}"`
            : 'Analyze this food image and estimate the nutritional content.';

        return `${base}

Return ONLY a valid JSON object with this exact structure:
{
  "mealName": "descriptive name of the overall meal",
  "calories": total calories (number),
  "protein": total protein in grams (number),
  "carbs": total carbohydrates in grams (number),
  "fats": total fat in grams (number),
  "fiber": total dietary fiber in grams (number),
  "confidence": your confidence level from 0.0 to 1.0 (number),
  "items": [
    {
      "name": "individual food item name",
      "portion": "estimated portion size (e.g. '1 cup', '150g')",
      "calories": calories for this item (number),
      "protein": protein in grams (number),
      "carbs": carbs in grams (number),
      "fats": fats in grams (number)
    }
  ]
}

Important rules:
- Be realistic with portion sizes and calorie estimates
- A single meal should typically be between 100-2500 calories
- Protein should not exceed 150g for a single meal
- All numbers must be positive integers or zero
- Confidence should be lower for ambiguous or hard-to-identify items
- If unsure, estimate conservatively`;
    }

    private buildImageWithContextPrompt(context: string): string {
        return `Analyze this food image along with the user's description of the meal:
"${context}"

Use BOTH the image AND the description to provide the most accurate nutritional breakdown. The image shows the meal, and the description may include additional details about ingredients, quantities, or preparation that aren't visually obvious.

Return ONLY a valid JSON object with this exact structure:
{
  "mealName": "descriptive name of the overall meal",
  "calories": total calories for the ENTIRE meal (number),
  "protein": total protein in grams (number),
  "carbs": total carbohydrates in grams (number),
  "fats": total fat in grams (number),
  "fiber": total dietary fiber in grams (number),
  "confidence": your confidence level from 0.0 to 1.0 (number),
  "items": [
    {
      "name": "individual food item name",
      "portion": "portion size (e.g. '2 slices / 54g', '1 cup / 240ml')",
      "calories": calories for this item (number),
      "protein": protein in grams (number),
      "carbs": carbs in grams (number),
      "fats": fats in grams (number)
    }
  ]
}

Important rules:
- Include EVERY food item visible in the image AND mentioned in the description
- Use the description to resolve quantities and details that may not be clear from the image alone
- Be realistic with portion sizes and calorie estimates
- All numbers must be positive integers or zero
- The totals (calories, protein, etc.) must be the SUM of all items
- Confidence should be higher when image and description align, lower when they conflict`;
    }

    private buildDetailedPrompt(): string {
        return `Analyze this food image. Provide a detailed and accurate nutritional breakdown.

Return ONLY a valid JSON object with this exact structure:
{
  "mealName": "descriptive name of the overall meal",
  "calories": total calories (number),
  "protein": total protein in grams (number),
  "carbs": total carbohydrates in grams (number),
  "fats": total fat in grams (number),
  "fiber": total dietary fiber in grams (number),
  "confidence": your confidence level from 0.0 to 1.0 (number),
  "items": [
    {
      "name": "individual food item name",
      "portion": "estimated portion size with weight (e.g. '1 cup / 150g')",
      "calories": calories for this item (number),
      "protein": protein in grams (number),
      "carbs": carbs in grams (number),
      "fats": fats in grams (number)
    }
  ],
  "vitamins": {
    "Vitamin A": "estimated value with unit (e.g. '720 μg')",
    "Vitamin C": "estimated value with unit",
    "Vitamin D": "estimated value with unit",
    "Vitamin B12": "estimated value with unit",
    "Iron": "estimated value with unit",
    "Calcium": "estimated value with unit",
    "Zinc": "estimated value with unit",
    "Magnesium": "estimated value with unit"
  }
}

Important rules:
- Be highly accurate with portion sizes — look at plate size, thickness, density
- Cross-check that calorie total matches the sum of items
- A single meal should typically be between 100-2500 calories
- Protein should not exceed 150g for a single meal
- All macro numbers must be positive integers or zero
- Vitamin estimates should be reasonable for the identified foods
- Confidence should be lower for ambiguous or hard-to-identify items
- If unsure, estimate conservatively`;
    }

    private parseAndValidate(text: string): NutritionAnalysis {
        let parsed: any;
        try {
            // Clean the response — sometimes Gemini wraps in markdown
            const cleaned = text
                .replace(/```json\n?/g, '')
                .replace(/```\n?/g, '')
                .trim();
            parsed = JSON.parse(cleaned);
        } catch {
            throw new BadRequestException('AI returned invalid response. Please try again.');
        }

        // Sanity checks
        if (!parsed.mealName || typeof parsed.calories !== 'number') {
            throw new BadRequestException('AI response missing required fields.');
        }

        // Calorie sanity check (anti-hallucination)
        if (parsed.calories > 5000) {
            parsed.calories = Math.min(parsed.calories, 3000);
            parsed.confidence = Math.min(parsed.confidence || 0.5, 0.3);
        }

        if (parsed.protein > 300) {
            parsed.protein = Math.min(parsed.protein, 150);
            parsed.confidence = Math.min(parsed.confidence || 0.5, 0.3);
        }

        return {
            mealName: String(parsed.mealName),
            calories: Math.round(Math.max(0, parsed.calories)),
            protein: Math.round(Math.max(0, parsed.protein || 0)),
            carbs: Math.round(Math.max(0, parsed.carbs || 0)),
            fats: Math.round(Math.max(0, parsed.fats || 0)),
            fiber: Math.round(Math.max(0, parsed.fiber || 0)),
            confidence: Math.min(1, Math.max(0, parsed.confidence || 0.5)),
            items: Array.isArray(parsed.items)
                ? parsed.items.map((item: any) => ({
                    name: String(item.name || 'Unknown'),
                    portion: String(item.portion || 'unknown'),
                    calories: Math.round(Math.max(0, item.calories || 0)),
                    protein: Math.round(Math.max(0, item.protein || 0)),
                    carbs: Math.round(Math.max(0, item.carbs || 0)),
                    fats: Math.round(Math.max(0, item.fats || 0)),
                }))
                : [],
            vitamins: parsed.vitamins && typeof parsed.vitamins === 'object' ? parsed.vitamins : undefined,
            phase: 'flash',
        };
    }
}
