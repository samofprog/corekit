import { describe, it, expect } from 'vitest';
import {
    getErrorMessage,
    getErrorDetails,
    getErrorDetail,
    isAxiosError,
    isTimeoutError,
} from '../src/index.js';
import type { AxiosLikeError, ErrorDetail } from '../src/index.js';

// ── Helpers ─────────────────────────────────────────────────────────

function makeAxiosError(
    overrides: Partial<AxiosLikeError> = {}
): AxiosLikeError {
    return {
        isAxiosError: true,
        message: 'Request failed with status code 404',
        code: 'ERR_BAD_REQUEST',
        stack: 'Error: ...\n    at Object.<anonymous>',
        response: { status: 404, data: { error: 'Not Found' } },
        ...overrides,
    };
}

// ── getErrorMessage ─────────────────────────────────────────────────

describe('getErrorMessage', () => {
    it('should extract message with response data from an Axios-like error', () => {
        const error = makeAxiosError();

        expect(getErrorMessage(error)).toBe(
            'Request failed with status code 404 {"error":"Not Found"}'
        );
    });

    it('should return base message when Axios error has no response data', () => {
        const error = makeAxiosError({ response: { status: 500 } });

        expect(getErrorMessage(error)).toBe(
            'Request failed with status code 404'
        );
    });

    it('should return base message when Axios response data is null', () => {
        const error = makeAxiosError({
            response: { status: 500, data: null },
        });

        expect(getErrorMessage(error)).toBe(
            'Request failed with status code 404'
        );
    });

    it('should return base message when response data is not serializable', () => {
        const circular: Record<string, unknown> = {};
        circular.self = circular;
        const error = makeAxiosError({
            response: { status: 500, data: circular },
        });

        expect(getErrorMessage(error)).toBe(
            'Request failed with status code 404'
        );
    });

    it('should extract message from a native Error', () => {
        expect(getErrorMessage(new Error('boom'))).toBe('boom');
    });

    it('should extract message from a TypeError', () => {
        expect(getErrorMessage(new TypeError('not a function'))).toBe(
            'not a function'
        );
    });

    it('should coerce a string to itself', () => {
        expect(getErrorMessage('raw string')).toBe('raw string');
    });

    it('should coerce a number to string', () => {
        expect(getErrorMessage(42)).toBe('42');
    });

    it('should coerce null to string', () => {
        expect(getErrorMessage(null)).toBe('null');
    });

    it('should coerce undefined to string', () => {
        expect(getErrorMessage(undefined)).toBe('undefined');
    });
});

// ── getErrorDetails ─────────────────────────────────────────────────

describe('getErrorDetails', () => {
    it('should return message and stack for a native Error', () => {
        const error = new Error('fail');
        const result = getErrorDetails(error);

        expect(result.message).toBe('fail');
        expect(result.stack).toBeDefined();
        expect(result.stack).toContain('fail');
    });

    it('should return message and stack for an Axios-like error', () => {
        const error = makeAxiosError();
        const result = getErrorDetails(error);

        expect(result.message).toContain('Request failed');
        expect(result.stack).toBeUndefined();
    });

    it('should return message only for non-Error values', () => {
        const result = getErrorDetails('just a string');

        expect(result.message).toBe('just a string');
        expect(result.stack).toBeUndefined();
    });
});

// ── getErrorDetail ──────────────────────────────────────────────────

describe('getErrorDetail', () => {
    it('should return full detail for an Axios-like error', () => {
        const error = makeAxiosError();
        const detail: ErrorDetail = getErrorDetail(error);

        expect(detail).toEqual({
            message: 'Request failed with status code 404',
            code: 'ERR_BAD_REQUEST',
            status: 404,
            data: { error: 'Not Found' },
            stack: expect.any(String),
        });
    });

    it('should return detail for a native Error', () => {
        const error = new RangeError('out of bounds');
        const detail = getErrorDetail(error);

        expect(detail.message).toBe('out of bounds');
        expect(detail.code).toBe('RangeError');
        expect(detail.stack).toBeDefined();
        expect(detail.status).toBeUndefined();
    });

    it('should serialize a plain object as the message', () => {
        const obj = { foo: 'bar' };
        const detail = getErrorDetail(obj);

        expect(detail.message).toBe('{"foo":"bar"}');
        expect(detail.data).toBe(obj);
    });

    it('should coerce a primitive to string', () => {
        const detail = getErrorDetail(123);

        expect(detail.message).toBe('123');
        expect(detail.data).toBe(123);
    });

    it('should handle null', () => {
        const detail = getErrorDetail(null);

        expect(detail.message).toBe('null');
        expect(detail.data).toBeNull();
    });
});

// ── isAxiosError ────────────────────────────────────────────────────

describe('isAxiosError', () => {
    it('should return true for an Axios-like error', () => {
        expect(isAxiosError(makeAxiosError())).toBe(true);
    });

    it('should return false for a native Error', () => {
        expect(isAxiosError(new Error('nope'))).toBe(false);
    });

    it('should return false for a plain object without isAxiosError', () => {
        expect(isAxiosError({ message: 'hi' })).toBe(false);
    });

    it('should return false for an object with isAxiosError = false', () => {
        expect(isAxiosError({ isAxiosError: false, message: 'fake' })).toBe(
            false
        );
    });

    it('should return false for null', () => {
        expect(isAxiosError(null)).toBe(false);
    });

    it('should return false for a string', () => {
        expect(isAxiosError('not an error')).toBe(false);
    });
});

