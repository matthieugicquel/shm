<h1 align="center">shm</h1>

<p align="center"><i>Simple http mocking, with good developer experience</i></p>

- [Use it tests 🧪](#usage-in-tests) - mock API calls, with [good practices enforced](#whats-different-from-other-http-mocking-libraries)
- [Use it in the browser 🖥️ or React Native apps 📱](#usage-in-an-app) - during development, or for a "demo mode"

---

```bash
yarn add --dev @matthieug/shm
```

| Platform                  | Status | Notes                                                                                                            |
| ------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------- |
| `node` / `jest`           | ✅     | node>=18 required                                                                                                |
| `node` / `jest` / `jsdom` | ✅     | [Polyfills required](https://mswjs.io/docs/migrations/1.x-to-2.x#requestresponsetextencoder-is-not-defined-jest) |
| `node` / `vitest`         | ✅     | node>=18 required                                                                                                |
| `bun` with `bun test`     | ⚠️     | test won't fail with `afterEach(expectRequestsToMatchHandlers)`                                                  |
| `expo`                    | ✅     | Install [react-native-url-polyfill](https://github.com/charpeni/react-native-url-polyfill) if using SDK < 50     |
| `react-native`            | ✅     | Install [react-native-url-polyfill](https://github.com/charpeni/react-native-url-polyfill)                       |
| browser                   | ✅     |                                                                                                                  |

## Basic usage

```ts
// Some setup/global file
import { installInterceptor } from "@matthieug/shm";

installInterceptor();

// `mockServer.ts` or equivalent
import { createMockServer } from "@matthieug/shm";

export const mockServer = createMockServer("https://test.com");

// Mock a request -- short syntax for the 90% case
mockServer.get<BodyType>("some-route", body);

// Or full syntax for more control
mockServer.get<BodyType>("item/:id", {
  request: { // a request must contain **at least** the specified items to match
    pathParams: { id: "12" } // match path params
    searchParams: { lang: "fr" } // match search params
    headers: { Authorization: "Bearer some-token" } // match headers
  },
  response: {
    body: { message: "here is your mock" }, // specify a json or string body
    status: 418 // specify a status code, default is 200
  }
});

// All usual http methods are available
```

Have a look at the [type definitions](./src/types.ts) for more details.

**Important notes:**

- Handlers will by default only respond to **ONE** matching request. After that, they will be "consumed"
- Handlers are used in a _first_in_first_out_ order

## Usage in tests

### Setup

```ts
// `jest-setupAfterEnv.js` or equivalent
import { installInterceptor, expectRequestsToMatchHandlers } from "@matthieug/shm";

// Prevent all outgoing requests -- Unhandled requests will be responded to with a 404
installInterceptor();

// Fail tests when there are unhandled requests or unused handlers, and clear handlers
afterEach(expectRequestsToMatchHandlers);
```

```ts
// `mockServer.ts` or equivalent
import { createMockServer } from "@matthieug/shm";

export const mockServer = createMockServer("https://test.com");
```

### Ensure good DX with `expectRequestsToMatchHandlers`

Using it in your tests will:

- **keep tests isolated**, by resetting the mock handlers
- **enforce removal of the unused handlers** that could creep up as your code evolves, by throwing an error if a handler was not called
- **ensure your tests do not pass "by coincidence"** and **help with debugging** issues, by throwing an error if a request was not handled

```ts
import { expectRequestsToMatchHandlers } from "@matthieug/shm";

afterEach(expectRequestsToMatchHandlers);

test("some test", async () => {
  mockServer.get("hello", body);
  await fetch("https://test.com/hallo");
});

// SHM: Received requests did not match defined handlers
//   UNHANDLED REQUEST: GET https://test.com/hello
//       --> handler GET https://test.com/hallo -> url /hallo !== /hello
```

### Check that an API call was made with `mockHandler.wasCalled`

```ts
expect(mockHandler.wasCalled()).toBe(true);
```

This can be useful even if you're using the recommended setup with `expectRequestsToMatchHandlers`, eg to:

- make the expectation explicit ("when user clicks this, my app should save that to the backend")
- wait for the call to have been made
- check that the call was made at the right time in a multi-step tests

### Check that the correct request body was sent with `mockHandler.getSentBody`

```ts
test("my test", async () => {
  const mockHandler = mockServer.post("item", "here is your mock");

  await fetch("https://test.com/item", { method: "POST", body: "here's my request" });

  expect(await mockHandler.getSentBody()).toEqual("here's my request");
});
```

### What's different from other http mocking libraries?

There are great alternatives out there, like [msw](https://mswjs.io/) or [nock](https://github.com/nock/nock). By the way this package is using [@mswjs/interceptors](https://github.com/mswjs/interceptors) under the hood in node and the browser.

We want to promote a certain way to define and use api mocks in tests, and provide a very simple API.

- **Enforce maintenance** of API mocks, by failing tests on unhandled requests and unused handlers
- No way to write complex request matchers. Tests should **avoid conditionnals**, and this principle includes your mock definitions (otherwise you should write tests for your tests 🤔)
- Check that your code is sending the correct request through **assertions**, instead of by coincidentally definining the right handler
- Prefer specifying the necessary mocks for each test, so that you **know at a glance what APIs your feature/component needs**

## Usage in an app

```ts
import { installInterceptor, createMockServer, uninstallInterceptor } from "@matthieug/shm";

// Start intercepting -- Unhandled requests will be responded to with a 404
installInterceptor();

const mockServer = createMockServer("https://test.com", {
  // options specified here will apply to all handlers
  delayMs: 500, // view your loading states
  persistent: true, // allow handlers to respond to multiple matching requests
});

// When you want to make real requests again
uninstallInterceptor();
```

### Browser setup

No special setup required.

### React Native setup

If you're using **Expo SDK >= 50**, you can skip this section.

Otherwise (older expo, React Native without expo) you'll need a polyfill:

```sh
yarn add react-native-url-polyfill
```

Import it in your app's entry point (`index.js`, `App.js`,`App.tsx`, ...):

```ts
import "react-native-url-polyfill/auto";
```

## Future plans

While it's already in use in serious codebases™️, this package is still young so you'll probably encounter some problems.

I don't plan to add lots of features, but I strive for very high quality. Don't hesitate to open an issue if you find a bug, or if the docs are unclear, or if an error message is not helpful.

Here are some features that _are_ planned:

- browser env support
- a way to let unhandled request pass through
- a better typing story
