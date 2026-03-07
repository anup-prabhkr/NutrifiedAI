import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Meal, MealDocument } from './schemas/meal.schema';
import { CreateMealDto } from './dto/create-meal.dto';

@Injectable()
export class MealsService {
    constructor(@InjectModel(Meal.name) private mealModel: Model<MealDocument>) { }

    async create(userId: string, dto: CreateMealDto): Promise<MealDocument> {
        const today = new Date().toISOString().split('T')[0];
        return this.mealModel.create({
            userId: new Types.ObjectId(userId),
            date: dto.date || today,
            mealName: dto.mealName,
            calories: dto.calories,
            protein: dto.protein || 0,
            carbs: dto.carbs || 0,
            fats: dto.fats || 0,
            imageUrl: dto.imageUrl,
            source: dto.source || 'manual',
            aiConfidence: dto.aiConfidence,
        });
    }

    async findByDate(userId: string, date: string): Promise<MealDocument[]> {
        return this.mealModel
            .find({ userId: new Types.ObjectId(userId), date })
            .sort({ createdAt: -1 })
            .exec();
    }

    async delete(userId: string, mealId: string): Promise<boolean> {
        const result = await this.mealModel.deleteOne({
            _id: new Types.ObjectId(mealId),
            userId: new Types.ObjectId(userId),
        });
        return result.deletedCount > 0;
    }

    async update(userId: string, mealId: string, updates: Partial<CreateMealDto>): Promise<MealDocument | null> {
        const updateFields: Record<string, any> = {};
        if (updates.mealName !== undefined) updateFields.mealName = updates.mealName;
        if (updates.calories !== undefined) updateFields.calories = updates.calories;
        if (updates.protein !== undefined) updateFields.protein = updates.protein;
        if (updates.carbs !== undefined) updateFields.carbs = updates.carbs;
        if (updates.fats !== undefined) updateFields.fats = updates.fats;

        return this.mealModel.findOneAndUpdate(
            { _id: new Types.ObjectId(mealId), userId: new Types.ObjectId(userId) },
            { $set: updateFields },
            { new: true },
        ).exec();
    }

    async getWeeklyData(userId: string): Promise<any[]> {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 6);

        const start = startDate.toISOString().split('T')[0];
        const end = endDate.toISOString().split('T')[0];

        return this.mealModel.aggregate([
            {
                $match: {
                    userId: new Types.ObjectId(userId),
                    date: { $gte: start, $lte: end },
                },
            },
            {
                $group: {
                    _id: '$date',
                    totalCalories: { $sum: '$calories' },
                    totalProtein: { $sum: '$protein' },
                    totalCarbs: { $sum: '$carbs' },
                    totalFats: { $sum: '$fats' },
                    mealCount: { $sum: 1 },
                },
            },
            { $sort: { _id: 1 } },
        ]);
    }

    async deleteAllForUser(userId: string): Promise<void> {
        await this.mealModel.deleteMany({ userId: new Types.ObjectId(userId) }).exec();
    }
}
