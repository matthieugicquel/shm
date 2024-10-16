import axios from "axios";
import { expect, it, describe, afterEach, vi, beforeEach } from "vitest";

import {
  createMockServer,
  installInterceptor,
  passthrough,
  resetMockServers,
  uninstallInterceptor,
} from ".";

vi.useFakeTimers();

installInterceptor();

const mockServer = createMockServer("https://test.com");

afterEach(resetMockServers);

type TData = { info: string };

const expectedResponse = { info: "I was mocked" };
const unexpectedResponse = { info: "I messed up" };

describe("interceptors", () => {
  it("mocks an axios GET request", async () => {
    mockServer.get<TData>("/test", expectedResponse);

    const response = await axios.get("https://test.com/test");

    expect(await response.data).toEqual(expectedResponse);
  });

  it("mocks a fetch GET request", async () => {
    mockServer.get("/test", expectedResponse);

    const result = await fetch("https://test.com/test");

    expect(await result.json()).toEqual(expectedResponse);
  });
});

describe("baseUrl matching", () => {
  it("uses the right server", async () => {
    const mockServer2 = createMockServer("https://test2.com");

    mockServer.get("/test", unexpectedResponse);
    mockServer2.get("/test", expectedResponse);

    const response = await fetch("https://test2.com/test");

    expect(await response.json()).toEqual(expectedResponse);
  });

  it("uses the right server (reverse order)", async () => {
    const mockServer2 = createMockServer("https://test2.com");

    mockServer.get("/test", expectedResponse);
    mockServer2.get("/test", unexpectedResponse);

    const response = await fetch("https://test.com/test");

    expect(await response.json()).toEqual(expectedResponse);
  });

  it("matches a baseUrl with a path segment (without final slash)", async () => {
    const mockServer2 = createMockServer("https://test2.com/api");

    mockServer2.get("/test", expectedResponse);

    const response = await fetch("https://test2.com/api/test");

    expect(await response.json()).toEqual(expectedResponse);
  });

  it("matches a baseUrl with a path segment (with final slash)", async () => {
    const mockServer2 = createMockServer("https://test2.com/api/");

    mockServer2.get("/test", expectedResponse);

    const response = await fetch("https://test2.com/api/test");

    expect(await response.json()).toEqual(expectedResponse);
  });
});

describe("method matching", () => {
  it("matches the method", async () => {
    mockServer.post("/test", unexpectedResponse);
    mockServer.get("/test", expectedResponse);

    const response = await fetch("https://test.com/test");

    expect(await response.json()).toEqual(expectedResponse);
  });

  it("matches with the special `ALL` method", async () => {
    mockServer.all("/test", expectedResponse);

    const response = await fetch("https://test.com/test");

    expect(await response.json()).toEqual(expectedResponse);
  });
});

describe("url path matching", () => {
  it("matches the url", async () => {
    mockServer.get("/test", unexpectedResponse);
    mockServer.get("/test2", expectedResponse);

    const response = await fetch("https://test.com/test2");

    expect(await response.json()).toEqual(expectedResponse);
  });

  it.each`
    mockUrl    | fetchUrl
    ${"/test"} | ${"test"}
    ${"test"}  | ${"test/"}
    ${"test/"} | ${"test"}
  `("matches handler url $mockUrl when fetching $fetchUrl", async ({ mockUrl, fetchUrl }) => {
    mockServer.get(mockUrl, expectedResponse);

    const response = await fetch(`https://test.com/${fetchUrl}`);

    expect(await response.json()).toEqual(expectedResponse);
  });

  it("matches with wildcard", async () => {
    mockServer.get("*", expectedResponse);

    const response = await fetch("https://test.com/test");

    expect(await response.json()).toEqual(expectedResponse);
  });
});

