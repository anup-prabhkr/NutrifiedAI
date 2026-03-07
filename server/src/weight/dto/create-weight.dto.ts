import { IsNumber, IsOptional, IsDate, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateWeightDto {
    @IsNumber()
    @Min(1)
    @Max(500)
    weight: number;

    @IsOptional()
    @Type(() => Date)
    @IsDate()
    date?: Date;
}
