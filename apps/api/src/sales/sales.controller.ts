import { Body, Controller, Get, HttpCode, Param, Post, Query } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import type {
  GetSaleByIdResponse,
  GetSalesResponse,
  PostPurchaseResponse,
} from "@workspace/shared-types";
import { UuidParamDto } from "../common/dto/uuid-param.dto";
import { ResponseMessage } from "../common/response-message.decorator";
import { CreatePurchaseDto } from "../purchases/dto/create-purchase.dto";
import { PurchasesService } from "../purchases/purchases.service";
import { GetSalesQueryDto } from "./dto/get-sales-query.dto";
import { SalesService } from "./sales.service";

@ApiTags("Sales")
@Controller("sales")
export class SalesController {
  constructor(
    private readonly salesService: SalesService,
    private readonly purchasesService: PurchasesService,
  ) {}

  @ApiOperation({ summary: "List sales, optionally filtered by phase" })
  @ApiResponse({ status: 200, description: "List of sales matching the filter" })
  @ResponseMessage("Sales retrieved successfully")
  @Get()
  getSales(@Query() query: GetSalesQueryDto): Promise<GetSalesResponse["data"]> {
    return this.salesService.findAll(query.status);
  }

  @ApiOperation({ summary: "Get a single sale's detail" })
  @ApiResponse({ status: 200, description: "Sale detail" })
  @ResponseMessage("Sale retrieved successfully")
  @Get(":id")
  getSaleById(@Param() params: UuidParamDto): Promise<GetSaleByIdResponse["data"]> {
    return this.salesService.findById(params.id);
  }

  @ApiOperation({ summary: "Attempt to purchase one unit of the sale's product" })
  @ApiResponse({ status: 200, description: "Purchase attempt processed" })
  @ResponseMessage("Purchase processed")
  @HttpCode(200)
  @Post(":id/purchase")
  purchase(
    @Param() params: UuidParamDto,
    @Body() body: CreatePurchaseDto,
  ): Promise<PostPurchaseResponse["data"]> {
    return this.purchasesService.purchase(params.id, body.email);
  }
}
