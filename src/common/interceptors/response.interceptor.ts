/**
 * 统一成功响应拦截器。
 * 将控制器返回值包装为 { success, data, requestId, timestamp }。
 */
import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { FastifyRequest } from "fastify";
import { map, Observable } from "rxjs";
import { toJsonValue } from "../serialization/json-serializer";

interface ApiResponse<T> {
  success: true;
  data: T;
  requestId?: string;
  timestamp: string;
}

const RAW_BODY_PATHS = new Set(["/metrics"]);

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, ApiResponse<T> | T> {
  intercept(context: ExecutionContext, next: CallHandler<T>): Observable<ApiResponse<T> | T> {
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const path = request.url?.split("?")[0] ?? "";
    if (RAW_BODY_PATHS.has(path)) return next.handle();
    const requestId = request.headers["x-request-id"]?.toString();

    return next.handle().pipe(
      map((data) => ({
        success: true,
        data: toJsonValue(data),
        requestId,
        timestamp: new Date().toISOString()
      }))
    );
  }
}
