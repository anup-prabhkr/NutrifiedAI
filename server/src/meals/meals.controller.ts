import {
    Controller,
    Post,
    Get,
    Put,
    Delete,
    Body,
    Param,
    Query,
    BadRequestException,
    NotFoundException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { MealsService } from './meals.service';
import { GeminiService } from '../gemini/gemini.service';
import { CreateMealDto } from './dto/create-meal.dto';
import { AnalyzeMealDto } from './dto/analyze-meal.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('meals')
export class MealsController {
    constructor(
        private mealsService: MealsService,
        private geminiService: GeminiService,
    ) { }

    @Post('analyze')
    @Throttle({ default: { limit: 10, ttl: 60000 } })
    async analyze(
        @CurrentUser() user: { userId: string },
        @Body() dto: AnalyzeMealDto,
    ) {
        if (!dto.imageBase64 && !dto.description) {
            throw new BadRequestException('Provide either an image or text description');
        }

        if (dto.imageBase64) {
            return this.geminiService.analyzeImage(dto.imageBase64, dto.description);
        }

        return this.geminiService.analyzeText(dto.description!);
    }

    @Post()
    async create(
        @CurrentUser() user: { userId: string },
        @Body() dto: CreateMealDto,
    ) {
        return this.mealsService.create(user.userId, dto);
    }

    @Get()
    async findByDate(
        @CurrentUser() user: { userId: string },
        @Query('date') date?: string,
    ) {
        const queryDate = date || new Date().toISOString().split('T')[0];
        return this.mealsService.findByDate(user.userId, queryDate);
    }

    @Delete(':id')
    async delete(
        @CurrentUser() user: { userId: string },
        @Param('id') id: string,
    ) {
        const deleted = await this.mealsService.delete(user.userId, id);
        if (!deleted) {
            throw new NotFoundException('Meal not found');
        }
        return { message: 'Meal deleted' };
    }

    @Put(':id')
    async update(
        @CurrentUser() user: { userId: string },
        @Param('id') id: string,
        @Body() dto: Partial<CreateMealDto>,
    ) {
        const updated = await this.mealsService.update(user.userId, id, dto);
        if (!updated) {
            throw new NotFoundException('Meal not found');
        }
        return updated;
    }
}
