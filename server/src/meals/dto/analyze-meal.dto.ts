import { IsString, IsOptional } from 'class-validator';

export class AnalyzeMealDto {
    @IsOptional()
    @IsString()
    description?: string; // Text description of the meal

    @IsOptional()
    @IsString()
    imageBase64?: string; // Base64-encoded image
}
