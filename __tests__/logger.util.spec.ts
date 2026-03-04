import { describe, it, expect, vi } from 'vitest';
import { log, debug, warn, error } from '../src/index.js';
import type { Logger } from '@nestjs/common';

// ── Mock Logger ─────────────────────────────────────────────────────

function createMockLogger(): Logger {
    return {
        log: vi.fn(),
        debug: vi.fn(),

        warn: vi.fn(),
        error: vi.fn(),
    } as unknown as Logger;
}

// ── Log levels ──────────────────────────────────────────────────────

describe('Logger log levels', () => {
    it('should call logger.log with the formatted message', () => {
        const logger = createMockLogger();

        log(logger, 'test message', { key: 'value' });

        expect(logger.log).toHaveBeenCalledWith(
            'test message {"key":"value"}'
        );
    });

    it('should call logger.debug with the formatted message', () => {
        const logger = createMockLogger();

        debug(logger, 'test message', { key: 'value' });

        expect(logger.debug).toHaveBeenCalledWith(
            'test message {"key":"value"}'
        );
    });

    it('should call logger.warn with the formatted message', () => {
        const logger = createMockLogger();

        warn(logger, 'test message', { key: 'value' });

        expect(logger.warn).toHaveBeenCalledWith(
            'test message {"key":"value"}'
        );
    });

    it('should call logger.error with message and stack', () => {
        const logger = createMockLogger();
        const stack = 'Error: fail\n    at Object.<anonymous>';

        error(logger, 'boom', { code: 500 }, stack);

        expect(logger.error).toHaveBeenCalledWith(
            'boom {"code":500}',
            stack
        );
    });

    it('should call logger.error without stack when omitted', () => {
        const logger = createMockLogger();

        error(logger, 'boom', { code: 500 });

        expect(logger.error).toHaveBeenCalledWith(
            'boom {"code":500}',
            undefined
        );
    });
});

// ── formatLog behaviour ─────────────────────────────────────────────

describe('Logger formatting', () => {
    it('should return plain message when data is undefined', () => {
        const logger = createMockLogger();

        log(logger, 'no data');

        expect(logger.log).toHaveBeenCalledWith('no data');
    });

    it('should strip null values from data', () => {
        const logger = createMockLogger();

        log(logger, 'msg', { a: 1, b: null });

        expect(logger.log).toHaveBeenCalledWith('msg {"a":1}');
    });

    it('should strip undefined values from data', () => {
        const logger = createMockLogger();

        log(logger, 'msg', { a: 'ok', b: undefined });

        expect(logger.log).toHaveBeenCalledWith('msg {"a":"ok"}');
    });

    it('should return plain message when all values are null or undefined', () => {
        const logger = createMockLogger();

        log(logger, 'empty', { a: null, b: undefined });

        expect(logger.log).toHaveBeenCalledWith('empty');
    });

    it('should return plain message for an empty data object', () => {
        const logger = createMockLogger();

        log(logger, 'empty', {});

        expect(logger.log).toHaveBeenCalledWith('empty');
    });

    it('should preserve falsy but meaningful values (0, false, empty string)', () => {
        const logger = createMockLogger();

        log(logger, 'msg', { count: 0, active: false, name: '' });

        expect(logger.log).toHaveBeenCalledWith(
            'msg {"count":0,"active":false,"name":""}'
        );
    });

    it('should handle nested objects', () => {
        const logger = createMockLogger();

        log(logger, 'msg', {
            user: { id: 1, name: 'Alice' },
        });

        expect(logger.log).toHaveBeenCalledWith(
            'msg {"user":{"id":1,"name":"Alice"}}'
        );
    });

    it('should fallback to plain message on circular references', () => {
        const logger = createMockLogger();
        const circular: Record<string, unknown> = { a: 1 };
        circular.self = circular;

        log(logger, 'oops', circular);

        expect(logger.log).toHaveBeenCalledWith('oops');
    });
});