import { Module } from '@nestjs/common';
import { SummaryController } from './summary.controller';
import { SummaryService } from './summary.service';
import { MealsModule } from '../meals/meals.module';

@Module({
    imports: [MealsModule],
    controllers: [SummaryController],
    providers: [SummaryService],
})
export class SummaryModule { }
