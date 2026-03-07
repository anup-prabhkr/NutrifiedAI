import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ _id: false })
export class MacroTargets {
    @Prop({ default: 0 })
    protein: number;

    @Prop({ default: 0 })
    carbs: number;

    @Prop({ default: 0 })
    fats: number;
}

@Schema({ _id: false })
export class UserProfile {
    @Prop()
    height: number;

    @Prop()
    weight: number;

    @Prop()
    age: number;

    @Prop()
    gender: string;

    @Prop()
    bodyFatPercentage: number;

    @Prop({ default: 'Moderately Active' })
    activityLevel: string;

    @Prop({ default: 'Maintain' })
    goal: string;

    @Prop({ default: false })
    manualMacros: boolean;

    @Prop({ default: 0 })
    calorieTarget: number;

    @Prop({ type: MacroTargets, default: () => ({ protein: 0, carbs: 0, fats: 0 }) })
    macroTargets: MacroTargets;

    @Prop()
    bmi: number;

    @Prop()
    bmiCategory: string;

    @Prop()
    profilePicture: string;

    @Prop()
    targetWeight: number;

    @Prop()
    weeklyWeightChange: number;
}

@Schema({ _id: false })
export class Subscription {
    @Prop({ enum: ['free', 'pro'], default: 'free' })
    tier: string;

    @Prop()
    stripeCustomerId: string;

    @Prop({ default: 'inactive' })
    status: string;
}

@Schema({ timestamps: true })
export class User {
    _id: Types.ObjectId;

    @Prop({ required: true })
    name: string;

    @Prop({ required: true, unique: true, index: true })
    email: string;

    @Prop({ required: true })
    passwordHash: string;

    @Prop({ type: UserProfile, default: () => ({}) })
    profile: UserProfile;

    @Prop({ type: Subscription, default: () => ({ tier: 'free', status: 'inactive' }) })
    subscription: Subscription;

    @Prop()
    refreshTokenHash: string;

    @Prop({ default: false })
    isEmailVerified: boolean;

    @Prop()
    emailVerificationToken: string;

    @Prop()
    emailVerificationExpiry: Date;

    createdAt: Date;
    updatedAt: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.index({ 'subscription.tier': 1 });
UserSchema.index({ emailVerificationToken: 1 }, { sparse: true });
