import { createCashierSchema, setCashierActiveSchema } from "@app-k/shared";
import { createZodDto } from "nestjs-zod";



export class CreateCashierDto extends createZodDto(createCashierSchema) {}

export class SetCashierActiveDto extends createZodDto(setCashierActiveSchema) {}