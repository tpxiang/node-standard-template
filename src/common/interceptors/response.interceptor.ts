/**
 * 统一成功响应拦截器。
 * 将控制器返回值包装为 { success, data, requestId, timestamp }。
 */
import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { FastifyRequest } from "fastify";
import { map, Observable } from "rxjs";

interface ApiResponse<T> {
  success: true;
  data: T;
  requestId?: string;
  timestamp: string;
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler<T>): Observable<ApiResponse<T>> {
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const requestId = request.headers["x-request-id"]?.toString();

    return next.handle().pipe(
      map((data) => ({
        success: true,
        data,
        requestId,
        timestamp: new Date().toISOString()
      }))
    );
  }
}
