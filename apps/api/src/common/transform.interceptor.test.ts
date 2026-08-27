import type { CallHandler, ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { firstValueFrom, of } from "rxjs";
import { describe, expect, it } from "vitest";
import { RESPONSE_MESSAGE_KEY } from "./response-message.decorator";
import { TransformInterceptor } from "./transform.interceptor";

const createContext = (statusCode: number, handler: () => void): ExecutionContext =>
  ({
    getHandler: () => handler,
    switchToHttp: () => ({ getResponse: () => ({ statusCode }) }),
  }) as unknown as ExecutionContext;

describe("Given a route handler with no @ResponseMessage set", () => {
  describe("When a successful response is intercepted", () => {
    it("Then it wraps the payload with the default message", async () => {
      const interceptor = new TransformInterceptor(new Reflector());
      const context = createContext(200, () => {});
      const next: CallHandler = { handle: () => of({ foo: "bar" }) };

      const result = await firstValueFrom(interceptor.intercept(context, next));

      expect(result).toEqual({ statusCode: 200, message: "Success", data: { foo: "bar" } });
    });
  });
});

describe("Given a route handler decorated with @ResponseMessage", () => {
  describe("When a successful response is intercepted", () => {
    it("Then it uses the custom message", async () => {
      const handler = () => {};
      Reflect.defineMetadata(RESPONSE_MESSAGE_KEY, "Custom message", handler);
      const interceptor = new TransformInterceptor(new Reflector());
      const context = createContext(201, handler);
      const next: CallHandler = { handle: () => of("payload") };

      const result = await firstValueFrom(interceptor.intercept(context, next));

      expect(result.message).toBe("Custom message");
    });
  });
});
