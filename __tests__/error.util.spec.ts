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
        expect(
            isAxiosError({ isAxiosError: false, message: 'fake' })
        ).toBe(false);
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