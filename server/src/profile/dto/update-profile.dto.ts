import { IsString, IsNumber, IsOptional, IsObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class MacroTargetsDto {
    @IsOptional()
    @IsNumber()
    protein?: number;

    @IsOptional()
    @IsNumber()
    carbs?: number;

    @IsOptional()
    @IsNumber()
    fats?: number;
}

export class UpdateProfileDto {
    @IsOptional()
    @IsNumber()
    height?: number;

    @IsOptional()
    @IsNumber()
    weight?: number;

    @IsOptional()
    @IsNumber()
    age?: number;

    @IsOptional()
    @IsString()
    gender?: string;

    @IsOptional()
    @IsNumber()
    bodyFatPercentage?: number;

    @IsOptional()
    @IsString()
    activityLevel?: string;

    @IsOptional()
    @IsString()
    goal?: string;

    @IsOptional()
    @IsNumber()
    calorieTarget?: number;

    @IsOptional()
    @IsObject()
    @ValidateNested()
    @Type(() => MacroTargetsDto)
    macroTargets?: MacroTargetsDto;

    @IsOptional()
    manualMacros?: boolean;

    @IsOptional()
    @IsString()
    profilePicture?: string;

    @IsOptional()
    @IsString()
    name?: string;

    @IsOptional()
    @IsNumber()
    targetWeight?: number;

    @IsOptional()
    @IsNumber()
    weeklyWeightChange?: number;
}
