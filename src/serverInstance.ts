import { createServer } from "./server";
import { SetupInterceptor } from "./types";

export let serverInstance: ReturnType<typeof createServer> | undefined;

export const createServerInstance = (setupInterceptor: SetupInterceptor) => {
  if (!serverInstance) serverInstance = createServer(setupInterceptor);

  return serverInstance;
};

export const uninstallInterceptor = () => {
  serverInstance?.dispose();
  serverInstance = undefined;
};

export const resetMockServers = () => {
  serverInstance?.reset();
};
