import { createZodDto } from "nestjs-zod";
import { z } from "zod";

export const GetPurchasesQuerySchema = z.object({
  email: z.email(),
});

export class GetPurchasesQueryDto extends createZodDto(GetPurchasesQuerySchema) {}
