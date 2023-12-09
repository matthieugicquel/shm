import { setupInterceptor } from "./interceptors/browser";
import { createServerInstance } from "./serverInstance";

export const installInterceptor = () => {
  createServerInstance(setupInterceptor);
};

export * from "./index.shared";
