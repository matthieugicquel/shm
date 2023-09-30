import type { HandlerConfig, MockServer, HttpMethod } from "./types";
import { http_methods } from "./types";
import { createServerInstance, serverInstance } from "./server";
import { configToDefinition } from "./configToDefinition";

export const createMockServer = (baseUrl: string): MockServer => {
  const { registerHandler } = serverInstance ?? createServerInstance();

  const methodSetters = http_methods.reduce((acc, method) => {
    return {
      ...acc,
      [method]: <TResponse>(url: string, config: HandlerConfig<TResponse>) => {
        const definition = configToDefinition({
          baseUrl,
          url,
          method: method.toUpperCase() as HttpMethod,
          config,
        });

        return registerHandler(definition);
      },
    };
  }, {} as MockServer);

  return methodSetters;
};
