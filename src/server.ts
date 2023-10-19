import * as regexparam from "regexparam";

import { setupInterceptor } from "./interceptor";
import type { HandlerTools } from "./types";
import type { HandlerDefinition } from "./configToDefinition";
import normalizeUrl from "../vendor/normalize-url";

export let serverInstance: ReturnType<typeof create> | undefined;

export const createServerInstance = () => {
  if (!serverInstance) serverInstance = create();

  return serverInstance;
};

const create = () => {
  const ActiveHandlers = new Set<HandlerDefinition>();
  const UnhandledRequests = new Set<Request>();
  const HandledRequests = new Map<HandlerDefinition, Request>();
  const MatchingLog = new Set<MatchingLogEntry>();

  const dispose = setupInterceptor((request: Request): Response => {
    const requestLog = new Set<MatchingLogEntry>();
    const explain = (handler: HandlerDefinition) => (message: string) => {
      requestLog.add({ request, handler, message });
    };

    for (const handler of ActiveHandlers) {
      if (isHandlerMatching(handler, request, explain(handler))) {
        const response = buildResponse(handler);

        ActiveHandlers.delete(handler);
        HandledRequests.set(handler, request);

        return response;
      }
    }

    for (const logEntry of requestLog) MatchingLog.add(logEntry);
    UnhandledRequests.add(request);

    return new Response(JSON.stringify({ message: "No matching handler" }), { status: 404 });
  });

  return {
    registerHandler: (fullConfig: HandlerDefinition): HandlerTools => {
      ActiveHandlers.add(fullConfig);

      return {
        wasCalled: () => {
          return !ActiveHandlers.has(fullConfig);
        },
        getSentBody: async () => {
          const request = HandledRequests.get(fullConfig);
          if (!request) return undefined;

          return await request.clone().json();
        },
        getSentRequest: () => {
          // Cloning to ensure no problems if it's called multiple times
          return HandledRequests.get(fullConfig)?.clone();
        },
      };
    },
    reset: () => {
      const summary = {
        activeHandlers: [...ActiveHandlers],
        unhandledRequests: [...UnhandledRequests],
        handledRequests: [...HandledRequests],
        matchingLog: [...MatchingLog],
      };

      ActiveHandlers.clear();
      UnhandledRequests.clear();
      HandledRequests.clear();
      MatchingLog.clear();

      return summary;
    },
    dispose: () => {
      serverInstance = undefined;
      dispose();
    },
  };
};

const isHandlerMatching = (
  handler: HandlerDefinition,
  request: Request,
  explain: (message: string) => void,
) => {
  if (handler.method !== request.method) {
    explain(`method ${handler.method} !== ${request.method}`);

    return false;
  }

  const handlerUrl = new URL(handler.url);
  const requestUrl = new URL(normalizeUrl(request.url));

  if (handlerUrl.origin !== requestUrl.origin) {
    explain(`origin ${handlerUrl.origin} !== ${requestUrl.origin}`);

    return false;
  }

  const handlerUrlWithPathParams = regexparam.inject(
    handlerUrl.pathname,
    handler.request.pathParams,
  );

  const handlerRouteRegExp = regexparam.parse(handlerUrlWithPathParams).pattern;

  if (!handlerRouteRegExp.test(requestUrl.pathname)) {
    explain(`url ${handlerUrlWithPathParams} !== ${requestUrl.pathname}`);

    return false;
  }

  // We're not handling properly the case where the same searchParam key is specified multiple times. Should we?
  const searchParamsInHandlerUrl = Object.fromEntries(handlerUrl.searchParams.entries());

  const handlerSearchParams = Object.entries({
    ...searchParamsInHandlerUrl,
    ...handler.request.searchParams,
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

  return true;
};

const buildResponse = (handler: HandlerDefinition): Response => {
  return new Response(JSON.stringify(handler.response.body), {
    status: handler.response.status,
  });
};

type MatchingLogEntry = {
  handler: HandlerDefinition;
  request: Request;
  message: string;
};
