import type { CallHandler, ExecutionContext, NestInterceptor } from "@nestjs/common";
import { Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { ApiResponse } from "@workspace/shared-types";
import type { Observable } from "rxjs";
import { map } from "rxjs";
import { RESPONSE_MESSAGE_KEY } from "./response-message.decorator";

const DEFAULT_MESSAGE = "Success";

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler<T>): Observable<ApiResponse<T>> {
    const message =
      this.reflector.get<string>(RESPONSE_MESSAGE_KEY, context.getHandler()) ?? DEFAULT_MESSAGE;
    const statusCode = context.switchToHttp().getResponse().statusCode;

    return next.handle().pipe(map((data) => ({ statusCode, message, data })));
  }
}
