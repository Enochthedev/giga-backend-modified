import { NodeSDK } from '@opentelemetry/sdk-node';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { trace, context, SpanStatusCode, SpanKind } from '@opentelemetry/api';
import { v4 as uuidv4 } from 'uuid';

interface TracingConfig {
    serviceName: string;
    serviceVersion?: string;
    jaegerEndpoint?: string;
    environment?: string;
}

class TracingService {
    private sdk: NodeSDK;
    private tracer: any;
    private serviceName: string;

    constructor(config: TracingConfig) {
        this.serviceName = config.serviceName;

        const jaegerExporter = new JaegerExporter({
            endpoint: config.jaegerEndpoint || process.env.JAEGER_ENDPOINT || 'http://localhost:14268/api/traces',
        });

        this.sdk = new NodeSDK({
            resource: new Resource({
                [SemanticResourceAttributes.SERVICE_NAME]: config.serviceName,
                [SemanticResourceAttributes.SERVICE_VERSION]: config.serviceVersion || '1.0.0',
                [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: config.environment || process.env.NODE_ENV || 'development',
            }),
            traceExporter: jaegerExporter,
            instrumentations: [
                getNodeAutoInstrumentations({
                    '@opentelemetry/instrumentation-fs': {
                        enabled: false, // Disable file system instrumentation to reduce noise
                    },
                }),
            ],
        });

        this.tracer = trace.getTracer(config.serviceName);
    }

    /**
     * Initialize tracing for the service
     */
    initialize(): void {
        this.sdk.start();
        console.log(`Tracing initialized for service: ${this.serviceName}`);
    }

    /**
     * Shutdown tracing gracefully
     */
    async shutdown(): Promise<void> {
        await this.sdk.shutdown();
    }

    /**
     * Create a new span for tracing operations
     */
    createSpan(name: string, options?: {
        kind?: SpanKind;
        attributes?: Record<string, string | number | boolean>;
        parentContext?: any;
    }) {
        const span = this.tracer.startSpan(name, {
            kind: options?.kind || SpanKind.INTERNAL,
            attributes: options?.attributes,
        }, options?.parentContext);

        return span;
    }

    /**
     * Trace an async function execution
     */
    async traceFunction<T>(
        name: string,
        fn: () => Promise<T>,
        options?: {
            attributes?: Record<string, string | number | boolean>;
            kind?: SpanKind;
        }
    ): Promise<T> {
        const span = this.createSpan(name, options);

        try {
            const result = await context.with(trace.setSpan(context.active(), span), fn);
            span.setStatus({ code: SpanStatusCode.OK });
            return result;
        } catch (error) {
            span.setStatus({
                code: SpanStatusCode.ERROR,
                message: error instanceof Error ? error.message : 'Unknown error',
            });
            span.recordException(error as Error);
            throw error;
        } finally {
            span.end();
        }
    }

    /**
     * Trace HTTP requests
     */
    traceHttpRequest(req: any, res: any, next: any): void {
        const correlationId = req.headers['x-correlation-id'] || uuidv4();
        req.correlationId = correlationId;
        res.setHeader('x-correlation-id', correlationId);

        const span = this.createSpan(`${req.method} ${req.route?.path || req.path}`, {
            kind: SpanKind.SERVER,
            attributes: {
                'http.method': req.method,
                'http.url': req.originalUrl || req.url,
                'http.user_agent': req.headers['user-agent'],
                'correlation.id': correlationId,
                'user.id': req.user?.id,
            },
        });

        // Add span to request for use in handlers
        req.span = span;

        const originalEnd = res.end;
        res.end = function (this: any, ...args: any[]) {
            span.setAttributes({
                'http.status_code': res.statusCode,
                'http.response.size': res.get('content-length') || 0,
            });

            if (res.statusCode >= 400) {
                span.setStatus({
                    code: SpanStatusCode.ERROR,
                    message: `HTTP ${res.statusCode}`,
                });
            } else {
                span.setStatus({ code: SpanStatusCode.OK });
            }

            span.end();
            originalEnd.apply(this, args);
        };

        next();
    }

    /**
     * Trace database operations
     */
    traceDatabaseOperation<T>(
        operation: string,
        table: string,
        fn: () => Promise<T>,
        query?: string
    ): Promise<T> {
        return this.traceFunction(
            `db.${operation}`,
            fn,
            {
                kind: SpanKind.CLIENT,
                attributes: {
                    'db.operation': operation,
                    'db.table': table,
                    'db.statement': query?.substring(0, 200), // Truncate long queries
                },
            }
        );
    }

    /**
     * Trace external API calls
     */
    traceExternalCall<T>(
        serviceName: string,
        operation: string,
        fn: () => Promise<T>,
        url?: string
    ): Promise<T> {
        return this.traceFunction(
            `external.${serviceName}.${operation}`,
            fn,
            {
                kind: SpanKind.CLIENT,
                attributes: {
                    'external.service': serviceName,
                    'external.operation': operation,
                    'external.url': url,
                },
            }
        );
    }

    /**
     * Trace message queue operations
     */
    traceMessageQueue<T>(
        operation: 'publish' | 'consume',
        queue: string,
        fn: () => Promise<T>,
        messageId?: string
    ): Promise<T> {
        return this.traceFunction(
            `queue.${operation}`,
            fn,
            {
                kind: operation === 'publish' ? SpanKind.PRODUCER : SpanKind.CONSUMER,
                attributes: {
                    'messaging.operation': operation,
                    'messaging.destination': queue,
                    'messaging.message_id': messageId,
                },
            }
        );
    }

    /**
     * Add custom attributes to current span
     */
    addAttributes(attributes: Record<string, string | number | boolean>): void {
        const span = trace.getActiveSpan();
        if (span) {
            span.setAttributes(attributes);
        }
    }

    /**
     * Add an event to current span
     */
    addEvent(name: string, attributes?: Record<string, string | number | boolean>): void {
        const span = trace.getActiveSpan();
        if (span) {
            span.addEvent(name, attributes);
        }
    }

    /**
     * Get correlation ID from current context
     */
    getCorrelationId(): string | undefined {
        const span = trace.getActiveSpan();
        return span?.getSpanContext()?.traceId;
    }
}

// Factory function to create tracing service
export function createTracingService(config: TracingConfig): TracingService {
    return new TracingService(config);
}

export { TracingService, TracingConfig };