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
    // Human-readable message (appends response data for Axios errors)
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

## API

### Error utilities

| Function | Description |
| --- | --- |
| `getErrorMessage(error)` | Human-readable message from any error type |
| `getErrorDetails(error)` | Message + optional stack trace |
| `getErrorDetail(error)` | Full structured `ErrorDetail` object |
| `isAxiosError(error)` | Type guard for Axios-like errors (duck-typed) |
| `isTimeoutError(error)` | Detects timeout errors |

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