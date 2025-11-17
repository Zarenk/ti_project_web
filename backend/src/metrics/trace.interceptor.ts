import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { trace } from '@opentelemetry/api';
import { MetricsService } from './metrics.service';

@Injectable()
export class TelemetryInterceptor implements NestInterceptor {
  constructor(private readonly metrics: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const tracer = trace.getTracer('default');
    const span = tracer.startSpan(
      `${context.getClass().name}.${context.getHandler().name}`,
    );
    const start = process.hrtime();

    return next.handle().pipe(
      tap({
        next: () => {
          const diff = process.hrtime(start);
          const ms = diff[0] * 1000 + diff[1] / 1e6;
          this.metrics.requestDuration.observe(ms);
          span.end();
        },
        error: (err) => {
          const diff = process.hrtime(start);
          const ms = diff[0] * 1000 + diff[1] / 1e6;
          this.metrics.requestDuration.observe(ms);
          span.recordException(err);
          span.end();
        },
      }),
    );
  }
}
