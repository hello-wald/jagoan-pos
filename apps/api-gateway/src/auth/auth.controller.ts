import { Body, Controller, Inject, Post, UseGuards } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { CurrentUser } from './decorator/current-user.decorator';
import { JwtGuard } from './guards/jwt.guard';
import { ApiBearerAuth } from '@nestjs/swagger';
import { LoginDto, RegisterOwnerDto } from './dto/auth.dto';
import { type JwtPayload } from '@app-k/shared';

@Controller('auth')
export class AuthController {
    constructor(@Inject('AUTH_SERVICE') private readonly authClient: ClientProxy){}

    @Post('login')
    login(@Body() dto:LoginDto){
        return this.authClient.send(`auth.login`, dto).pipe()
    }

    // auto jadi owner
    @Post('register')
    register(@Body() dto: RegisterOwnerDto){
        return this.authClient.send(`auth.register`, dto)
    }

    @UseGuards(JwtGuard)
    @ApiBearerAuth()
    @Post('logout')
    logout(@CurrentUser() user:JwtPayload){
        return this.authClient.send(`auth.logout`, user)
    }

    // @UseGuards(JwtGuard)
    // @ApiBearerAuth()
    // @Get('protected')
    // getProtected(@CurrentUser() user: JwtPayload){
    //     return {
    //         message: "Guard Valid"
    //     }
    // }

}
