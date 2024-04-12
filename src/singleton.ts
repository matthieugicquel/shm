import { createServer } from "./server";
import { InterceptorConfig, SetupInterceptor } from "./types";

let instance: ReturnType<typeof createServer> | undefined;

export const ServerSingleton = {
  install: (setupInterceptor: SetupInterceptor, config?: InterceptorConfig) => {
    if (!instance) instance = createServer(setupInterceptor, config);
  },
  uninstall: () => {
    instance?.dispose();
    instance = undefined;
  },
  get: () => {
    if (!instance) {
      throw new Error(
        "SHM interceptor not installed. Please call `installInterceptor()` before creating a mock server.",
      );
    }
    return instance;
  },
};
