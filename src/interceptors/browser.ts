import { BatchInterceptor } from "@mswjs/interceptors";
import { FetchInterceptor } from "@mswjs/interceptors/fetch";
import { XMLHttpRequestInterceptor } from "@mswjs/interceptors/XMLHttpRequest";
import { SetupInterceptor } from "../types";

export const setupInterceptor: SetupInterceptor = (handler) => {
  const interceptor = new BatchInterceptor({
    name: "shm",
    interceptors: [new XMLHttpRequestInterceptor(), new FetchInterceptor()],
  });

  interceptor.apply();

  interceptor.on("request", async ({ request }) => {
    const responseWithDelay = handler(request);
    if (responseWithDelay) {
      request.respondWith(await responseWithDelay);
    }

    // if we reach here, the request will passthrough
  });

  return () => {
    interceptor.dispose();
  };
};
