import normalizeUrl from "../vendor/normalize-url";
import type { FullHandlerConfig, HandlerConfig, HttpMethod } from "./types";

export type HandlerDefinition = {
  method: HttpMethod;
  /**
   * A full, normalized URL that the handler should match
   * - pathParams are not replaced
   * - searchParams are ??? TODO
   */
  url: string;
  persistent: boolean;
  response: {
    status: number;
    body: unknown | undefined;
  };
  request: {
    pathParams: Record<string, string>;
    searchParams: Record<string, string> | undefined;
  };
};

/**
 * Convert config provided by the user to a full, normalized handler definition
 */
export const configToDefinition = (params: {
  baseUrl: string;
  url: string;
  method: HttpMethod;
  config: HandlerConfig<unknown>;
}): HandlerDefinition => {
  const { method, config, baseUrl } = params;

  const url = normalizeUrl(new URL(params.url, baseUrl).toString());

  if (isFullHandlerConfig(config)) {
    return {
      method,
      url,
      persistent: false,
      ...config,
      request: {
        pathParams: {},
        searchParams: undefined,
        ...config.request,
      },
      response: {
        status: 200,
        body: undefined,
        ...config.response,
      },
    };
  }

  return {
    method,
    url,
    persistent: false,
    response: {
      status: 200,
      body: config,
    },
    request: {
      pathParams: {},
      searchParams: undefined,
    },
  };
};

const isFullHandlerConfig = <TResponse>(
  config: HandlerConfig<TResponse>,
): config is FullHandlerConfig<TResponse> => {
  if (typeof config !== "object") return false;
  if (config === null) return false;

  return "response" in config || "request" in config;
};