// ── isTimeoutError ──────────────────────────────────────────────────

describe('isTimeoutError', () => {
    it('should detect ECONNABORTED code', () => {
        const error = makeAxiosError({ code: 'ECONNABORTED' });

        expect(isTimeoutError(error)).toBe(true);
    });

    it('should detect "timeout" in message', () => {
        const error = makeAxiosError({
            message: 'timeout of 5000ms exceeded',
            code: undefined,
        });

        expect(isTimeoutError(error)).toBe(true);
    });

    it('should return false for a non-timeout Axios error', () => {
        expect(isTimeoutError(makeAxiosError())).toBe(false);
    });

    it('should return false for a native Error', () => {
        expect(isTimeoutError(new Error('timeout'))).toBe(false);
    });

    it('should return false for null', () => {
        expect(isTimeoutError(null)).toBe(false);
    });
});
describe('hostile thrown values', () => {
    const circular: Record<string, unknown> = { id: 1 };
    circular['self'] = circular;
    const nullProto = Object.create(null) as object;
    const throwingToString = {
        toString(): string {
            throw new Error('nope');
        },
    };

    it('should not throw on circular, bigint or null-prototype objects', () => {
        for (const value of [
            circular,
            { id: 1n },
            nullProto,
            throwingToString,
        ]) {
            expect(() => getErrorMessage(value)).not.toThrow();
            expect(() => getErrorDetails(value)).not.toThrow();
            expect(typeof getErrorDetail(value).message).toBe('string');
        }
    });

    it('should fall back to the object tag when string coercion fails', () => {
        expect(getErrorMessage(nullProto)).toBe('[object Object]');
        expect(getErrorDetail(circular).message).toBe('[object Object]');
        expect(getErrorDetail(circular).data).toBe(circular);
    });

    it('should return a string message for undefined primitives', () => {
        expect(getErrorDetail(undefined).message).toBe('undefined');
    });

    it('should not throw on axios markers without a string message', () => {
        expect(getErrorMessage({ isAxiosError: true })).toBe('');
        expect(getErrorMessage({ isAxiosError: true, message: 42 })).toBe('42');
        expect(isTimeoutError({ isAxiosError: true })).toBe(false);
        expect(isTimeoutError({ isAxiosError: true, message: {} })).toBe(false);
    });

    it('should keep status and data of axios errors without a message', () => {
        const error = {
            isAxiosError: true,
            code: 'ERR_BAD_RESPONSE',
            response: { status: 502, data: { reason: 'down' } },
        };
        expect(isAxiosError(error)).toBe(true);
        expect(getErrorDetail(error)).toMatchObject({
            message: '',
            status: 502,
            data: { reason: 'down' },
        });
        expect(getErrorMessage(error)).toBe('{"reason":"down"}');
    });

    it('should not throw when the axios marker getter throws', () => {
        const hostile = {
            get isAxiosError(): boolean {
                throw new Error('nope');
            },
        };
        expect(isAxiosError(hostile)).toBe(false);
        expect(() => getErrorMessage(hostile)).not.toThrow();
    });

    it('should serialize bigint response data', () => {
        const error = makeAxiosError({
            response: { status: 500, data: { id: 10n } },
        });
        expect(getErrorMessage(error)).toBe(
            'Request failed with status code 404 {"id":"10"}'
        );
    });

    it('should detect ETIMEDOUT and case-insensitive timeout messages', () => {
        expect(
            isTimeoutError(
                makeAxiosError({
                    code: 'ETIMEDOUT',
                    message: 'connect ETIMEDOUT 10.0.0.1:443',
                })
            )
        ).toBe(true);
        expect(
            isTimeoutError(
                makeAxiosError({
                    code: 'ERR',
                    message: 'Timeout of 5000ms exceeded',
                })
            )
        ).toBe(true);
    });

    it('should keep the base message when response data cannot be serialized', () => {
        const error = makeAxiosError({
            response: { status: 500, data: circular },
        });
        expect(getErrorMessage(error)).toBe(
            'Request failed with status code 404'
        );
    });

    it('should read the top-level status when there is no response', () => {
        const error = makeAxiosError({ status: 503, response: undefined });
        expect(getErrorDetail(error).status).toBe(503);
    });
});

describe('response data truncation', () => {
    it('should keep response data up to 2048 characters', () => {
        const data = 'a'.repeat(2046);
        const error = makeAxiosError({ response: { status: 500, data } });
        expect(getErrorMessage(error)).toBe(
            `Request failed with status code 404 "${data}"`
        );
    });

    it('should truncate longer response data with a marker', () => {
        const error = makeAxiosError({
            response: { status: 500, data: 'a'.repeat(5000) },
        });
        const message = getErrorMessage(error);
        expect(message).toBe(
            `Request failed with status code 404 "${'a'.repeat(2047)}…[truncated 2954 chars]`
        );
    });

    it('should not truncate getErrorDetail data', () => {
        const data = 'a'.repeat(5000);
        const error = makeAxiosError({ response: { status: 500, data } });
        expect(getErrorDetail(error).data).toBe(data);
    });

    it('should not split a surrogate pair when truncating', () => {
        const data = 'a'.repeat(2046) + '😀😀';
        const error = makeAxiosError({ response: { status: 500, data } });
        const message = getErrorMessage(error);
        expect(message).toContain(`"${'a'.repeat(2046)}…[truncated 5 chars]`);
        expect(message).not.toMatch(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/);
    });
});
