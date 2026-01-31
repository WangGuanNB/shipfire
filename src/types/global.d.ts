declare module "google-one-tap";

declare module "@paypal/checkout-server-sdk" {
  namespace core {
    class SandboxEnvironment {
      constructor(clientId: string, clientSecret: string);
    }
    class LiveEnvironment {
      constructor(clientId: string, clientSecret: string);
    }
    class PayPalHttpClient {
      constructor(environment: SandboxEnvironment | LiveEnvironment);
      execute<T>(request: unknown): Promise<{ result: T }>;
    }
  }
  namespace orders {
    class OrdersCreateRequest {
      prefer(value: string): void;
      requestBody(body: object): void;
    }
    class OrdersCaptureRequest {
      constructor(orderId: string);
      requestBody(body: object): void;
    }
    class OrdersGetRequest {
      constructor(orderId: string);
    }
  }
  const paypal: {
    core: typeof core;
    orders: typeof orders;
  };
  export default paypal;
}
