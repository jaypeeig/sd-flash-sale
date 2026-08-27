import { createZodDto } from "nestjs-zod";
import { z } from "zod";

export const UuidParamSchema = z.object({
  id: z.uuid(),
});

export class UuidParamDto extends createZodDto(UuidParamSchema) {}
