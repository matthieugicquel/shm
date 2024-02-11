import { setupInterceptor } from "./interceptors/node";
import { ServerSingleton } from "./singleton";

export const installInterceptor = () => {
  ServerSingleton.install(setupInterceptor);
};

export * from "./index.shared";
