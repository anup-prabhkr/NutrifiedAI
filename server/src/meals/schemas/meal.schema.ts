import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type MealDocument = Meal & Document;

@Schema({ timestamps: { createdAt: true, updatedAt: false } })
export class Meal {
    _id: Types.ObjectId;

    @Prop({ type: Types.ObjectId, required: true, index: true })
    userId: Types.ObjectId;

    @Prop({ required: true, index: true })
    date: string; // YYYY-MM-DD

    @Prop({ required: true })
    mealName: string;

    @Prop()
    imageUrl: string;

    @Prop({ required: true })
    calories: number;

    @Prop({ default: 0 })
    protein: number;

    @Prop({ default: 0 })
    carbs: number;

    @Prop({ default: 0 })
    fats: number;

    @Prop({ min: 0, max: 1 })
    aiConfidence: number;

    @Prop({ enum: ['ai', 'manual'], default: 'manual' })
    source: string;

    createdAt: Date;
}

export const MealSchema = SchemaFactory.createForClass(Meal);

MealSchema.index({ userId: 1, date: 1 });
