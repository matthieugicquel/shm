import { installInterceptor, expectRequestsToMatchHandlers, uninstallInterceptor } from "../src";

// Prevent all outgoing requests -- Unhandled requests will be responded to with a 404
installInterceptor();
afterAll(uninstallInterceptor);

// Fail tests when there are unhandled requests or unused handlers, and clear handlers
afterEach(expectRequestsToMatchHandlers);
