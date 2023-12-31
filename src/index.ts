import { setupInterceptor } from "./interceptors/node";
import { createServerInstance } from "./serverInstance";

export const installInterceptor = () => {
  createServerInstance(setupInterceptor);
};

export * from "./index.shared";
