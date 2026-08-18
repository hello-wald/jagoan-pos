import {
  Body,
  Controller,
  ForbiddenException,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { AuthUser, AiChatResponse } from '@jagoan-pos/contracts';
import { AnalyticsClient } from '../../clients/analytics.client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AiChatMessageDto } from './dto/ai-insight.dto';

@ApiTags('AI Insight')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('ai-insight')
export class AiInsightController {
  constructor(private readonly analytics: AnalyticsClient) {}

  @Post('chat')
  @Roles('OWNER')
  @HttpCode(HttpStatus.OK)
  chat(@CurrentUser() user: AuthUser, @Body() body: AiChatMessageDto): Promise<AiChatResponse> {
    return this.analytics.send('ai.chat', {
      merchantId: requireMerchant(user),
      message: body.message,
    });
  }
}

function requireMerchant(user: AuthUser): string {
  if (!user.merchantId) {
    throw new ForbiddenException('Caller must belong to a merchant');
  }
  return user.merchantId;
}
