import { setupInterceptor } from "./interceptors/browser";
import { ServerSingleton } from "./singleton";

export const installInterceptor = () => {
  ServerSingleton.install(setupInterceptor);
};

export * from "./index.shared";
