# shm

> Simple http mocking for tests

## Install

```bash
yarn add --dev shm
```

```ts
// `jest-setup.js` or equivalent

import { installInterceptor, expectRequestsToMatchHandlers } from "shm";

// Prevent all outgoing network requests -- Unhandled requests will be responded to with a 404 error
installInterceptor();

// Fail tests when there are unhandled requests or unused handlers, and clear handlers
afterEach(expectRequestsToMatchHandlers);
```

## Usage

```ts
// `src/testing/mockServer.ts` or equivalent
import { createMockServer } from "shm";

export const mockServer = createMockServer("https://shm.com");
```

```ts
// inside tests
import { mockServer } from "src/testing/mockServer";

// short syntax for the 90% case
mockServer.get<BodyType>("some-route", body);

// or full syntax for more control
mockServer.get<BodyType>("some-route", {
  response: { body, statusCode: 401 }
});

// match any path param value
mockServer.get<BodyType>("item/:id", body);

// or specify the value(s) to match
mockServer.get<BodyType>("item/:id", {
  request: { pathParams: { id: "12" }}
  response: { body }
});

// match search params -- a request must contain *at least* the specified search params to match
mockServer.get<BodyType>("item", {
  request: { searchParams: { id: "12" }}
  response: { body }
});

// check that the correct body was sent
const mock = mockServer.post("item", body)

await fetch("https://shm.com/item", { method: "POST", body: requestBody });

expect(await mock.getSentBody()).toEqual(data);
```

## API

### `installInterceptor(): void`

Patch `fetch`, `XHR`, and the nodejs `http` module to intercept outgoing requests.
All requests will be responded to with a 404 error, unless a matching handler was defined.

The interception is done with the great [@mswjs/interceptors](https://github.com/mswjs/interceptors) library.

### `expectRequestsToMatchHandlers(): void`

To be used in the `afterEach` hook of your test runner. It does 3 things:

- reset the mock handlers, to keep tests isolated
- throw an error if a handler was not consumed, to enforce removal of the unused handlers that could creep up as your code evolves
- throw an error with useful info if a request was not handled, so that you don't have to guess why your test is broken

Here's what the error output will look like:

```ts
mockServer.get("hello", body);
await fetch("https://shm.com/helo");

expectRequestsToMatchHandlers();
// SHM: Received requests did not match defined handlers
//   UNHANDLED REQUEST: GET https://shm.com/helo
//       --> handler GET https://shm.com/hello -> url /hello !== /helo
```

### `createMockServer(baseUrl: string): MockServer`

Create a "mock server" instance for a given domain.
This will install the interceptor if not yet installed.

### `MockServer.<httpMethod>(path: string, body: BodyType): MockHandler`

Create a mock handler for a given http method and path.

> Important things to know:
>
> - A handler will be used to respond to **1 (ONE)** matching request. After that, it's "consumed"
> - handlers don't override each other (even with the same url), they are used in a first-in-first-out order

Have a look at the [type definition](./src/types.ts) to see the whole API

## Why this package?

There are great alternatives out there, like [msw](https://mswjs.io/) or [nock](https://github.com/nock/nock).

What this package brings to the table is, on top of a very simple API, an encouragement of a few good practices, eg:

- fail tests on unhandled requests, with helpful error messages
- fail tests on unused handlers, to help with maintainability
- no way to write complex request matchers. Tests should avoid conditionnals, and this principle includes your mock definitions (otherwise you should write tests for your tests 🤔)
- check that your application code is sending the correct request (eg with `mock.getSentBody()`) through assertions, instead of by coincidentally definining the right handler
- you have to call `createMockServer`, and not redefine the domain name of your API everywhere
