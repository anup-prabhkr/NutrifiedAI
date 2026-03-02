import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type WeightLogDocument = WeightLog & Document;

@Schema({ timestamps: { createdAt: true, updatedAt: false } })
export class WeightLog {
    _id: Types.ObjectId;

    @Prop({ type: Types.ObjectId, required: true, index: true })
    userId: Types.ObjectId;

    @Prop({ required: true })
    date: Date;

    @Prop({ required: true })
    weight: number;

    createdAt: Date;
}

export const WeightLogSchema = SchemaFactory.createForClass(WeightLog);

WeightLogSchema.index({ userId: 1, date: -1 }, { unique: true });
