import { Injectable } from "@nestjs/common";
import { collectDefaultMetrics, Counter, Histogram, Registry } from "prom-client";

@Injectable()
export class MetricsService {
  private readonly registry = new Registry();
  private readonly httpDuration: Histogram;
  private readonly httpErrors: Counter;

  constructor() {
    collectDefaultMetrics({ register: this.registry });
    this.httpDuration = new Histogram({
      name: "http_request_duration_seconds",
      help: "HTTP request duration in seconds",
      labelNames: ["method", "route", "statusCode"],
      registers: [this.registry]
    });
    this.httpErrors = new Counter({
      name: "http_request_errors_total",
      help: "HTTP request errors",
      labelNames: ["method", "route", "statusCode"],
      registers: [this.registry]
    });
  }

  observeHttp(method: string, route: string, statusCode: number, seconds: number): void {
    this.httpDuration.labels(method, route, String(statusCode)).observe(seconds);
    if (statusCode >= 500) this.httpErrors.labels(method, route, String(statusCode)).inc();
  }

  render(): Promise<string> {
    return this.registry.metrics();
  }
}
