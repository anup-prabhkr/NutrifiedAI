import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';

@Injectable()
export class UsersService {
    constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) { }

    async findByEmail(email: string): Promise<UserDocument | null> {
        return this.userModel.findOne({ email: email.toLowerCase() }).exec();
    }

    async findById(id: string | Types.ObjectId): Promise<UserDocument | null> {
        return this.userModel.findById(id).exec();
    }

    async create(data: {
        name: string;
        email: string;
        passwordHash: string;
    }): Promise<UserDocument> {
        return this.userModel.create({
            ...data,
            email: data.email.toLowerCase(),
        });
    }

    async updateRefreshToken(
        userId: string | Types.ObjectId,
        refreshTokenHash: string | null,
    ): Promise<void> {
        await this.userModel.findByIdAndUpdate(userId, { refreshTokenHash }).exec();
    }

    async updateProfile(
        userId: string | Types.ObjectId,
        profileData: Record<string, any>,
    ): Promise<UserDocument | null> {
        const updateFields: Record<string, any> = {};
        for (const [key, value] of Object.entries(profileData)) {
            if (key === 'macroTargets') {
                for (const [mk, mv] of Object.entries(value as Record<string, any>)) {
                    updateFields[`profile.macroTargets.${mk}`] = mv;
                }
            } else if (key === 'name') {
                updateFields['name'] = value;
            } else {
                updateFields[`profile.${key}`] = value;
            }
        }
        return this.userModel
            .findByIdAndUpdate(userId, { $set: updateFields }, { new: true })
            .exec();
    }

    async updateSubscription(
        userId: string | Types.ObjectId,
        subscriptionData: Record<string, any>,
    ): Promise<void> {
        const updateFields: Record<string, any> = {};
        for (const [key, value] of Object.entries(subscriptionData)) {
            updateFields[`subscription.${key}`] = value;
        }
        await this.userModel
            .findByIdAndUpdate(userId, { $set: updateFields })
            .exec();
    }

    async findByStripeCustomerId(
        stripeCustomerId: string,
    ): Promise<UserDocument | null> {
        return this.userModel
            .findOne({ 'subscription.stripeCustomerId': stripeCustomerId })
            .exec();
    }

    async setEmailVerificationToken(
        userId: string,
        token: string,
        expiry: Date,
    ): Promise<void> {
        await this.userModel
            .findByIdAndUpdate(userId, { emailVerificationToken: token, emailVerificationExpiry: expiry })
            .exec();
    }

    async findByVerificationToken(token: string): Promise<UserDocument | null> {
        return this.userModel.findOne({ emailVerificationToken: token }).exec();
    }

    async markEmailAsVerified(userId: string): Promise<void> {
        await this.userModel
            .findByIdAndUpdate(userId, {
                isEmailVerified: true,
                emailVerificationToken: null,
                emailVerificationExpiry: null,
            })
            .exec();
    }

    async markEmailAsUnverified(userId: string): Promise<void> {
        await this.userModel
            .findByIdAndUpdate(userId, { isEmailVerified: false })
            .exec();
    }

    async updatePassword(userId: string, passwordHash: string): Promise<void> {
        await this.userModel.findByIdAndUpdate(userId, { passwordHash }).exec();
    }

    async updateEmail(userId: string, email: string): Promise<void> {
        await this.userModel.findByIdAndUpdate(userId, { email }).exec();
    }

    async deleteUser(userId: string): Promise<void> {
        await this.userModel.findByIdAndDelete(userId).exec();
    }
}
