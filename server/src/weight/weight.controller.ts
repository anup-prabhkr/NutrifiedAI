import { Controller, Post, Get, Put, Delete, Body, Param, Query, NotFoundException } from '@nestjs/common';
import { WeightService } from './weight.service';
import { CreateWeightDto } from './dto/create-weight.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('weight')
export class WeightController {
    constructor(private weightService: WeightService) { }

    @Post()
    async log(
        @CurrentUser() user: { userId: string },
        @Body() dto: CreateWeightDto,
    ) {
        return this.weightService.log(user.userId, dto.weight, dto.date);
    }

    @Get()
    async getHistory(
        @CurrentUser() user: { userId: string },
        @Query('range') range?: 'week' | 'month' | 'year' | 'all',
    ) {
        return this.weightService.getHistory(user.userId, range);
    }

    @Put(':id')
    async update(
        @CurrentUser() user: { userId: string },
        @Param('id') id: string,
        @Body() dto: CreateWeightDto,
    ) {
        const updated = await this.weightService.update(user.userId, id, dto.weight, dto.date);
        if (!updated) throw new NotFoundException('Weight log not found');
        return updated;
    }

    @Delete(':id')
    async delete(
        @CurrentUser() user: { userId: string },
        @Param('id') id: string,
    ) {
        const deleted = await this.weightService.delete(user.userId, id);
        if (!deleted) throw new NotFoundException('Weight log not found');
        return { message: 'Weight log deleted' };
    }
}
