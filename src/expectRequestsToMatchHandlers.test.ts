import { expect, it, afterEach, describe, beforeEach } from "vitest";

import {
  createMockServer,
  installInterceptor,
  passthrough,
  resetMockServers,
  uninstallInterceptor,
} from ".";
import { expectRequestsToMatchHandlers } from "./expectRequestsToMatchHandlers";

installInterceptor();

const mockServer = createMockServer("https://test.com");

afterEach(resetMockServers);

const getThrownMessage = () => {
  try {
    expectRequestsToMatchHandlers();
  } catch (error) {
    return (error as Error).message;
  }
};

const body = { info: "I was mocked" };

it("indicates an unhandled request / a missing handler", async () => {
  await fetch("https://test.com/test");

  expect(getThrownMessage()).toMatchInlineSnapshot(`
    "SHM: Received requests did not match defined handlers
    	UNHANDLED REQUEST: GET https://test.com/test
    "
  `);
});

it("indicates a unused handler", async () => {
  mockServer.get("/test", body);

  expect(getThrownMessage()).toMatchInlineSnapshot(`
    "SHM: Received requests did not match defined handlers
    	UNUSED HANDLER:    GET https://test.com/test
    "
  `);
});

it("gives the priority to the unhandled request log", async () => {
  mockServer.get("/test1", body);

  await fetch("https://test.com/test2");

  expect(getThrownMessage()).toMatchInlineSnapshot(`
    "SHM: Received requests did not match defined handlers
    	UNHANDLED REQUEST: GET https://test.com/test2
    	  --> handler GET https://test.com/test1 -> url /test1 !== /test2
    "
  `);
});

it("searchParam mismatch -> present but wrong value", async () => {
  mockServer.get("/test", {
    request: { searchParams: { id: "hello" } },
    response: { body },
  });

  await fetch("https://test.com/test?id=helo");

  expect(getThrownMessage()).toMatchInlineSnapshot(`
    "SHM: Received requests did not match defined handlers
    	UNHANDLED REQUEST: GET https://test.com/test?id=helo
    	  --> handler GET https://test.com/test -> searchParam "id" -> "hello" !== "helo"
    "
  `);
});

it("searchParam mismatch -> param missing in request", async () => {
  mockServer.get("/test", {
    request: { searchParams: { id: "hello" } },
    response: { body },
  });

  await fetch("https://test.com/test");

  expect(getThrownMessage()).toMatchInlineSnapshot(`
    "SHM: Received requests did not match defined handlers
    	UNHANDLED REQUEST: GET https://test.com/test
    	  --> handler GET https://test.com/test -> searchParam "id" -> expected by handler but absent in request
    "
  `);
});

it("pathParam mismatch -> present but wrong value", async () => {
  mockServer.get("/test/:id", {
    request: { pathParams: { id: "hello" } },
    response: { body },
  });

  await fetch("https://test.com/test/helo");

  expect(getThrownMessage()).toMatchInlineSnapshot(`
    "SHM: Received requests did not match defined handlers
    	UNHANDLED REQUEST: GET https://test.com/test/helo
    	  --> handler GET https://test.com/test/:id -> url /test/hello !== /test/helo
    "
  `);
});

it("pathParam mismatch -> param missing in request", async () => {
  mockServer.get("/test/:id", {
    response: { body },
  });

  await fetch("https://test.com/test");

  expect(getThrownMessage()).toMatchInlineSnapshot(`
    "SHM: Received requests did not match defined handlers
    	UNHANDLED REQUEST: GET https://test.com/test
    	  --> handler GET https://test.com/test/:id -> url /test/:id !== /test
    "
  `);
});

it("header mismatch -> present but wrong value", async () => {
  mockServer.get("/test", {
    request: { headers: { "x-test": "hello" } },
    response: { body },
  });

  await fetch("https://test.com/test", { headers: { "x-test": "halo" } });

  expect(getThrownMessage()).toMatchInlineSnapshot(`
    "SHM: Received requests did not match defined handlers
    	UNHANDLED REQUEST: GET https://test.com/test
    	  --> handler GET https://test.com/test -> header "x-test" -> "hello" !== "halo"
    "
  `);
});

it("header mismatch -> missing in request", async () => {
  mockServer.get("/test", {
    request: { headers: { "x-test": "hello" } },
    response: { body },
  });

  await fetch("https://test.com/test");

  expect(getThrownMessage()).toMatchInlineSnapshot(`
    "SHM: Received requests did not match defined handlers
    	UNHANDLED REQUEST: GET https://test.com/test
    	  --> handler GET https://test.com/test -> header "x-test" -> expected by handler but absent in request
    "
  `);
});

it("multiple close requests", async () => {
  mockServer.get("/test", {
    request: { searchParams: { id: "hello" } },
    response: { body },
  });

  mockServer.get("/test", {
    request: { searchParams: { id2: "helo" } },
    response: { body },
  });

  mockServer.get("/test2", {
    request: { searchParams: { id: "hello" } },
    response: { body },
  });

  await fetch("https://test.com/test?id=helo");

  expect(getThrownMessage()).toMatchInlineSnapshot(`
    "SHM: Received requests did not match defined handlers
    	UNHANDLED REQUEST: GET https://test.com/test?id=helo
    	  --> handler GET https://test.com/test -> searchParam "id" -> "hello" !== "helo"
    	  --> handler GET https://test.com/test -> searchParam "id2" -> expected by handler but absent in request
    	  --> handler GET https://test.com/test2 -> url /test2 !== /test
    "
  `);
});

it("doesn't throw because of persistent handlers", async () => {
  mockServer.get("/test", {
    persistent: true,
    response: { body },
  });

  await fetch("https://test.com/test");

  expect(getThrownMessage()).toBeUndefined();
});

it("logs a persistent handler mismatch for an unhandled request", async () => {
  mockServer.get("/test", {
    persistent: true,
    response: { body },
  });

  await fetch("https://test.com/test2");

  expect(getThrownMessage()).toMatchInlineSnapshot(`
    "SHM: Received requests did not match defined handlers
    	UNHANDLED REQUEST: GET https://test.com/test2
    	  --> handler GET https://test.com/test -> url /test !== /test2
    "
  `);
});

describe("passthrough", () => {
  beforeEach(() => {
    uninstallInterceptor();

    return () => {
      uninstallInterceptor();
      installInterceptor();
    };
  });

  it("doesn't throw because of passthrough request", async () => {
    installInterceptor({ onUnhandled: passthrough });

    const localMockServer = createMockServer("http://0.0.0.0");

    // control
    localMockServer.get("/test", body);
    const response = await fetch("http://0.0.0.0/test");
    expect(response.ok).toEqual(true);

    await expect(() => fetch("http://0.0.0.0/not-mocked")).rejects.toThrowError();

    // real expectation
    expect(getThrownMessage()).toBeUndefined();
  });
});
