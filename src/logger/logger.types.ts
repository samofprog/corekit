/**
 * Generic key-value map for structured log data.
 *
 * Values that are `null` or `undefined` are automatically stripped
 * by {@link LoggerUtil} before serialization.
 *
 * @example
 * ```ts
 * const data: LogData = {
 *   userId: '123',
 *   action: 'login',
 *   ip: request.ip,
 *   agent: undefined, // will be stripped
 * };
 * ```
 */
export type LogData = Record<string, unknown>;
