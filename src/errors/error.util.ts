import type { AxiosLikeError, ErrorDetail } from './error.types.js';

/**
 * Duck-typing guard for Axios-like errors.
 * Checks for the `isAxiosError: true` property that axios sets on all its errors.
 *
 * @internal
 */
function isAxiosLikeError(error: unknown): error is AxiosLikeError {
    return (
        typeof error === 'object' &&
        error !== null &&
        'isAxiosError' in error &&
        (error as Record<string, unknown>).isAxiosError === true
    );
}

/**
 * Extracts a human-readable error message from any thrown value.
 *
 * - **Axios errors**: returns the base message with stringified response data appended.
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
        const base = error.message;
        const responseData = error.response?.data;

        if (responseData !== undefined && responseData !== null) {
            try {
                return `${base} ${JSON.stringify(responseData)}`;
            } catch {
                return base;
            }
        }

        return base;
    }

    if (error instanceof Error) {
        return error.message;
    }

    return String(error);
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
            message: error.message,
            code: error.code,
            status: error.response?.status,
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
            message: JSON.stringify(error),
            data: error,
        };
    }

    return {
        message: String(error),
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
 * Detects both the `ECONNABORTED` code set by Axios and
 * any error whose message contains the word `"timeout"`.
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
            error.code === 'ECONNABORTED' || error.message.includes('timeout')
        );
    }
    return false;
}
