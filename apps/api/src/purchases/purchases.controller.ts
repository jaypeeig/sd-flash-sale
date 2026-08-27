import { Controller, Get, Query } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import type { GetPurchasesResponse } from "@workspace/shared-types";
import { ResponseMessage } from "../common/response-message.decorator";
import { GetPurchasesQueryDto } from "./dto/get-purchases-query.dto";
import { PurchasesService } from "./purchases.service";

@ApiTags("Purchases")
@Controller("purchases")
export class PurchasesController {
  constructor(private readonly purchasesService: PurchasesService) {}

  @ApiOperation({ summary: "Get all purchases made by a given user" })
  @ApiResponse({ status: 200, description: "List of this user's purchases" })
  @ResponseMessage("Purchases retrieved successfully")
  @Get()
  getPurchases(@Query() query: GetPurchasesQueryDto): Promise<GetPurchasesResponse["data"]> {
    return this.purchasesService.findByEmail(query.email);
  }
}
