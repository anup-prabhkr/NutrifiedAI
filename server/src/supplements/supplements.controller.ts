import {
    Controller,
    Post,
    Get,
    Put,
    Patch,
    Delete,
    Body,
    Param,
    Query,
    NotFoundException,
} from '@nestjs/common';
import { SupplementsService } from './supplements.service';
import { CreateSupplementDto } from './dto/create-supplement.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('supplements')
export class SupplementsController {
    constructor(private supplementsService: SupplementsService) { }

    @Post()
    async create(
        @CurrentUser() user: { userId: string },
        @Body() dto: CreateSupplementDto,
    ) {
        return this.supplementsService.create(user.userId, dto);
    }

    @Get()
    async findAll(@CurrentUser() user: { userId: string }) {
        return this.supplementsService.findAll(user.userId);
    }

    @Patch(':id/toggle')
    async toggleTaken(
        @CurrentUser() user: { userId: string },
        @Param('id') id: string,
        @Query('date') date?: string,
    ) {
        const toggleDate = date || new Date().toISOString().split('T')[0];
        return this.supplementsService.toggleTaken(user.userId, id, toggleDate);
    }

    @Put(':id')
    async update(
        @CurrentUser() user: { userId: string },
        @Param('id') id: string,
        @Body() dto: Partial<CreateSupplementDto>,
    ) {
        const updated = await this.supplementsService.update(user.userId, id, dto);
        if (!updated) throw new NotFoundException('Supplement not found');
        return updated;
    }

    @Delete(':id')
    async delete(
        @CurrentUser() user: { userId: string },
        @Param('id') id: string,
    ) {
        const deleted = await this.supplementsService.delete(user.userId, id);
        if (!deleted) throw new NotFoundException('Supplement not found');
        return { message: 'Supplement deleted' };
    }
}
