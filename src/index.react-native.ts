import { setupInterceptor } from "./interceptors/RCTNetworking";
import { createServerInstance } from "./serverInstance";

export const installInterceptor = () => {
  createServerInstance(setupInterceptor);
};

export * from "./index.shared";
