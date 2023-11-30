export type MockServer = {
  [method in http_method]: <TResponse>(
    url: string,
    config: HandlerConfig<TResponse>,
  ) => HandlerTools;
};

export type HandlerConfig<TResponse = void> = TResponse | FullHandlerConfig<TResponse>;

export type FullHandlerConfig<TResponse> = {
  request?: {
    /**
     * @example
     * mockServer.get("/item/:id", { request: { pathParams: { id: "1" } } })
     *
     * @see [regexparam](https://github.com/lukeed/regexparam) for all matching possibilities
     */
    pathParams?: Record<string, string>;
    /**
     * Specify searchParams that should be present in a request to match
     * Extra searchParams in the request will not cause a mismatch
     * The provided searchParams will be url-encoded
     *
     * It's also possible to specify searchParams directly in the url, but those will not be url-encoded by shm
     * @example // match "/test?id=1"
     * mockServer.get("/test", { request: { searchParams: { id: "1" } } })
     *
     */
    searchParams?: Record<string, string>;
  };
  response?: {
    status?: number;
    /**
     * The body a matching request will be responded with
     * Currently, it must be a string or a JS object that can go through JSON.stringify
     */
    body?: TResponse;
  };
  /**
   * When true, the handler won't be "consumed" after matching one request, and will continue responding to matching requests
   * Persistent handlers:
   * - have a lower priority, even when defined before non-persistent handlers
   * - are still reset by `expectRequestsToMatchHandlers` or `resetMockServers`, so they should probably be defined in a `beforEach`
   * - won't fail tests if not consumed when using `expectRequestsToMatchHandlers`
   *
   * @default false
   */
  persistent?: boolean;
};

export type HandlerTools = {
  wasCalled: () => boolean;
  /**
   * @returns The body of the request as a JSON object (if JSON-parseable) or as a string otherwise
   * Use `getSentRequest` to get the body in another format
   */
  getSentBody: () => Promise<unknown>;
  /**
   * @returns A clone of the request that was intercepted by the handler
   */
  getSentRequest: () => Request | undefined;
};

export const HTTP_METHODS = [
  "GET",
  "HEAD",
  "POST",
  "PUT",
  "DELETE",
  "CONNECT",
  "OPTIONS",
  "TRACE",
  "PATCH",
] as const;

export const http_methods = [
  "get",
  "head",
  "post",
  "put",
  "delete",
  "connect",
  "options",
  "trace",
  "patch",
] as const;

export type HttpMethod = (typeof HTTP_METHODS)[number];
export type http_method = (typeof http_methods)[number];
