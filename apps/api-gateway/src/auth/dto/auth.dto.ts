import { loginSchema, registerOwnerSchema } from "@jagoan-pos/shared";
import { createZodDto } from "nestjs-zod";




export class LoginDto extends createZodDto(loginSchema){}
export class RegisterOwnerDto extends createZodDto(registerOwnerSchema){}