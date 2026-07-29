import type {
  UnknownWebhookEvent,
  WebhookEvent,
  WebhookEventDataMap,
  WebhookEventType,

  WebhookPing,
} from "../types";
import {
  WebhookDeliveryType,
} from "../types";

const encoder = new TextEncoder();
const defaultApplicationId = "000000000000000000";

/** URL or Fetch request accepted by the signed test client. */
export type WebhookTestRequestInput = string | URL | Request;

/** Portable header initializer accepted without requiring TypeScript's DOM lib. */
export type WebhookTestHeaders = Headers | Record<string, string> | Array<[string, string]>;

/** Options used when constructing a signed test request. */
export type WebhookTestRequestOptions = {
  /** Discord signature timestamp. Defaults to the current ISO timestamp. */
  timestamp?: string;
  /** Additional request headers. Signature headers are always set by the client. */
  headers?: WebhookTestHeaders;
};

/** Options for a typed Discord event delivery. */
export type WebhookTestEventOptions<T extends WebhookEventType> = {
  type: T;
  data: WebhookEventDataMap[T];
  /** Timestamp included in the event envelope. */
  eventTimestamp?: string;
  /** Timestamp included in the signature header. */
  signatureTimestamp?: string;
  headers?: WebhookTestHeaders;
};

/** Options for a forward-compatible event unknown to this package version. */
export type WebhookTestUnknownEventOptions = {
  type: string;
  data?: unknown;
  /** Timestamp included in the event envelope. */
  eventTimestamp?: string;
  /** Timestamp included in the signature header. */
  signatureTimestamp?: string;
  headers?: WebhookTestHeaders;
};

/** Configuration for {@link createWebhookTestClient}. */
export type CreateWebhookTestClientOptions = {
  /** Application id included in generated deliveries. */
  applicationId?: string;
  /** Fetch implementation used by the send helpers. Defaults to global fetch. */
  fetch?: typeof globalThis.fetch;
};

/**
 * Small Discord-like client that creates correctly signed Webhook Events requests.
 *
 * It is intended for integration tests and never starts an HTTP server.
 */
export type WebhookTestClient = {
  /** Hex-encoded Ed25519 public key to pass to `createWebhookHandler`. */
  publicKey: string;

  /** Creates a signed POST request from any JSON-serializable payload. */
  createRequest: (
    input: WebhookTestRequestInput,
    payload: unknown,
    options?: WebhookTestRequestOptions,
  ) => Promise<Request>;

  /** Creates a signed Discord endpoint-verification delivery. */
  createPingRequest: (
    input: WebhookTestRequestInput,
    options?: WebhookTestRequestOptions,
  ) => Promise<Request>;

  /** Creates a signed, precisely typed Discord event delivery. */
  createEventRequest: <T extends WebhookEventType>(
    input: WebhookTestRequestInput,
    event: WebhookTestEventOptions<T>,
  ) => Promise<Request>;

  /** Creates a signed delivery for a future event name. */
  createUnknownEventRequest: (
    input: WebhookTestRequestInput,
    event: WebhookTestUnknownEventOptions,
  ) => Promise<Request>;

  /** Creates and sends a signed POST request through the configured Fetch API. */
  send: (
    input: WebhookTestRequestInput,
    payload: unknown,
    options?: WebhookTestRequestOptions,
  ) => Promise<Response>;

  /** Sends a signed Discord endpoint-verification delivery. */
  sendPing: (
    input: WebhookTestRequestInput,
    options?: WebhookTestRequestOptions,
  ) => Promise<Response>;

  /** Sends a signed, precisely typed Discord event delivery. */
  sendEvent: <T extends WebhookEventType>(
    input: WebhookTestRequestInput,
    event: WebhookTestEventOptions<T>,
  ) => Promise<Response>;

  /** Sends a signed delivery for a future event name. */
  sendUnknownEvent: (
    input: WebhookTestRequestInput,
    event: WebhookTestUnknownEventOptions,
  ) => Promise<Response>;
};

/**
 * Creates a mini Fetch client backed by a fresh Ed25519 key pair.
 *
 * The generated public key configures the handler under test while the private
 * key remains internal to the client.
 */
