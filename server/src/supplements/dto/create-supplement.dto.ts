import { IsString, IsOptional } from 'class-validator';

export class CreateSupplementDto {
    @IsString()
    name: string;

    @IsOptional()
    @IsString()
    dose?: string;

    @IsOptional()
    @IsString()
    frequency?: string;
}
