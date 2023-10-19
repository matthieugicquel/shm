import { serverInstance } from "./server";

export const expectRequestsToMatchHandlers = () => {
  if (!serverInstance) return;

  const { activeHandlers, unhandledRequests, matchingLog } = serverInstance.reset();

  if (unhandledRequests.length > 0) {
    const message = [
      "SHM: Received requests did not match defined handlers",
      ...unhandledRequests.flatMap((r) => [
        `\tUNHANDLED REQUEST: ${r.method} ${r.url}`,
        ...matchingLog
          .filter((l) => l.request === r)
          .map((l) => {
            return `\t  --> handler ${l.handler.method} ${l.handler.url} -> ${l.message}`;
          }),
      ]),
    ].join("\n");

    throw new ShmMismatchError(`${message}\n`);
  }

  const relevantActiveHandlers = activeHandlers.filter((h) => h.persistent === false);

  if (relevantActiveHandlers.length > 0) {
    const message = [
      "SHM: Received requests did not match defined handlers",
      ...relevantActiveHandlers.flatMap((h) => {
        return [
          `\tUNUSED HANDLER:    ${h.method} ${h.url}`,
          ...matchingLog
            .filter((l) => l.handler === h)
            .map((l) => {
              return `\t  --> [request ${l.request.method} ${l.request.url}] ->  ${l.message}`;
            }),
        ];
      }),
    ].join("\n");

    throw new ShmMismatchError(`${message}\n`);
  }
};

class ShmMismatchError extends Error {
  override name = "ShmMismatchError";
}
