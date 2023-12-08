<h1 align="center">shm </h1>

<p align="center">Simple http mocking for unit tests in node, and react-native, with good developer experience</p>

## Installation

```bash
yarn add --dev @matthieug/shm
```

```ts
// `jest-setupAfterEnv.js` or equivalent

import { installInterceptor, expectRequestsToMatchHandlers } from "@matthieug/shm";

// Prevent all outgoing network requests -- Unhandled requests will be responded to with a 404
installInterceptor();

// Fail tests when there are unhandled requests or unused handlers, and clear handlers
afterEach(expectRequestsToMatchHandlers);
```

## Usage in tests

Create your mock server:

```ts
// `src/testing/mockServer.ts` or equivalent
import { createMockServer } from "@matthieug/shm";

export const mockServer = createMockServer("https://test.com");
```

Then use it in your tests:

```ts
import { mockServer } from "src/testing/mockServer";

// Mock a request -- short syntax for the 90% case
mockServer.get<BodyType>("some-route", body);

// Or full syntax for more control
mockServer.get<BodyType>("some-route", {
  response: { body, statusCode: 401 }
});

// Match any path param value
mockServer.get<BodyType>("item/:id", body);

// Or specify the value(s) to match
mockServer.get<BodyType>("item/:id", {
  request: { pathParams: { id: "12" }}
  response: { body }
});

// Match search params -- a request must contain *at least* the specified search params to match
mockServer.get<BodyType>("item", {
  request: { searchParams: { id: "12" }}
  response: { body }
});

// Check that the correct body was sent
const mockHandler = mockServer.post("item", body)

await fetch("https://test.com/item", { method: "POST", body: requestBody });

expect(await mockHandler.getSentBody()).toEqual(requestBody);

// All usual http methods are supported with the same API
```

## Usage in a React Native app

> 🚧 Usage in a browser environment is not yet supported

The API is the same, but there are a few additionnal options that you may want to use in this scenario:

```ts
import { createMockServer, uninstallInterceptor } from "@matthieug/shm";

const mockServer = createMockServer("https://test.com", {
  // options specified here will apply to all handlers
  delayMs: 500, // view your loading states
  persistent: true, // allow handlers to respond to multiple matching requests
});

// When you want to make real requests again
uninstallInterceptor();
```

## Setup APIs

### `installInterceptor()`

Patch {`fetch`, `XHR`, `node:http`, `RCTNetworking`} to intercept outgoing requests.

All requests will be responded to with a **404** error, unless a matching handler was defined.

The interception is done:

- with the great [@mswjs/interceptors](https://github.com/mswjs/interceptors) library for node and the browser
- by [patching the `RCTNetworking` module](./src/interceptor.native.ts) for react-native

### `expectRequestsToMatchHandlers()`

It is highly recommended to use this function in your tests by calling it in the `afterEach` hook of your test runner. It does 3 things:

- reset the mock handlers, to **keep tests isolated**
- throw an error if a handler was not consumed, to **enforce removal of the unused handlers** that could creep up as your code evolves
- throw an error if a request was not handled, to **ensure your tests do not pass "by coincidence"** and help with debugging issues

Here's what the error output will look like:

```ts
mockServer.get("hello", body);
await fetch("https://test.com/hallo");

expectRequestsToMatchHandlers();
// SHM: Received requests did not match defined handlers
//   UNHANDLED REQUEST: GET https://test.com/hello
//       --> handler GET https://test.com/hallo -> url /hallo !== /hello
```

## MockServer API

### `createMockerServer`

Create a "mock server" instance for a given domain.
This will install the interceptor if not yet installed.

```ts
import { createMockServer } from "shm";

export const mockServer = createMockServer("https://test.com");
```

### `mockServer.get` / `mockServer.post` / `mockServer.put` / ...

Create a mock handler for a given http method and path.

> **⚠️ Important**
>
> - A handler will be used to respond to **1 (ONE)** matching request. After that, it's "consumed" (unless you use the `persistent` option is used)
> - handlers don't override each other (even with the same url), they are used in a _first-in-first-out_ order, except for handlers with a `persistent` option, which are used last

You can use the one-line syntax for most of your mocks:

```ts
const mockHandler = mockServer.get<BodyType>("some-route", responseBody);
```

And switch to the full options when needed:

```ts
const mockHandler = mockServer.get<BodyType>("some-route/:id", {
  request: {
    pathParams: { id: "1" }
    searchParams: { lang: "fr" }
  },
  response: {
    status: 418
    body: { message: "here is your mock" }
  },
})
```

All usual http methods are available, you can also use `mockServer.all` to match any method.

Have a look at the [type definition](./src/types.ts) for more details.

### `mockHandler.wasCalled`

Check that a request matching the mock handler was made.

```ts
expect(mockHandler.wasCalled()).toBe(true);
```

This can be useful even if you're using the recommended setup with `expectRequestsToMatchHandlers`, eg to:

- make the expectation explicit ("when user clicks this, my app should save that to the backend")
- wait for the call to have been made
- check that the call was made at the right time in a multi-step tests

### `mockHandler.getSentBody`

Get the body that was received by the mock handler.

Returns `undefined` if the handler was not yet consumed.

```ts
expect(await mockHandler.getSentBody()).toEqual(requestBody);
```

## Why this package?

There are great alternatives out there, like [msw](https://mswjs.io/) or [nock](https://github.com/nock/nock).

This package provides a simpler API that may be enough for your use case, and promotes a certain way to define and use api mocks in tests.

- **Enforce maintenance** of API mocks, by failing tests on unhandled requests and unused handlers
- No way to write complex request matchers. Tests should **avoid conditionnals**, and this principle includes your mock definitions (otherwise you should write tests for your tests 🤔)
- Check that your application code is sending the correct request (eg with `mock.getSentBody()`) through **assertions**, instead of by coincidentally definining the right handler
- Prefer specifying the necessary mocks for each test, so that you **know at a glance what APIs your feature/component needs**