export async function createWebhookTestClient(
  options: CreateWebhookTestClientOptions = {},
): Promise<WebhookTestClient> {
  const keyPair = await crypto.subtle.generateKey(
    "Ed25519",
    true,
    ["sign", "verify"],
  ) as CryptoKeyPair;
  const publicKey = bytesToHex(await crypto.subtle.exportKey("raw", keyPair.publicKey));
  const applicationId = options.applicationId ?? defaultApplicationId;
  const fetchImplementation = options.fetch ?? globalThis.fetch;

  async function createRequest(
    input: WebhookTestRequestInput,
    payload: unknown,
    requestOptions: WebhookTestRequestOptions = {},
  ): Promise<Request> {
    const body = JSON.stringify(payload);
    const timestamp = requestOptions.timestamp ?? new Date().toISOString();
    const signature = await sign(keyPair.privateKey, timestamp, body);
    const headers = new Headers(requestOptions.headers);
    headers.set("content-type", "application/json");
    headers.set("x-signature-ed25519", signature);
    headers.set("x-signature-timestamp", timestamp);

    return new Request(input, {
      method: "POST",
      headers,
      body,
    });
  }

  function createPingRequest(
    input: WebhookTestRequestInput,
    requestOptions: WebhookTestRequestOptions = {},
  ): Promise<Request> {
    const payload: WebhookPing = {
      version: 1,
      application_id: applicationId,
      type: WebhookDeliveryType.Ping,
    };
    return createRequest(input, payload, requestOptions);
  }

  function createEventRequest<T extends WebhookEventType>(
    input: WebhookTestRequestInput,
    event: WebhookTestEventOptions<T>,
  ): Promise<Request> {
    const eventTimestamp = event.eventTimestamp ?? new Date().toISOString();
    const payload: WebhookEvent<T> = {
      version: 1,
      application_id: applicationId,
      type: WebhookDeliveryType.Event,
      event: {
        type: event.type,
        timestamp: eventTimestamp,
        data: event.data,
      },
    };
    return createRequest(input, payload, {
      timestamp: event.signatureTimestamp,
      headers: event.headers,
    });
  }

  function createUnknownEventRequest(
    input: WebhookTestRequestInput,
    event: WebhookTestUnknownEventOptions,
  ): Promise<Request> {
    const eventTimestamp = event.eventTimestamp ?? new Date().toISOString();
    const payload: UnknownWebhookEvent = {
      version: 1,
      application_id: applicationId,
      type: WebhookDeliveryType.Event,
      event: {
        type: event.type,
        timestamp: eventTimestamp,
        data: event.data,
      },
    };
    return createRequest(input, payload, {
      timestamp: event.signatureTimestamp,
      headers: event.headers,
    });
  }

  async function send(
    input: WebhookTestRequestInput,
    payload: unknown,
    requestOptions?: WebhookTestRequestOptions,
  ): Promise<Response> {
    return fetchImplementation(await createRequest(input, payload, requestOptions));
  }

  async function sendPing(
    input: WebhookTestRequestInput,
    requestOptions?: WebhookTestRequestOptions,
  ): Promise<Response> {
    return fetchImplementation(await createPingRequest(input, requestOptions));
  }

  async function sendEvent<T extends WebhookEventType>(
    input: WebhookTestRequestInput,
    event: WebhookTestEventOptions<T>,
  ): Promise<Response> {
    return fetchImplementation(await createEventRequest(input, event));
  }

  async function sendUnknownEvent(
    input: WebhookTestRequestInput,
    event: WebhookTestUnknownEventOptions,
  ): Promise<Response> {
    return fetchImplementation(await createUnknownEventRequest(input, event));
  }

  return {
    publicKey,
    createRequest,
    createPingRequest,
    createEventRequest,
    createUnknownEventRequest,
    send,
    sendPing,
    sendEvent,
    sendUnknownEvent,
  };
}

function bytesToHex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes))
    .map(value => value.toString(16).padStart(2, "0"))
    .join("");
}

async function sign(
  privateKey: CryptoKey,
  timestamp: string,
  body: string,
): Promise<string> {
  const timestampBytes = encoder.encode(timestamp);
  const bodyBytes = encoder.encode(body);
  const message = new Uint8Array(timestampBytes.length + bodyBytes.length);
  message.set(timestampBytes);
  message.set(bodyBytes, timestampBytes.length);

  return bytesToHex(await crypto.subtle.sign("Ed25519", privateKey, message));
}
