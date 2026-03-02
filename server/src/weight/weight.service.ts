import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { WeightLog, WeightLogDocument } from './schemas/weight-log.schema';

@Injectable()
export class WeightService {
    constructor(
        @InjectModel(WeightLog.name) private weightModel: Model<WeightLogDocument>,
    ) { }

    async log(userId: string, weight: number, date?: Date): Promise<WeightLogDocument> {
        const logDate = date || new Date();
        // Normalize to start of day
        logDate.setHours(0, 0, 0, 0);

        return this.weightModel.findOneAndUpdate(
            { userId: new Types.ObjectId(userId), date: logDate },
            { weight },
            { upsert: true, new: true },
        );
    }

    async getHistory(
        userId: string,
        range: 'week' | 'month' | 'year' | 'all' = 'month',
    ): Promise<WeightLogDocument[]> {
        const query: any = { userId: new Types.ObjectId(userId) };

        if (range !== 'all') {
            const startDate = new Date();
            switch (range) {
                case 'week':
                    startDate.setDate(startDate.getDate() - 7);
                    break;
                case 'month':
                    startDate.setMonth(startDate.getMonth() - 1);
                    break;
                case 'year':
                    startDate.setFullYear(startDate.getFullYear() - 1);
                    break;
            }
            query.date = { $gte: startDate };
        }

        return this.weightModel.find(query).sort({ date: -1 }).exec();
    }

    async update(userId: string, logId: string, weight: number, date?: Date): Promise<WeightLogDocument | null> {
        const updateFields: Record<string, any> = { weight };
        if (date) {
            date.setHours(0, 0, 0, 0);
            updateFields.date = date;
        }
        return this.weightModel.findOneAndUpdate(
            { _id: new Types.ObjectId(logId), userId: new Types.ObjectId(userId) },
            { $set: updateFields },
            { new: true },
        ).exec();
    }

    async delete(userId: string, logId: string): Promise<boolean> {
        const result = await this.weightModel.deleteOne({
            _id: new Types.ObjectId(logId),
            userId: new Types.ObjectId(userId),
        });
        return result.deletedCount > 0;
    }
}
