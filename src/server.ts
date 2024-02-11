import type { Handler, HandlerTools, SetupInterceptor } from "./types";
import { partition } from "./utils";

export const createServer = (setupInterceptor: SetupInterceptor) => {
  const ActiveHandlers = new Set<Handler>();
  const UnhandledRequests = new Set<Request>();
  const HandledRequests = new Map<Handler, Request>();
  const MatchingLog = new Set<MatchingLogEntry>();

  const dispose = setupInterceptor((request) => {
    const requestLog = new Set<MatchingLogEntry>();
    const explain = (handler: Handler) => (message: string) => {
      requestLog.add({ request, handler, message });
    };

    const [persistentHandlers, standardHandlers] = partition(ActiveHandlers, (h) => h.persistent);

    for (const handler of standardHandlers) {
      if (handler.isMatching(request, explain(handler))) {
        const response = buildResponse(handler);

        ActiveHandlers.delete(handler);
        HandledRequests.set(handler, request);

        return response;
      }
    }

    for (const handler of persistentHandlers) {
      if (handler.isMatching(request, explain(handler))) {
        return buildResponse(handler);
      }
    }

    for (const logEntry of requestLog) MatchingLog.add(logEntry);
    UnhandledRequests.add(request);

    return new Response(JSON.stringify({ message: "No matching handler" }), { status: 404 });
  });

  return {
    registerHandler: (fullConfig: Handler): HandlerTools => {
      ActiveHandlers.add(fullConfig);

      return {
        wasCalled: () => {
          return !ActiveHandlers.has(fullConfig);
        },
        getSentBody: async () => {
          const request = HandledRequests.get(fullConfig);
          if (!request) return undefined;

          // We should probably rely on `Content-Type` headers instead of try/catching here
          try {
            return await request.clone().json();
          } catch (jsonError) {
            return await request.clone().text();
          }
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
    dispose: dispose,
  };
};

const buildResponse = (handler: Handler): Promise<Response> => {
  const response = handler.buildResponse();

  if (handler.delayMs > 0) {
    return new Promise<Response>((resolve) => {
      setTimeout(() => resolve(response), handler.delayMs);
    });
  }
  return Promise.resolve(response);
};

type MatchingLogEntry = {
  handler: Handler;
  request: Request;
  message: string;
};
