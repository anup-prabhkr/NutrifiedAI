import { IsString, IsNumber, IsOptional, IsEnum, Min, IsNotEmpty } from 'class-validator';

export class CreateMealDto {
    @IsString()
    @IsNotEmpty()
    mealName: string;

    @IsNumber()
    @Min(0)
    calories: number;

    @IsOptional()
    @IsNumber()
    @Min(0)
    protein?: number;

    @IsOptional()
    @IsNumber()
    @Min(0)
    carbs?: number;

    @IsOptional()
    @IsNumber()
    @Min(0)
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
