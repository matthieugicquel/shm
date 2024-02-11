import { setupInterceptor } from "./interceptors/RCTNetworking";
import { ServerSingleton } from "./singleton";

export const installInterceptor = () => {
  ServerSingleton.install(setupInterceptor);
};

export * from "./index.shared";
