import { Body, Controller, Get, Inject, Post, UseGuards } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { CurrentUser } from './decorator/current-user.decorator';
import { JwtGuard } from './guards/jwt.guard';
import { ApiBearerAuth } from '@nestjs/swagger';
import { LoginDto, RegisterOwnerDto } from './dto/auth.dto';
import { type AuthUser } from '@jagoan-pos/shared';
import { RolesGuard } from './guards/role.guard';
import { Roles } from './decorator/role.decorator';

@Controller('auth')
export class AuthController {
    constructor(@Inject('CORE_SERVICE') private readonly authClient: ClientProxy){}

    @Post('login')
    login(@Body() dto:LoginDto){
        return this.authClient.send(`auth.login`, dto)
    }

    // auto jadi owner
    @Post('register')
    register(@Body() dto: RegisterOwnerDto){
        return this.authClient.send(`auth.register`, dto)
    }

    @UseGuards(JwtGuard)
    @ApiBearerAuth()
    @Get('protected')
    getProtected(@CurrentUser() user: AuthUser){
        return user
    }

    @UseGuards(JwtGuard, RolesGuard)
    @Get('protectedRoles')
    @Roles('GLOBAL_ADMIN')
    @ApiBearerAuth()
    getProtectedRoles(@CurrentUser() user: AuthUser){
        return user.role
    }

}
