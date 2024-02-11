import { ServerSingleton } from "./singleton";

export { createMockServer } from "./createMockServer";

export { expectRequestsToMatchHandlers } from "./expectRequestsToMatchHandlers";

export type { HandlerConfig } from "./types";

export const uninstallInterceptor = () => {
  ServerSingleton.uninstall();
};

export const resetMockServers = () => {
  ServerSingleton.get().reset();
};
