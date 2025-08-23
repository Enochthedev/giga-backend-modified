/**
 * HTTP Status codes and utilities
 */

export const HTTP_STATUS = {
    // 1xx Informational
    CONTINUE: 100,
    SWITCHING_PROTOCOLS: 101,
    PROCESSING: 102,

    // 2xx Success
    OK: 200,
    CREATED: 201,
    ACCEPTED: 202,
    NON_AUTHORITATIVE_INFORMATION: 203,
    NO_CONTENT: 204,
    RESET_CONTENT: 205,
    PARTIAL_CONTENT: 206,
    MULTI_STATUS: 207,
    ALREADY_REPORTED: 208,
    IM_USED: 226,

    // 3xx Redirection
    MULTIPLE_CHOICES: 300,
    MOVED_PERMANENTLY: 301,
    FOUND: 302,
    SEE_OTHER: 303,
    NOT_MODIFIED: 304,
    USE_PROXY: 305,
    TEMPORARY_REDIRECT: 307,
    PERMANENT_REDIRECT: 308,

    // 4xx Client Error
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    PAYMENT_REQUIRED: 402,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    METHOD_NOT_ALLOWED: 405,
    NOT_ACCEPTABLE: 406,
    PROXY_AUTHENTICATION_REQUIRED: 407,
    REQUEST_TIMEOUT: 408,
    CONFLICT: 409,
    GONE: 410,
    LENGTH_REQUIRED: 411,
    PRECONDITION_FAILED: 412,
    PAYLOAD_TOO_LARGE: 413,
    URI_TOO_LONG: 414,
    UNSUPPORTED_MEDIA_TYPE: 415,
    RANGE_NOT_SATISFIABLE: 416,
    EXPECTATION_FAILED: 417,
    IM_A_TEAPOT: 418,
    MISDIRECTED_REQUEST: 421,
    UNPROCESSABLE_ENTITY: 422,
    LOCKED: 423,
    FAILED_DEPENDENCY: 424,
    TOO_EARLY: 425,
    UPGRADE_REQUIRED: 426,
    PRECONDITION_REQUIRED: 428,
    TOO_MANY_REQUESTS: 429,
    REQUEST_HEADER_FIELDS_TOO_LARGE: 431,
    UNAVAILABLE_FOR_LEGAL_REASONS: 451,

    // 5xx Server Error
    INTERNAL_SERVER_ERROR: 500,
    NOT_IMPLEMENTED: 501,
    BAD_GATEWAY: 502,
    SERVICE_UNAVAILABLE: 503,
    GATEWAY_TIMEOUT: 504,
    HTTP_VERSION_NOT_SUPPORTED: 505,
    VARIANT_ALSO_NEGOTIATES: 506,
    INSUFFICIENT_STORAGE: 507,
    LOOP_DETECTED: 508,
    NOT_EXTENDED: 510,
    NETWORK_AUTHENTICATION_REQUIRED: 511
} as const;

export type HttpStatusCode = typeof HTTP_STATUS[keyof typeof HTTP_STATUS];

/**
 * HTTP Status utility class
 */
export class HttpStatusUtil {
    /**
     * Check if status code is informational (1xx)
     */
    public static isInformational(statusCode: number): boolean {
        return statusCode >= 100 && statusCode < 200;
    }

    /**
     * Check if status code is successful (2xx)
     */
    public static isSuccess(statusCode: number): boolean {
        return statusCode >= 200 && statusCode < 300;
    }

    /**
     * Check if status code is redirection (3xx)
     */
    public static isRedirection(statusCode: number): boolean {
        return statusCode >= 300 && statusCode < 400;
    }

    /**
     * Check if status code is client error (4xx)
     */
    public static isClientError(statusCode: number): boolean {
        return statusCode >= 400 && statusCode < 500;
    }

    /**
     * Check if status code is server error (5xx)
     */
    public static isServerError(statusCode: number): boolean {
        return statusCode >= 500 && statusCode < 600;
    }

    /**
     * Check if status code is error (4xx or 5xx)
     */
    public static isError(statusCode: number): boolean {
        return this.isClientError(statusCode) || this.isServerError(statusCode);
    }

