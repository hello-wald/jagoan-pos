import { Controller } from '@nestjs/common';
import { AuthService } from './auth.service';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { LoginDto, RegisterOwnerDto } from './dto/auth.dto';

@Controller('auth')
export class AuthController {
    constructor(private readonly authService:AuthService){}

    @MessagePattern('auth.register')
    register(@Payload() dto:RegisterOwnerDto){
        return this.authService.registerOwner(dto)
    }

    @MessagePattern('auth.login')
    login(@Payload() dto: LoginDto){
        return this.authService.login(dto)
    }
    
    // untuk skrg handle di fe doang 
    // @MessagePattern('auth.logout')
    // logout(@Payload() user: AuthUser){
    //     return this.authService.logout(user.id)
    // }

    @MessagePattern('auth.getUserById')
    getUser(@Payload() data: {userId:string}){
        return this.authService.getUserById(data.userId)
    }

}
