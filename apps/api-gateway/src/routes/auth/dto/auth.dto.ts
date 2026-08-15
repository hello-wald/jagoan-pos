import { createZodDto } from 'nestjs-zod';
import { loginSchema, registerOwnerSchema } from '@jagoan-pos/contracts';

export class LoginDto extends createZodDto(loginSchema) {}
export class RegisterOwnerDto extends createZodDto(registerOwnerSchema) {}