    /**
     * Get status message for status code
     */
    public static getStatusMessage(statusCode: number): string {
        const messages: { [key: number]: string } = {
            // 1xx Informational
            100: 'Continue',
            101: 'Switching Protocols',
            102: 'Processing',

            // 2xx Success
            200: 'OK',
            201: 'Created',
            202: 'Accepted',
            203: 'Non-Authoritative Information',
            204: 'No Content',
            205: 'Reset Content',
            206: 'Partial Content',
            207: 'Multi-Status',
            208: 'Already Reported',
            226: 'IM Used',

            // 3xx Redirection
            300: 'Multiple Choices',
            301: 'Moved Permanently',
            302: 'Found',
            303: 'See Other',
            304: 'Not Modified',
            305: 'Use Proxy',
            307: 'Temporary Redirect',
            308: 'Permanent Redirect',

            // 4xx Client Error
            400: 'Bad Request',
            401: 'Unauthorized',
            402: 'Payment Required',
            403: 'Forbidden',
            404: 'Not Found',
            405: 'Method Not Allowed',
            406: 'Not Acceptable',
            407: 'Proxy Authentication Required',
            408: 'Request Timeout',
            409: 'Conflict',
            410: 'Gone',
            411: 'Length Required',
            412: 'Precondition Failed',
            413: 'Payload Too Large',
            414: 'URI Too Long',
            415: 'Unsupported Media Type',
            416: 'Range Not Satisfiable',
            417: 'Expectation Failed',
            418: "I'm a teapot",
            421: 'Misdirected Request',
            422: 'Unprocessable Entity',
            423: 'Locked',
            424: 'Failed Dependency',
            425: 'Too Early',
            426: 'Upgrade Required',
            428: 'Precondition Required',
            429: 'Too Many Requests',
            431: 'Request Header Fields Too Large',
            451: 'Unavailable For Legal Reasons',

            // 5xx Server Error
            500: 'Internal Server Error',
            501: 'Not Implemented',
            502: 'Bad Gateway',
            503: 'Service Unavailable',
            504: 'Gateway Timeout',
            505: 'HTTP Version Not Supported',
            506: 'Variant Also Negotiates',
            507: 'Insufficient Storage',
            508: 'Loop Detected',
            510: 'Not Extended',
            511: 'Network Authentication Required'
        };

        return messages[statusCode] || 'Unknown Status';
    }

    /**
     * Get status category
     */
    public static getStatusCategory(statusCode: number): string {
        if (this.isInformational(statusCode)) return 'Informational';
        if (this.isSuccess(statusCode)) return 'Success';
        if (this.isRedirection(statusCode)) return 'Redirection';
        if (this.isClientError(statusCode)) return 'Client Error';
        if (this.isServerError(statusCode)) return 'Server Error';
        return 'Unknown';
    }

    /**
     * Create status response object
     */
    public static createStatusResponse(statusCode: number, data?: any) {
        return {
            statusCode,
            message: this.getStatusMessage(statusCode),
            category: this.getStatusCategory(statusCode),
            success: this.isSuccess(statusCode),
            data,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Common status responses
     */
    public static responses = {
        ok: (data?: any) => this.createStatusResponse(HTTP_STATUS.OK, data),
        created: (data?: any) => this.createStatusResponse(HTTP_STATUS.CREATED, data),
        accepted: (data?: any) => this.createStatusResponse(HTTP_STATUS.ACCEPTED, data),
        noContent: () => this.createStatusResponse(HTTP_STATUS.NO_CONTENT),
        badRequest: (message?: string) => this.createStatusResponse(HTTP_STATUS.BAD_REQUEST, { error: message }),
        unauthorized: (message?: string) => this.createStatusResponse(HTTP_STATUS.UNAUTHORIZED, { error: message }),
        forbidden: (message?: string) => this.createStatusResponse(HTTP_STATUS.FORBIDDEN, { error: message }),
        notFound: (message?: string) => this.createStatusResponse(HTTP_STATUS.NOT_FOUND, { error: message }),
        conflict: (message?: string) => this.createStatusResponse(HTTP_STATUS.CONFLICT, { error: message }),
        unprocessableEntity: (message?: string) => this.createStatusResponse(HTTP_STATUS.UNPROCESSABLE_ENTITY, { error: message }),
        tooManyRequests: (message?: string) => this.createStatusResponse(HTTP_STATUS.TOO_MANY_REQUESTS, { error: message }),
        internalServerError: (message?: string) => this.createStatusResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, { error: message }),
        serviceUnavailable: (message?: string) => this.createStatusResponse(HTTP_STATUS.SERVICE_UNAVAILABLE, { error: message }),
        gatewayTimeout: (message?: string) => this.createStatusResponse(HTTP_STATUS.GATEWAY_TIMEOUT, { error: message })
    };
}