describe("url path params matching", () => {
  it("matches any url path param with the :param syntax", async () => {
    mockServer.get("/test/:id", expectedResponse);

    const response = await fetch("https://test.com/test/1");

    expect(await response.json()).toEqual(expectedResponse);
  });

  it("matches an url path param exactly when specified with the config", async () => {
    mockServer.get("/test/:id", {
      request: { pathParams: { id: "1" } },
      response: { body: expectedResponse },
    });

    mockServer.get("/test/:id", {
      request: { pathParams: { id: "2" } },
      response: { body: unexpectedResponse },
    });

    const response = await fetch("https://test.com/test/1");

    expect(await response.json()).toEqual(expectedResponse);
  });

  it("matches an url path param exactly when specified with the config (reverse order)", async () => {
    mockServer.get("/test/:id", {
      request: { pathParams: { id: "2" } },
      response: { body: unexpectedResponse },
    });

    mockServer.get("/test/:id", {
      request: { pathParams: { id: "1" } },
      response: { body: expectedResponse },
    });

    const response = await fetch("https://test.com/test/1");

    expect(await response.json()).toEqual(expectedResponse);
  });
});

describe("url search params matching", () => {
  it("matches url search params when specified with the config", async () => {
    mockServer.get("/test", {
      request: { searchParams: { id: "2" } },
      response: { body: unexpectedResponse },
    });

    mockServer.get("/test", {
      request: { searchParams: { id: "1" } },
      response: { body: expectedResponse },
    });

    const response = await fetch("https://test.com/test?id=1");

    expect(await response.json()).toEqual(expectedResponse);
  });

  it("matches url search params when specified with the config (reverse order)", async () => {
    mockServer.get("/test", {
      request: { searchParams: { id: "2" } },
      response: { body: unexpectedResponse },
    });

    mockServer.get("/test", {
      request: { searchParams: { id: "1" } },
      response: { body: expectedResponse },
    });

    const response = await fetch("https://test.com/test?id=1");

    expect(await response.json()).toEqual(expectedResponse);
  });

  it("does not match when search params are missing in the request", async () => {
    mockServer.get("/test", {
      request: { searchParams: { id: "1", missing: "this" } },
      response: { body: expectedResponse },
    });

    const response = await fetch("https://test.com/test?id=1");

    expect(response.status).toEqual(404);
  });

  it("matches when there are extraneous search params in the request", async () => {
    mockServer.get("/test", {
      request: { searchParams: { id: "1" } },
      response: { body: expectedResponse },
    });

    const response = await fetch("https://test.com/test?id=1&missing=this-one");

    expect(response.status).toEqual(200);
  });

  it("matches encoded searchParams", async () => {
    mockServer.get("/test", {
      request: { searchParams: { redirect: "https://hello.world?foo=bar" } },
      response: { body: expectedResponse },
    });

    const response = await fetch(
      `https://test.com/test?${new URLSearchParams({
        redirect: "https://hello.world?foo=bar",
      })}`,
    );

    expect(response.status).toEqual(200);
  });

  it("matches searchParams when specified directly in the url", async () => {
    mockServer.get("/test?id=helo", unexpectedResponse);
    mockServer.get("/test?id=hello", expectedResponse);

    const response = await fetch("https://test.com/test?id=hello");

    expect(response.status).toEqual(200);
    expect(await response.json()).toEqual(expectedResponse);
  });
});

