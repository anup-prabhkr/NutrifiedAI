import { Injectable, NotFoundException } from '@nestjs/common';
import { UsersService } from '../users/users.service';

@Injectable()
export class ProfileService {
    constructor(private usersService: UsersService) { }

    async getProfile(userId: string) {
        const user = await this.usersService.findById(userId);
        if (!user) throw new NotFoundException('User not found');

        return {
            name: user.name,
            email: user.email,
            profile: user.profile,
            subscription: user.subscription,
        };
    }

    async updateProfile(userId: string, data: Record<string, any>) {
        const profileData = { ...data };

        // Merge incoming data with existing profile so we have all fields
        const existing = await this.usersService.findById(userId);
        if (!existing) throw new NotFoundException('User not found');
        const merged = { ...(existing.profile as any ?? {}), ...profileData };

        const weight = Number(merged.weight);
        const height = Number(merged.height);
        const age = Number(merged.age);
        const gender = (merged.gender || '').toLowerCase();
        const activityLevel = (merged.activityLevel || '').toLowerCase();
        const goal = (merged.goal || '').toLowerCase();
        const bodyFatPercentage = Number(merged.bodyFatPercentage) || 0;
        const manualMacros = !!merged.manualMacros;

        // If user has enabled manual macros, skip auto-calculation of macros/calories
        if (manualMacros) {
            // Still compute BMI if possible
            if (weight > 0 && height > 0) {
                const heightM = height / 100;
                const bmi = parseFloat((weight / (heightM * heightM)).toFixed(1));
                let bmiCategory: string;
                if (bmi < 18.5) bmiCategory = 'Underweight';
                else if (bmi < 25) bmiCategory = 'Normal';
                else if (bmi < 30) bmiCategory = 'Overweight';
                else bmiCategory = 'Obese';
                profileData.bmi = bmi;
                profileData.bmiCategory = bmiCategory;
            }
        } else if (weight > 0 && height > 0 && age > 0 && gender && activityLevel && goal) {
            // ── BMR Calculation ─────────────────────────────
            let bmr: number;

            if (bodyFatPercentage > 0 && bodyFatPercentage >= 3 && bodyFatPercentage <= 60) {
                // Katch-McArdle Formula (body fat available)
                const bodyFatDecimal = bodyFatPercentage / 100;
                const leanBodyMass = weight * (1 - bodyFatDecimal);
                bmr = 370 + (21.6 * leanBodyMass);
            } else {
                // Mifflin-St Jeor Formula (fallback)
                if (gender === 'female') {
                    bmr = (10 * weight) + (6.25 * height) - (5 * age) - 161;
                } else {
                    bmr = (10 * weight) + (6.25 * height) - (5 * age) + 5;
                }
            }

            // ── Activity Multiplier ────────────────────────
            const activityMultipliers: Record<string, number> = {
                sedentary: 1.2,
                light: 1.375,
                'lightly active': 1.375,
                moderate: 1.55,
                'moderately active': 1.55,
                heavy: 1.725,
                'very active': 1.725,
                athlete: 1.9,
                'extremely active': 1.9,
            };
            const activityFactor = activityMultipliers[activityLevel] || 1.2;
            const tdee = bmr * activityFactor;

            // ── Goal Adjustment ────────────────────────────
            let calorieTarget: number;
            switch (goal) {
                case 'cut':
                    calorieTarget = tdee - 400;
                    break;
                case 'lean bulk':
                    calorieTarget = tdee + 250;
                    break;
                case 'aggressive bulk':
                    calorieTarget = tdee + 450;
                    break;
                case 'maintain':
                default:
                    calorieTarget = tdee;
                    break;
            }
            calorieTarget = Math.max(1200, Math.round(calorieTarget));
            profileData.calorieTarget = calorieTarget;

            // ── Macro Calculation ──────────────────────────
            let proteinGrams: number;
            switch (goal) {
                case 'lean bulk':
                    proteinGrams = Math.round(weight * 2.0);
                    break;
                case 'aggressive bulk':
                    proteinGrams = Math.round(weight * 2.2);
                    break;
                case 'cut':
                    proteinGrams = Math.round(weight * 2.4);
                    break;
                case 'maintain':
                default:
                    proteinGrams = Math.round(weight * 1.8);
                    break;
            }
            const proteinCalories = proteinGrams * 4;

            const fatCalories = calorieTarget * 0.25;
            const fatGrams = Math.round(fatCalories / 9);

            const remainingCalories = calorieTarget - (proteinCalories + fatCalories);
            const carbGrams = remainingCalories > 0 ? Math.round(remainingCalories / 4) : 0;

            profileData.macroTargets = {
                protein: proteinGrams,
                carbs: carbGrams,
                fats: fatGrams,
            };

            // ── BMI ────────────────────────────────────────
            const heightM = height / 100;
            const bmi = parseFloat((weight / (heightM * heightM)).toFixed(1));
            let bmiCategory: string;
            if (bmi < 18.5) bmiCategory = 'Underweight';
            else if (bmi < 25) bmiCategory = 'Normal';
            else if (bmi < 30) bmiCategory = 'Overweight';
            else bmiCategory = 'Obese';

            profileData.bmi = bmi;
            profileData.bmiCategory = bmiCategory;
        }

        const user = await this.usersService.updateProfile(userId, profileData);
        if (!user) throw new NotFoundException('User not found');

        return {
            name: user.name,
            email: user.email,
            profile: user.profile,
            subscription: user.subscription,
        };
    }
}
