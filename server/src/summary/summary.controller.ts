import { Controller, Get } from '@nestjs/common';
import { SummaryService } from './summary.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('summary')
export class SummaryController {
    constructor(private summaryService: SummaryService) { }

    @Get('weekly')
    async getWeeklySummary(@CurrentUser() user: { userId: string }) {
        return this.summaryService.getWeeklySummary(user.userId);
    }
}
