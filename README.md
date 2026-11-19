# @samofprog/corekit

Shared NestJS utilities — error handling, structured logging, and more.

[![CI](https://github.com/samofprog/corekit/actions/workflows/ci.yml/badge.svg)](https://github.com/samofprog/corekit/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@samofprog/corekit)](https://www.npmjs.com/package/@samofprog/corekit)

## Installation

```bash
yarn add @samofprog/corekit
```

### Peer dependencies

```bash
yarn add @nestjs/common axios
```

> `axios` is optional — only required if you use the Axios error utilities.

## Usage

### Error handling

```ts
import {
    getErrorMessage,
    getErrorDetails,
    getErrorDetail,
    isAxiosError,
    isTimeoutError,
} from '@samofprog/corekit';

try {
    await axios.get('/api/users');
} catch (error) {
    // Human-readable message (appends response data for Axios errors, truncated to 2048 chars)
    const message = getErrorMessage(error);

    // Message + stack trace
    const { message, stack } = getErrorDetails(error);

    // Full structured detail (status, code, data, stack)
    const detail = getErrorDetail(error);

    // Type guards
    if (isAxiosError(error)) {
        console.log(error.response?.status);
    }

    if (isTimeoutError(error)) {
        // retry logic
    }
}
```

### Structured logging

```ts
import { Logger } from '@nestjs/common';
import { log, warn, error as logError } from '@samofprog/corekit';

const logger = new Logger('OrderService');

// Appends cleaned JSON data to the log message
log(logger, 'Order created', { orderId: 'ORD-42', total: 99.99 });
// => [OrderService] Order created {"orderId":"ORD-42","total":99.99}

// Null and undefined values are automatically stripped
warn(logger, 'Missing field', { email: null, name: 'Alice' });
// => [OrderService] Missing field {"name":"Alice"}

// Error with stack trace
logError(logger, 'Payment failed', { orderId: 'ORD-42' }, err.stack);
```

## Security notes

These helpers are built for server-side logs. Keep the following in mind:

- **Never return their output to clients.** `getErrorMessage` appends the upstream response body
  of Axios errors, and `getErrorDetail` exposes the stack trace and the raw response body. Both may
  contain secrets, tokens or personal data. In exception filters, send a generic message with the
  status code and log the detail server-side.
- **Response bodies are truncated in messages only.** `getErrorMessage` keeps at most 2048
  characters of serialized response data. `getErrorDetail(error).data` stays untruncated: do not
  log it as is when the upstream may return large payloads.
- **Never pass raw errors as log data.** `log(logger, 'Call failed', { err })` serializes an
  `AxiosError` through its `toJSON()`, which includes the request config with `Authorization`
  headers, cookies and credentials. Log `getErrorMessage(err)` or selected fields instead. Recent
  axios 1.x versions also accept a `redact` request option listing keys to mask.
- **Messages are not escaped.** Log data is JSON-encoded, but the `message` argument and error
  messages are written as is. With a text logger, a newline coming from user input can forge an
  extra log line: do not build log messages from untrusted input, or put that input in `data`.

## API

### Error utilities

| Function | Description |
| --- | --- |
| `getErrorMessage(error)` | Human-readable message from any error type, response data truncated to 2048 chars |
| `getErrorDetails(error)` | Message + optional stack trace |
| `getErrorDetail(error)` | Full structured `ErrorDetail` object |
| `isAxiosError(error)` | Type guard for Axios-like errors (duck-typed) |
| `isTimeoutError(error)` | Detects Axios timeouts (`ECONNABORTED`, `ETIMEDOUT`, or a message containing "timeout") |

### Logger utilities

| Function | Description |
| --- | --- |
| `log(logger, message, data?)` | Info level |
| `debug(logger, message, data?)` | Debug level |
| `warn(logger, message, data?)` | Warning level |
| `error(logger, message, data?, stack?)` | Error level with optional stack |

### Types

```ts
import type { ErrorDetail, AxiosLikeError, LogData } from '@samofprog/corekit';
```

## License

[MIT](./LICENCE)