import { ServerSingleton } from "./singleton";

export const expectRequestsToMatchHandlers = () => {
  const server = ServerSingleton.get();

  const { activeHandlers, unhandledRequests, matchingLog } = server.reset();

  if (unhandledRequests.length > 0) {
    const message = [
      "SHM: Received requests did not match defined mock handlers",
      ...unhandledRequests.flatMap<string>((r) => [
        `\tUNHANDLED REQUEST: ${r.method} ${r.url}`,
        ...matchingLog
          .filter((l) => l.request === r)
          .map((l) => {
            return `\t  --> handler ${l.handler.getDescription()} -> ${l.message}`;
          }),
      ]),
    ].join("\n");

    throw new ShmMismatchError(`${message}\n`);
  }

  const relevantActiveHandlers = activeHandlers.filter((h) => h.persistent === false);

  if (relevantActiveHandlers.length > 0) {
    const message = [
      "SHM: Received requests did not match defined mock handlers",
      ...relevantActiveHandlers.flatMap<string>((h) => {
        return [
          `\tUNUSED HANDLER:    ${h.getDescription()}`,
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
