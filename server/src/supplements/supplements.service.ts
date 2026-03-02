import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Supplement, SupplementDocument } from './schemas/supplement.schema';

@Injectable()
export class SupplementsService {
    constructor(
        @InjectModel(Supplement.name)
        private supplementModel: Model<SupplementDocument>,
    ) { }

    async create(
        userId: string,
        data: { name: string; dose?: string; frequency?: string },
    ): Promise<SupplementDocument> {
        const existing = await this.supplementModel.findOne({
            userId: new Types.ObjectId(userId),
            name: { $regex: new RegExp(`^${data.name}$`, 'i') },
        });
        if (existing) {
            throw new ConflictException('Supplement already exists');
        }

        return this.supplementModel.create({
            userId: new Types.ObjectId(userId),
            name: data.name,
            dose: data.dose,
            frequency: data.frequency || 'daily',
        });
    }

    async findAll(userId: string): Promise<SupplementDocument[]> {
        return this.supplementModel
            .find({ userId: new Types.ObjectId(userId) })
            .sort({ name: 1 })
            .exec();
    }

    async toggleTaken(userId: string, supplementId: string, date: string): Promise<SupplementDocument | null> {
        const supplement = await this.supplementModel.findOne({
            _id: new Types.ObjectId(supplementId),
            userId: new Types.ObjectId(userId),
        });

        if (!supplement) throw new NotFoundException('Supplement not found');

        const taken = supplement.takenDates.includes(date);
        if (taken) {
            supplement.takenDates = supplement.takenDates.filter((d) => d !== date);
        } else {
            supplement.takenDates.push(date);
        }

        return supplement.save();
    }

    async delete(userId: string, supplementId: string): Promise<boolean> {
        const result = await this.supplementModel.deleteOne({
            _id: new Types.ObjectId(supplementId),
            userId: new Types.ObjectId(userId),
        });
        return result.deletedCount > 0;
    }

    async update(
        userId: string,
        supplementId: string,
        data: { name?: string; dose?: string; frequency?: string },
    ): Promise<SupplementDocument | null> {
        return this.supplementModel
            .findOneAndUpdate(
                {
                    _id: new Types.ObjectId(supplementId),
                    userId: new Types.ObjectId(userId),
                },
                { $set: data },
                { new: true },
            )
            .exec();
    }
}
