import { Injectable } from '@nestjs/common';
import { MealsService } from '../meals/meals.service';

@Injectable()
export class SummaryService {
    constructor(private mealsService: MealsService) { }

    async getWeeklySummary(userId: string) {
        const weeklyData = await this.mealsService.getWeeklyData(userId);

        // Fill in missing days with zero data
        const last7Days: string[] = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            last7Days.push(d.toISOString().split('T')[0]);
        }

        const dailyBreakdown = last7Days.map((date) => {
            const dayData = weeklyData.find((d) => d._id === date);
            const dayLabel = new Date(date + 'T12:00:00').toLocaleDateString('en-US', {
                weekday: 'short',
            });

            return {
                date,
                day: dayLabel,
                calories: dayData?.totalCalories || 0,
                protein: dayData?.totalProtein || 0,
                carbs: dayData?.totalCarbs || 0,
                fats: dayData?.totalFats || 0,
                mealCount: dayData?.mealCount || 0,
            };
        });

        const totalDays = dailyBreakdown.filter((d) => d.mealCount > 0).length || 1;
        const totals = dailyBreakdown.reduce(
            (acc, d) => ({
                calories: acc.calories + d.calories,
                protein: acc.protein + d.protein,
                carbs: acc.carbs + d.carbs,
                fats: acc.fats + d.fats,
                mealCount: acc.mealCount + d.mealCount,
            }),
            { calories: 0, protein: 0, carbs: 0, fats: 0, mealCount: 0 },
        );

        return {
            period: {
                start: last7Days[0],
                end: last7Days[last7Days.length - 1],
            },
            averages: {
                calories: Math.round(totals.calories / totalDays),
                protein: Math.round(totals.protein / totalDays),
                carbs: Math.round(totals.carbs / totalDays),
                fats: Math.round(totals.fats / totalDays),
            },
            totals,
            daysLogged: totalDays,
            dailyBreakdown,
        };
    }
}
