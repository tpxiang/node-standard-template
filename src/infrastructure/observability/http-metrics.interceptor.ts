import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Injectable,
  NestInterceptor
} from "@nestjs/common";
import { FastifyReply, FastifyRequest } from "fastify";
import { hrtime } from "node:process";
import { Observable, tap } from "rxjs";
import { MetricsService } from "./metrics.service";

@Injectable()
export class HttpMetricsInterceptor implements NestInterceptor {
  constructor(private readonly metrics: MetricsService) {}
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<FastifyRequest>();
    const reply = http.getResponse<FastifyReply>();
    const startedAt = hrtime.bigint();
    const route = request.routeOptions?.url ?? request.url.split("?")[0] ?? "unknown";
    let errorStatus: number | undefined;
    return next.handle().pipe(
      tap({
        error: (error: unknown) => {
          errorStatus = error instanceof HttpException ? error.getStatus() : 500;
        },
        finalize: () =>
          this.metrics.observeHttp(
            request.method,
            route,
            errorStatus ?? reply.statusCode,
            Number(hrtime.bigint() - startedAt) / 1_000_000_000
          )
      })
    );
  }
}
