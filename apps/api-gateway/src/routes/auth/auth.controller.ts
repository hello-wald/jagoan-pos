import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import type { AuthUser, LoginResult, UserSummary } from '@jagoan-pos/contracts';
import { CoreClient } from '../../clients/core.client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { LoginDto, RegisterOwnerDto } from './dto/auth.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly core: CoreClient) {}

  /** Registers a merchant and its first OWNER. */
  @Post('register')
  register(@Body() dto: RegisterOwnerDto): Promise<UserSummary> {
    return this.core.send('auth.register', dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto): Promise<LoginResult> {
    return this.core.send('auth.login', dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  me(@CurrentUser() user: AuthUser): AuthUser {
    return user;
  }
}
