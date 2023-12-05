export const setupInterceptor = (handler: (request: Request) => Response | undefined) => {
  let nextRequestId = -1; // using negative numbers to avoid collisions with RN's own requests

  const { Networking, getDevServerUrl, DeviceEventEmitter } = requireReactNativeModules();

  const originalSendRequest = Networking.sendRequest;

  // using a name that will be recognizable in stack traces / debug tools
  const sendRequest_SHM_PATCHED = (...args: Parameters<SendRequestFn>) => {
    const [
      method,
      _trackingName, // doesn't matter much
      url,
      headers,
      data,
      _responseType, // we could handle this
      _incrementalUpdates, // we could handle this
      _timeout, // we should probably handle this
      callback,
      _withCredentials, // we should probably handle this
    ] = args;

    const devServerUrl = getDevServerUrl().url;

    if (devServerUrl && url.startsWith(devServerUrl)) {
      // ☢️☢️☢️ RN console logs go through the network in dev, ensure those (among others) are passed through untouched
      return originalSendRequest(...args);
    }

    const requestId = nextRequestId;
    nextRequestId--;

    const request = new Request(url, {
      method,
      headers,
      body: data,
    });

    const mockedResponse = handler(request);

    if (mockedResponse) {
      callback(requestId); // simulate "creating the request"
      void simulateResponse(requestId, mockedResponse);
      return;
    }

    // if we reach here, let the request pass through
    return originalSendRequest(...args);
  };

  const simulateResponse = async (requestId: number, response: Response) => {
    DeviceEventEmitter.emit("didReceiveNetworkResponse", [
      requestId,
      response.status,
      Object.fromEntries(response.headers.entries()), // we may be loosing information for some edge cases here
      response.url,
    ]);
    DeviceEventEmitter.emit("didReceiveNetworkData", [requestId, await response.text()]);
    DeviceEventEmitter.emit("didCompleteNetworkResponse", [requestId, undefined, false]);
  };

  Networking.sendRequest = sendRequest_SHM_PATCHED;

  return () => {
    Networking.sendRequest = originalSendRequest;
  };
};

const requireReactNativeModules = () => {
  const { Networking, DeviceEventEmitter } = require("react-native");
  const getDevServerUrl = require("react-native/Libraries/Core/Devtools/getDevServer");

  if (!Networking) {
    throw new SHMReactNativeInterceptorError(
      "Import `Networking` from react-native not available. Please open an issue if you're using a recent version of react-native.",
    );
  }

  if (!DeviceEventEmitter) {
    throw new SHMReactNativeInterceptorError(
      "Import `DeviceEventEmitter` from react-native not available. Please open an issue if you're using a recent version of react-native.",
    );
  }

  if (!getDevServerUrl) {
    throw new SHMReactNativeInterceptorError(
      "Import `getDevServerUrl` from react-native internals not available. Please open an issue if you're using a recent version of react-native.",
    );
  }

  return {
    Networking: Networking as Networking,
    getDevServerUrl: getDevServerUrl as () => { url: string },
    DeviceEventEmitter: DeviceEventEmitter as NetworkEventsEmitter,
  };
};

class SHMReactNativeInterceptorError extends Error {
  override name = "SHMReactNativeInterceptorError";
}

// We could use the types from react-native, but these are not stable/documented APIs anyway...
interface Networking {
  sendRequest: SendRequestFn;
  addListener: (event: string, callback: (...args: any[]) => void) => void;
}

interface NetworkEventsEmitter {
  /**
   * ☢️ Types / the code in RN seem to indicate that we should spread `args`, but when we do it's broken
   * TODO: investigate
   */
  emit: <K extends keyof NetworkEvents>(event: K, args: NetworkEvents[K]) => void;
}

type NetworkEvents = {
  didReceiveNetworkResponse: [
    requestId: number,
    status: number,
    headers: Record<string, string>,
    responseURL: string | undefined,
  ];
  didReceiveNetworkData: [requestId: number, responseText: string];
  didCompleteNetworkResponse: [
    requestId: number,
    errorMessage: string | undefined,
    didTimeOut: boolean,
  ];
};

type SendRequestFn = (
  method: string,
  trackingName: string,
  url: string,
  headers: Record<string, string>,
  data: string,
  responseType: "text" | "base64" | "blob",
  incrementalUpdates: boolean,
  timeout: number,
  callback: (requestId: number) => void,
  withCredentials: boolean,
) => void;
