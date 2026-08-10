import { loginSchema, registerOwnerSchema } from "@app-k/shared";
import { createZodDto } from "nestjs-zod";




export class LoginDto extends createZodDto(loginSchema){}
export class RegisterDto extends createZodDto(registerOwnerSchema){}