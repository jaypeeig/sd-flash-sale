import { createZodDto } from "nestjs-zod";
import { z } from "zod";

export const CreatePurchaseSchema = z.object({
  email: z.email(),
});

export class CreatePurchaseDto extends createZodDto(CreatePurchaseSchema) {}
