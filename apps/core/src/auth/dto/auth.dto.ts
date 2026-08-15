import { createZodDto } from "nestjs-zod";
import {loginSchema, registerOwnerSchema} from "@jagoan-pos/shared"

export class LoginDto extends createZodDto(loginSchema) {}
export class RegisterOwnerDto extends createZodDto(registerOwnerSchema) {}