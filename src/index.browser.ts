import { setupInterceptor } from "./interceptors/browser";
import { ServerSingleton } from "./singleton";
import { InterceptorConfig } from "./types";

export const installInterceptor = (config?: InterceptorConfig) => {
  ServerSingleton.install(setupInterceptor, config);
};

export * from "./index.shared";
