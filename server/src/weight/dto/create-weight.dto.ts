import { IsNumber, IsOptional, IsDate } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateWeightDto {
    @IsNumber()
    weight: number;

    @IsOptional()
    @Type(() => Date)
    @IsDate()
    date?: Date;
}
