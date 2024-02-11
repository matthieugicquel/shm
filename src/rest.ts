import * as regexparam from "regexparam";
import normalizeUrl from "../vendor/normalize-url";

import {
  type HandlerConfig,
  type FullHandlerConfig,
  type Handler,
  type HttpMethod,
  type MockServer,
  http_methods,
} from "./types";
import { ServerSingleton } from "./singleton";

export const createRestServer = (
  baseUrl: string,
  serverConfig: FullHandlerConfig<unknown> = {},
): MockServer => {
  const { registerHandler } = ServerSingleton.get();

  const methodSetters = http_methods.reduce((acc, method) => {
    return {
      ...acc,
      [method]: <TResponse>(url: string, config: HandlerConfig<TResponse>) => {
        const handler = buildRestHandler({
          baseUrl,
          url,
          method: method.toUpperCase() as HttpMethod,
          config,
          serverConfig,
        });

        return registerHandler(handler);
      },
    };
  }, {} as MockServer);

  return methodSetters;
};

const buildRestHandler = (input: ConfigInput): Handler => {
  const config = normalizeHandlerConfig(input);

  return {
    persistent: config.persistent,
    delayMs: config.delayMs,

    getDescription: () => {
      return `${config.method} ${config.url}`;
    },

    isMatching: (request, explain) => {
      if (config.method !== "ALL" && config.method !== request.method) {
        explain(`method ${config.method} !== ${request.method}`);

        return false;
      }

      const handlerUrl = new URL(config.url);
      const requestUrl = new URL(normalizeUrl(request.url));

      if (handlerUrl.origin !== requestUrl.origin) {
        explain(`origin ${handlerUrl.origin} !== ${requestUrl.origin}`);

        return false;
      }

      const handlerUrlWithPathParams = regexparam.inject(handlerUrl.pathname, {
        ...config.request.pathParams,
        "*": "*", // keep wildcards in the url
      });

      const handlerRouteRegExp = regexparam.parse(handlerUrlWithPathParams).pattern;

      if (!handlerRouteRegExp.test(requestUrl.pathname)) {
        explain(`url ${handlerUrlWithPathParams} !== ${requestUrl.pathname}`);

        return false;
      }

      // We're not handling properly the case where the same searchParam key is specified multiple times. Should we?
      const searchParamsInHandlerUrl = Object.fromEntries(handlerUrl.searchParams.entries());

      const handlerSearchParams = Object.entries({
        ...searchParamsInHandlerUrl,
        ...config.request.searchParams,
      });

      for (const [key, value] of handlerSearchParams) {
        const requestParam = requestUrl.searchParams.get(key);
        if (!requestParam) {
          explain(`searchParam "${key}" -> expected by handler but absent in request`);

          return false;
        }

        if (requestParam !== value) {
          explain(`searchParam "${key}" -> "${value}" !== "${requestParam}"`);

          return false;
        }
      }

      for (const [key, handlerHeader] of Object.entries(config.request.headers)) {
        const requestHeader = request.headers.get(key);

        if (!requestHeader) {
          explain(`header "${key}" -> expected by handler but absent in request`);

          return false;
        }

        const handlerHeaderValues = handlerHeader.split(",").map((v) => v.trim());
        const requestHeaderValues = requestHeader.split(",").map((v) => v.trim());

        for (const handlerHeaderValue of handlerHeaderValues) {
          if (!requestHeaderValues.includes(handlerHeaderValue)) {
            explain(`header "${key}" -> "${handlerHeaderValue}" !== "${requestHeader}"`);

            return false;
          }
        }
      }

      return true;
    },

    buildResponse: () => {
      // TODO: we only handle string and JSON responses for now

      if (typeof config.response.body === "string") {
        return new Response(config.response.body, {
          status: config.response.status,
        });
      }

      return new Response(JSON.stringify(config.response.body), {
        status: config.response.status,
        headers: {
          "Content-Type": "application/json",
        },
      });
    },
  };
};

type ConfigInput = {
  baseUrl: string;
  url: string;
  method: HttpMethod;
  config: HandlerConfig<unknown>;
  serverConfig: FullHandlerConfig<unknown>;
};

type NormalizedHandlerConfig = {
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
const normalizeHandlerConfig = (input: ConfigInput): NormalizedHandlerConfig => {
  const { method, config, baseUrl, serverConfig } = input;

  const url = normalizeUrl(new URL(input.url, baseUrl).toString());

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
