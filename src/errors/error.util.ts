import type { AxiosLikeError, ErrorDetail } from './error.types.js';

const MAX_RESPONSE_DATA_LENGTH = 2048;

/**
 * Duck-typing guard for Axios-like errors.
 * Checks for the `isAxiosError: true` property that axios sets on all its errors.
 *
 * @internal
 */
function isAxiosLikeError(error: unknown): error is AxiosLikeError {
    try {
        return (
            typeof error === 'object' &&
            error !== null &&
            'isAxiosError' in error &&
            (error as Record<string, unknown>).isAxiosError === true
        );
    } catch {
        return false;
    }
}

function toSafeString(value: unknown): string {
    try {
        return String(value);
    } catch {
        return Object.prototype.toString.call(value);
    }
}

function axiosMessage(error: AxiosLikeError): string {
    const message: unknown = error.message;
    return typeof message === 'string' ? message : toSafeString(message ?? '');
}

function toSafeJson(value: unknown): string | undefined {
    try {
        const json: unknown = JSON.stringify(value, (_, v: unknown) =>
            typeof v === 'bigint' ? v.toString() : v
        );
        return typeof json === 'string' ? json : undefined;
    } catch {
        return undefined;
    }
}

function truncate(text: string): string {
    if (text.length <= MAX_RESPONSE_DATA_LENGTH) {
        return text;
    }

    const lastCode = text.charCodeAt(MAX_RESPONSE_DATA_LENGTH - 1);
    const end =
        lastCode >= 0xd800 && lastCode <= 0xdbff
            ? MAX_RESPONSE_DATA_LENGTH - 1
            : MAX_RESPONSE_DATA_LENGTH;
    const removed = text.length - end;
    return `${text.slice(0, end)}…[truncated ${String(removed)} chars]`;
}

/**
 * Extracts a human-readable error message from any thrown value.
 *
 * - **Axios errors**: returns the base message with stringified response data appended,
 *   truncated to 2048 characters. The response body comes from the upstream server and may
 *   contain secrets or personal data: use it for server-side logs only, never in client responses.
 * - **Native errors**: returns `error.message`.
 * - **Other values**: coerced to string via `String(error)`.
 *
 * @param error - The caught value (can be anything).
 * @returns A formatted, human-readable error message.
 *
 * @example
 * ```ts
 * import { getErrorMessage } from '@samofprog/corekit';
 *
 * try {
 *   await axios.post('/api/orders', payload);
 * } catch (error) {
 *   console.error(getErrorMessage(error));
 *   // => "Request failed with status code 422 {\"field\":\"email\",\"reason\":\"invalid\"}"
 * }
 * ```
 */
export function getErrorMessage(error: unknown): string {
    if (isAxiosLikeError(error)) {
        const base = axiosMessage(error);
        const responseData = error.response?.data;

        if (responseData === undefined || responseData === null) {
            return base;
        }

        const serialized = toSafeJson(responseData);
        if (serialized === undefined) {
            return base;
        }

        const json = truncate(serialized);
        return base ? `${base} ${json}` : json;
    }

    if (error instanceof Error) {
        return error.message;
    }

    return toSafeString(error);
}

/**
 * Extracts the error message alongside the stack trace when available.
 *
 * Useful for structured logging where both the message and the
 * origin of the error matter.
 *
 * @param error - The caught value.
 * @returns An object with `message` and an optional `stack`.
 *
 * @example
 * ```ts
 * import { getErrorDetails } from '@samofprog/corekit';
 *
 * catch (error) {
 *   const { message, stack } = getErrorDetails(error);
 *   logger.error(message, stack);
 * }
 * ```
 */
export function getErrorDetails(error: unknown): {
    readonly message: string;
    readonly stack?: string | undefined;
} {
    const message = getErrorMessage(error);

    if (error instanceof Error) {
        return { message, stack: error.stack };
    }

    return { message };
}

/**
 * Returns a structured {@link ErrorDetail} object with as much
 * information as can be extracted from the error.
 *
 * - **Axios errors**: includes `code`, HTTP `status`, response `data`, and `stack`.
 * - **Native errors**: includes `code` (set to `error.name`) and `stack`.
 * - **Plain objects**: serialized to JSON as the message, with the raw value as `data`.
 * - **Primitives**: coerced to string.
 *
 * The result includes the stack trace and the raw upstream response body.
 * It is meant for server-side logs: never send it as is in an HTTP response.
 *
 * @param error - The caught value.
 * @returns A normalized {@link ErrorDetail} object.
 *
 * @example
 * ```ts
 * import { getErrorDetail } from '@samofprog/corekit';
 *
 * catch (error) {
 *   const detail = getErrorDetail(error);
 *   // detail.status  => 404
 *   // detail.code    => "ERR_BAD_REQUEST"
 *   // detail.data    => { error: "Not Found" }
 *   // detail.message => "Request failed with status code 404"
 * }
 * ```
 */
export function getErrorDetail(error: unknown): ErrorDetail {
    if (isAxiosLikeError(error)) {
        return {
            message: axiosMessage(error),
            code: error.code,
            status: error.status ?? error.response?.status,
            data: error.response?.data,
            stack: error.stack,
        };
    }

    if (error instanceof Error) {
        return {
            message: error.message,
            code: error.name,
            stack: error.stack,
        };
    }

    if (typeof error === 'object' && error !== null) {
        return {
            message: toSafeJson(error) ?? toSafeString(error),
            data: error,
        };
    }

    return {
        message: toSafeString(error),
        data: error,
    };
}

/**
 * Type guard that checks whether `error` is an Axios-like error.
 *
 * Uses duck-typing (checks for the `isAxiosError: true` property)
 * instead of `instanceof`, so it works reliably even when multiple
 * versions of `axios` are installed.
 *
 * @param error - The caught value.
 * @returns `true` if the value matches the {@link AxiosLikeError} shape.
 *
 * @example
 * ```ts
 * import { isAxiosError } from '@samofprog/corekit';
 *
 * catch (error) {
 *   if (isAxiosError(error)) {
 *     console.log(error.response?.status); // narrowed to AxiosLikeError
 *   }
 * }
 * ```
 */
export function isAxiosError(error: unknown): error is AxiosLikeError {
    return isAxiosLikeError(error);
}

/**
 * Checks whether the error is a network timeout.
 *
 * Detects the `ECONNABORTED` and `ETIMEDOUT` codes set by Axios and
 * any Axios error whose message contains `"timeout"` (case-insensitive).
 *
 * @param error - The caught value.
 * @returns `true` if the error represents a timeout.
 *
 * @example
 * ```ts
 * import { isTimeoutError } from '@samofprog/corekit';
 *
 * catch (error) {
 *   if (isTimeoutError(error)) {
 *     // retry or notify the user
 *   }
 * }
 * ```
 */
export function isTimeoutError(error: unknown): boolean {
    if (isAxiosLikeError(error)) {
        return (
            error.code === 'ECONNABORTED' ||
            error.code === 'ETIMEDOUT' ||
            axiosMessage(error).toLowerCase().includes('timeout')
        );
    }
    return false;
}
