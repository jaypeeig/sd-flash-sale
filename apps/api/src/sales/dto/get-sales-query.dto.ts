import type { GetSalesParams } from "@workspace/shared-types";
import { createZodDto } from "nestjs-zod";
import { z } from "zod";

const STATUS_VALUES = ["active", "upcoming", "past"] satisfies NonNullable<
  GetSalesParams["status"]
>[];

export const GetSalesQuerySchema = z.object({
  status: z.enum(STATUS_VALUES).optional(),
});

export class GetSalesQueryDto extends createZodDto(GetSalesQuerySchema) {}
