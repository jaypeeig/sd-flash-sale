import { BadRequestException, Controller, Get, Query } from "@nestjs/common";
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from "@nestjs/swagger";
import type { GetSalesParams, GetSalesResponse } from "@workspace/shared-types";
import { SalesService } from "./sales.service";

const VALID_STATUSES: NonNullable<GetSalesParams["status"]>[] = ["active", "upcoming", "past"];

@ApiTags("Sales")
@Controller("sales")
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @ApiOperation({ summary: "List sales, optionally filtered by phase" })
  @ApiQuery({ name: "status", required: false, enum: VALID_STATUSES })
  @ApiResponse({ status: 200, description: "List of sales matching the filter" })
  @Get()
  getSales(@Query("status") status?: string): Promise<GetSalesResponse> {
    if (
      status !== undefined &&
      !VALID_STATUSES.includes(status as (typeof VALID_STATUSES)[number])
    ) {
      throw new BadRequestException(`status must be one of: ${VALID_STATUSES.join(", ")}`);
    }

    return this.salesService.findAll(status as GetSalesParams["status"]);
  }
}
