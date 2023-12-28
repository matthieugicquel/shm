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
  delayMs: number;
  response: {
    status: number;
    body: unknown | undefined;
  };
  request: {
    pathParams: Record<string, string>;
    searchParams: Record<string, string> | undefined;
    headers: Record<string, string>;
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
  serverConfig: FullHandlerConfig<unknown>;
}): HandlerDefinition => {
  const { method, config, baseUrl, serverConfig } = params;

  const url = normalizeUrl(new URL(params.url, baseUrl).toString());

  const baseDefinition = {
    persistent: false,
    delayMs: 0,
    ...serverConfig,
    method,
    url,
    request: {
      pathParams: {},
      searchParams: undefined,
      headers: {},
      ...serverConfig.request,
    },
    response: {
      status: 200,
      body: undefined,
      ...serverConfig.response,
    },
  };

  if (isFullHandlerConfig(config)) {
    return {
      ...baseDefinition,
      ...config,
      request: {
        ...baseDefinition.request,
        ...config.request,
      },
      response: {
        ...baseDefinition.response,
        ...config.response,
      },
    };
  }

  return {
    ...baseDefinition,
    response: {
      ...baseDefinition.response,
      body: config,
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