describe("headers matching", () => {
  it("matches a header", async () => {
    mockServer.get("/test", {
      request: { headers: { Authorization: "Bearer unexpected-token" } },
      response: { body: unexpectedResponse },
    });

    mockServer.get("/test", {
      request: { headers: { Authorization: "Bearer expected-token" } },
      response: { body: expectedResponse },
    });

    const response = await fetch("https://test.com/test", {
      headers: { Authorization: "Bearer expected-token" },
    });

    expect(await response.json()).toEqual(expectedResponse);
  });

  it("matches even when other headers are present in the request", async () => {
    mockServer.get("/test", {
      request: { headers: { Authorization: "Bearer expected-token" } },
      response: { body: expectedResponse },
    });

    const response = await fetch("https://test.com/test", {
      headers: {
        Authorization: "Bearer expected-token",
        "X-Other-Header": "hellothere",
      },
    });

    expect(await response.json()).toEqual(expectedResponse);
  });

  it("ignores case in the header name", async () => {
    mockServer.get("/test", {
      request: { headers: { authorization: "Bearer expected-token" } },
      response: { body: expectedResponse },
    });

    const response = await fetch("https://test.com/test", {
      headers: { Authorization: "Bearer expected-token" },
    });

    expect(await response.json()).toEqual(expectedResponse);
  });

  it("matches even if the header is present multiple times", async () => {
    mockServer.get("/test", {
      request: { headers: { "Accept-Language": "fr-FR" } },
      response: { body: expectedResponse },
    });

    const headers = new Headers();
    headers.append("Accept-Language", "en-US");
    headers.append("Accept-Language", "fr-FR");

    const response = await fetch("https://test.com/test", {
      headers: headers as HeadersInit, // There's a conflict between bun and node types here
    });

    expect(await response.json()).toEqual(expectedResponse);
  });

  it("matches multiple header values", async () => {
    mockServer.get("/test", {
      request: { headers: { Accept: "application/json, */*" } },
      response: { body: unexpectedResponse },
    });

    mockServer.get("/test", {
      request: { headers: { Accept: "application/json, text/plain" } },
      response: { body: expectedResponse },
    });

    const headers = new Headers();
    headers.append("Accept", "text/plain");
    headers.append("Accept", "application/json");

    const response = await fetch("https://test.com/test", {
      headers: headers as HeadersInit, // There's a conflict between bun and node types here
    });

    expect(await response.json()).toEqual(expectedResponse);
  });
});

describe("missing handlers", () => {
  it("responds with an error when no handler matches", async () => {
    const response = await fetch("https://test.com/test");

    expect(response.status).toEqual(404);
  });
});

describe("response building", () => {
  it("responds with an empty string when nothing is specified", async () => {
    mockServer.get("/test", {
      response: { status: 201 },
    });

    const response = await fetch("https://test.com/test");

    expect(response.status).toEqual(201);
    expect(await response.text()).toEqual("");
  });

  it("responds with JSON, set the application/json header", async () => {
    mockServer.get("/test", expectedResponse);

    const response = await fetch("https://test.com/test");

    expect(response.headers.get("Content-Type")).toEqual("application/json");
    expect(await response.json()).toEqual(expectedResponse);
  });

  it("responds with a string", async () => {
    mockServer.get("/test", "hello string");

    const response = await fetch("https://test.com/test");

    expect(response.headers.get("Content-Type")).toEqual("text/plain;charset=UTF-8");
    expect(await response.text()).toEqual("hello string");
  });

  it("responds with a custom response", async () => {
    mockServer.get("/test", {
      response: () => {
        return new Response("hello from custom response", {
          status: 201,
          headers: {
            "Content-Type": "text/plain;charset=UTF-8",
          },
        });
      },
    });

    const response = await fetch("https://test.com/test");

    expect(response.headers.get("Content-Type")).toEqual("text/plain;charset=UTF-8");
    expect(await response.text()).toEqual("hello from custom response");
  });
});

describe("request assertions", () => {
  const expectedBody = { key: "body-match" };

  it("wasCalled ", async () => {
    const mock = mockServer.get("/test", unexpectedResponse);

    expect(mock.wasCalled()).toEqual(false);

    await fetch("https://test.com/test");

    expect(mock.wasCalled()).toEqual(true);
  });

  it("getSentBody - JSON", async () => {
    const mock = mockServer.post("/test", expectedResponse);

    expect(mock.getSentRequest()).toEqual(undefined);

    await fetch("https://test.com/test", {
      method: "POST",
      body: JSON.stringify(expectedBody),
    });

    expect(await mock.getSentBody()).toMatchObject(expectedBody);
  });

  it("getSentBody - text", async () => {
    const stringBody = "some-string";
    const mock = mockServer.post("/test", expectedResponse);

    expect(mock.getSentRequest()).toEqual(undefined);

    await fetch("https://test.com/test", {
      method: "POST",
      body: stringBody,
    });

    expect(await mock.getSentBody()).toEqual(stringBody);
  });
});

