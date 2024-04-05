import { ServerSingleton } from "./singleton";

export { createRestServer as createMockServer } from "./rest";

export { expectRequestsToMatchHandlers } from "./expectRequestsToMatchHandlers";

export type { HandlerConfig, FullHandlerConfig, HandlerTools } from "./types";

export const uninstallInterceptor = () => {
  ServerSingleton.uninstall();
};

export const resetMockServers = () => {
  ServerSingleton.get().reset();
};
