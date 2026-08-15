import { createCashierSchema, setCashierActiveSchema } from "@jagoan-pos/shared";
import { createZodDto } from "nestjs-zod";



export class CreateCashierDto extends createZodDto(createCashierSchema) {}

export class SetCashierActiveDto extends createZodDto(setCashierActiveSchema) {}