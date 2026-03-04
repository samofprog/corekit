/**
 * Structured error information returned by {@link getErrorDetail}.
 *
 * All properties are `readonly` to prevent accidental mutation
 * after extraction. Optional properties accept `undefined` to
 * satisfy `exactOptionalPropertyTypes`.
 *
 * @example
 * ```ts
 * import { getErrorDetail } from '@samofprog/corekit';
 *
 * const detail: ErrorDetail = getErrorDetail(error);
 * console.log(detail.message); // "Request failed with status code 404"
 * console.log(detail.status);  // 404
 * ```
 */
export type ErrorDetail = {
    readonly message: string;
    readonly code?: string | undefined;
    readonly status?: number | undefined;
    readonly data?: unknown;
    readonly stack?: string | undefined;
};

/**
 * Shape of an Axios-like error detected via duck-typing.
 *
 * This type mirrors the relevant subset of `AxiosError` without
 * importing it, so the package works regardless of which `axios`
 * version is installed (or even if `axios` is not installed at all).
 *
 * @see {@link isAxiosError} for the runtime type guard.
 */
export type AxiosLikeError = {
    readonly isAxiosError: true;
    readonly message: string;
    readonly code?: string | undefined;
    readonly stack?: string | undefined;
    readonly response?:
        | {
              readonly status?: number | undefined;
              readonly data?: unknown;
          }
        | undefined;
};
