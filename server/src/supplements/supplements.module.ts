import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Supplement, SupplementSchema } from './schemas/supplement.schema';
import { SupplementsController } from './supplements.controller';
import { SupplementsService } from './supplements.service';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Supplement.name, schema: SupplementSchema },
        ]),
    ],
    controllers: [SupplementsController],
    providers: [SupplementsService],
    exports: [SupplementsService],
})
export class SupplementsModule { }
