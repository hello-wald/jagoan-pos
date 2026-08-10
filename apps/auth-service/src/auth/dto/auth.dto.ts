import { createZodDto } from "nestjs-zod";
import {loginSchema, registerOwnerSchema} from "@app-k/shared"

export class LoginDto extends createZodDto(loginSchema) {}
export class RegisterOwnerDto extends createZodDto(registerOwnerSchema) {}