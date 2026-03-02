import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type SupplementDocument = Supplement & Document;

@Schema({ timestamps: { createdAt: true, updatedAt: false } })
export class Supplement {
    _id: Types.ObjectId;

    @Prop({ type: Types.ObjectId, required: true, index: true })
    userId: Types.ObjectId;

    @Prop({ required: true })
    name: string;

    @Prop()
    dose: string;

    @Prop({ default: 'daily' })
    frequency: string;

    @Prop({ type: [String], default: [] })
    takenDates: string[]; // YYYY-MM-DD strings

    createdAt: Date;
}

export const SupplementSchema = SchemaFactory.createForClass(Supplement);

SupplementSchema.index({ userId: 1, name: 1 }, { unique: true });
