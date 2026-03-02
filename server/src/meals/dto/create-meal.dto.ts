import { IsString, IsNumber, IsOptional, IsEnum } from 'class-validator';

export class CreateMealDto {
    @IsString()
    mealName: string;

    @IsNumber()
    calories: number;

    @IsOptional()
    @IsNumber()
    protein?: number;

    @IsOptional()
    @IsNumber()
    carbs?: number;

    @IsOptional()
    @IsNumber()
    fats?: number;

    @IsOptional()
    @IsString()
    imageUrl?: string;

    @IsOptional()
    @IsEnum(['ai', 'manual'])
    source?: string;

    @IsOptional()
    @IsNumber()
    aiConfidence?: number;

    @IsOptional()
    @IsString()
    date?: string; // YYYY-MM-DD, defaults to today
}
