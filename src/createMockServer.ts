import type { HandlerConfig, MockServer, HttpMethod, FullHandlerConfig } from "./types";
import { http_methods } from "./types";
import { serverInstance } from "./serverInstance";
import { configToDefinition } from "./configToDefinition";

export const createMockServer = (
  baseUrl: string,
  serverConfig: FullHandlerConfig<unknown> = {},
): MockServer => {
  if (!serverInstance) {
    throw new Error(
      "SHM interceptor not installed. Please call `installInterceptor()` before creating a mock server.",
    );
  }

  const { registerHandler } = serverInstance;

  const methodSetters = http_methods.reduce((acc, method) => {
    return {
      ...acc,
      [method]: <TResponse>(url: string, config: HandlerConfig<TResponse>) => {
        const definition = configToDefinition({
          baseUrl,
          url,
          method: method.toUpperCase() as HttpMethod,
          config,
          serverConfig,
        });

        return registerHandler(definition);
      },
    };
  }, {} as MockServer);

  return methodSetters;
};