describe("persistent handlers", () => {
  it("handles 3 matching requests", async () => {
    mockServer.get("/test", {
      persistent: true,
      response: { body: expectedResponse },
    });

    const response1 = await fetch("https://test.com/test");
    expect(await response1.json()).toEqual(expectedResponse);

    const response2 = await fetch("https://test.com/test");

    expect(await response2.json()).toEqual(expectedResponse);

    const response3 = await fetch("https://test.com/test");

    expect(await response3.json()).toEqual(expectedResponse);
  });

  it("gives priority to a non-persistent handler", async () => {
    mockServer.get("/test", {
      persistent: true,
      response: { body: unexpectedResponse },
    });

    mockServer.get("/test", {
      response: { body: expectedResponse },
    });

    const response1 = await fetch("https://test.com/test");
    expect(await response1.json()).toEqual(expectedResponse);

    const response2 = await fetch("https://test.com/test");

    expect(await response2.json()).toEqual(unexpectedResponse);
  });

  it("gives priority to a non-persistent handler (reverse order)", async () => {
    mockServer.get("/test", {
      response: { body: expectedResponse },
    });

    mockServer.get("/test", {
      persistent: true,
      response: { body: unexpectedResponse },
    });

    const response1 = await fetch("https://test.com/test");
    expect(await response1.json()).toEqual(expectedResponse);

    const response2 = await fetch("https://test.com/test");

    expect(await response2.json()).toEqual(unexpectedResponse);
  });

  it("is reset like a normal handler", async () => {
    mockServer.get("/test", {
      response: { body: unexpectedResponse },
    });

    resetMockServers();

    const response = await fetch("https://test.com/test");
    expect(response.status).toBe(404);
  });
});

describe("response delay", () => {
  it("delays the response when specified", async () => {
    mockServer.get("/test", {
      delayMs: 1000,
      response: { body: expectedResponse },
    });

    const responsePromise = fetch("https://test.com/test");

    const resultBefore = await Promise.race([responsePromise, vi.advanceTimersByTimeAsync(999)]);

    expect(resultBefore instanceof Response).toBe(false);

    const resultAfter = await Promise.race([responsePromise, vi.advanceTimersByTimeAsync(2)]);

    expect(resultAfter instanceof Response).toBe(true);
    expect(await (resultAfter as Response).json()).toEqual(expectedResponse);
  });
});

describe("server-level config", () => {
  it("takes into a account a `persistent: true` server-level config", async () => {
    const mockServer2 = createMockServer("https://test2.com", {
      persistent: true,
    });

    mockServer2.get("/test", expectedResponse);

    const response1 = await fetch("https://test2.com/test");
    expect(await response1.json()).toEqual(expectedResponse);

    const response2 = await fetch("https://test2.com/test");
    expect(await response2.json()).toEqual(expectedResponse);
  });
});

describe("interceptor-level config", () => {
  beforeEach(() => {
    uninstallInterceptor();

    return () => {
      uninstallInterceptor();
      installInterceptor();
    };
  });

  it("lets a request passthrough", async () => {
    installInterceptor({ onUnhandled: passthrough });

    const localMockServer = createMockServer("http://0.0.0.0");

    // control
    localMockServer.get("/test", { response: "hello" });
    const response = await fetch("http://0.0.0.0/test");
    expect(response.ok).toEqual(true);

    // real expectation
    await expect(() => fetch("http://0.0.0.0/not-mocked")).rejects.toThrowError();
  });

  it("uses custom onUnhandled", async () => {
    installInterceptor({ onUnhandled: () => new Response("custom onUnhandled", { status: 500 }) });

    const response = await fetch("https://test.com/test");

    expect(response.ok).toEqual(false);
    expect(response.status).toEqual(500);
    expect(await response.text()).toEqual("custom onUnhandled");
  });
});
