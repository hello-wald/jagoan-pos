import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import type { CoreRequest, CoreResponse } from '@jagoan-pos/contracts';
import { AuthService } from './auth.service';
import { LoginDto, RegisterOwnerDto } from './dto/auth.dto';

@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @MessagePattern('auth.register')
  register(@Payload() dto: RegisterOwnerDto): Promise<CoreResponse<'auth.register'>> {
    return this.authService.registerOwner(dto);
  }

  @MessagePattern('auth.login')
  login(@Payload() dto: LoginDto): Promise<CoreResponse<'auth.login'>> {
    return this.authService.login(dto);
  }

  @MessagePattern('auth.getUserById')
  getUserById(
    @Payload() payload: CoreRequest<'auth.getUserById'>,
  ): Promise<CoreResponse<'auth.getUserById'>> {
    return this.authService.getUserById(payload.userId);
  }
}
