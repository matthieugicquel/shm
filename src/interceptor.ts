import { BatchInterceptor } from "@mswjs/interceptors";
import { ClientRequestInterceptor } from "@mswjs/interceptors/ClientRequest";
import { FetchInterceptor } from "@mswjs/interceptors/fetch";
import { XMLHttpRequestInterceptor } from "@mswjs/interceptors/XMLHttpRequest";

export const setupInterceptor = (handler: (request: Request) => Response | undefined) => {
  const interceptor = new BatchInterceptor({
    name: "shm",
    interceptors: [
      new ClientRequestInterceptor(),
      new XMLHttpRequestInterceptor(),
      new FetchInterceptor(),
    ],
  });

  interceptor.apply();

  interceptor.on("request", ({ request }) => {
    const response = handler(request);
    if (response) request.respondWith(response);

    // if we reach here, the request will passthrough
  });

  return () => {
    interceptor.dispose();
  };
};
