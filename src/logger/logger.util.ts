import type { Logger } from '@nestjs/common';
import type { LogData } from './logger.types.js';

/**
 * Formats a log message by appending cleaned JSON data.
 *
 * Uses `JSON.stringify`'s built-in replacer to strip nulls in a
 * single pass with zero intermediate allocations. Undefined values
 * are already omitted by `JSON.stringify` natively.
 *
 * @internal
 */
function formatLog(message: string, data?: LogData): string {
    if (!data || typeof data !== 'object') {
        return message;
    }

    try {
        const json = JSON.stringify(data, (_, v: unknown) =>
            v === null ? undefined : v
        );

        return !json || json === '{}' ? message : `${message} ${json}`;
    } catch {
        return message;
    }
}

/**
 * Logs an informational message with optional structured data.
 *
 * @param logger  - The NestJS {@link Logger} instance.
 * @param message - The log message.
 * @param data    - Optional structured data to append as JSON.
 *
 * @example
 * ```ts
 * import { Logger } from '@nestjs/common';
 * import { log } from '@samofprog/corekit';
 *
 * const logger = new Logger('PaymentService');
 * log(logger, 'Payment processed', { orderId: 'ORD-42', amount: 99.99 });
 * // => [PaymentService] Payment processed {"orderId":"ORD-42","amount":99.99}
 * ```
 */
export function log(logger: Logger, message: string, data?: LogData): void {
    logger.log(formatLog(message, data));
}

/**
 * Logs a debug-level message with optional structured data.
 *
 * @param logger  - The NestJS {@link Logger} instance.
 * @param message - The log message.
 * @param data    - Optional structured data to append as JSON.
 */
export function debug(logger: Logger, message: string, data?: LogData): void {
    logger.debug(formatLog(message, data));
}

/**
 * Logs a warning message with optional structured data.
 *
 * @param logger  - The NestJS {@link Logger} instance.
 * @param message - The log message.
 * @param data    - Optional structured data to append as JSON.
 */
export function warn(logger: Logger, message: string, data?: LogData): void {
    logger.warn(formatLog(message, data));
}

/**
 * Logs an error message with optional structured data and stack trace.
 *
 * @param logger  - The NestJS {@link Logger} instance.
 * @param message - The log message.
 * @param data    - Optional structured data to append as JSON.
 * @param stack   - Optional stack trace string.
 *
 * @example
 * ```ts
 * import { getErrorDetails, error as logError } from '@samofprog/corekit';
 *
 * catch (err) {
 *   const { message, stack } = getErrorDetails(err);
 *   logError(logger, message, { endpoint: '/api/users' }, stack);
 * }
 * ```
 */
export function error(
    logger: Logger,
    message: string,
    data?: LogData,
    stack?: string
): void {
    logger.error(formatLog(message, data), stack);
}
