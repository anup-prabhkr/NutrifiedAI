import { Controller, Get, Put, Body } from '@nestjs/common';
import { ProfileService } from './profile.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('profile')
export class ProfileController {
    constructor(private profileService: ProfileService) { }

    @Get()
    async getProfile(@CurrentUser() user: { userId: string }) {
        return this.profileService.getProfile(user.userId);
    }

    @Put()
    async updateProfile(
        @CurrentUser() user: { userId: string },
        @Body() dto: UpdateProfileDto,
    ) {
        return this.profileService.updateProfile(user.userId, dto);
    }
}
