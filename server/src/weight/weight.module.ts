import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WeightLog, WeightLogSchema } from './schemas/weight-log.schema';
import { WeightController } from './weight.controller';
import { WeightService } from './weight.service';

@Module({
    imports: [
        MongooseModule.forFeature([{ name: WeightLog.name, schema: WeightLogSchema }]),
    ],
    controllers: [WeightController],
    providers: [WeightService],
    exports: [WeightService],
})
export class WeightModule { }
