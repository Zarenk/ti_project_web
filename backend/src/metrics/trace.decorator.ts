import { trace } from '@opentelemetry/api';

export function TraceMethod(name?: string): MethodDecorator {
  return (target, propertyKey, descriptor: PropertyDescriptor) => {
    const original = descriptor.value;
    descriptor.value = function (...args: any[]) {
      const tracer = trace.getTracer('default');
      const span = tracer.startSpan(name || `${target.constructor.name}.${String(propertyKey)}`);
      try {
        const result = original.apply(this, args);
        if (result && typeof result.then === 'function') {
          return result
            .then((res: any) => {
              span.end();
              return res;
            })
            .catch((err: any) => {
              span.recordException(err);
              span.end();
              throw err;
            });
        }
        span.end();
        return result;
      } catch (err) {
        span.recordException(err as Error);
        span.end();
        throw err;
      }
    };
  };
}