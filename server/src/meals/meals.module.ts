import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Meal, MealSchema } from './schemas/meal.schema';
import { MealsController } from './meals.controller';
import { MealsService } from './meals.service';

@Module({
    imports: [
        MongooseModule.forFeature([{ name: Meal.name, schema: MealSchema }]),
    ],
    controllers: [MealsController],
    providers: [MealsService],
    exports: [MealsService],
})
export class MealsModule { }
