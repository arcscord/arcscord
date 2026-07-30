import type {
  ConfiguredWebhookSignatureOptions,
  CreateWebhookHandlerOptions,
  RawWebhookRequest,
  RawWebhookResponse,
  UnknownWebhookEvent,
  WebhookDispatchFailed,
  WebhookDispatchResult,
  WebhookEvent,
  WebhookEventHandler,
  WebhookEventType,
  WebhookHandler,
  WebhookHandleResult,
  WebhookRawBody,
} from "./types";
import {
  WebhookDeliveryType,
  WebhookEventType as WebhookEventTypes,
} from "./types";
import {
  assertWebhookPublicKey,
  verifyWebhookSignature as verifySignature,
} from "./verification";

const jsonHeaders = Object.freeze({
  "content-type": "application/json; charset=utf-8",
});

const knownEventTypes = new Set<string>(Object.values(WebhookEventTypes));

type ParsedWebhook
  = { kind: "ping" }
    | { kind: "event"; event: WebhookEvent | UnknownWebhookEvent; known: boolean };

function rawResponse(
  status: RawWebhookResponse["status"],
  body: string | null = null,
): RawWebhookResponse {
  const headers = status === 405
    ? Object.freeze({ ...jsonHeaders, allow: "POST" })
    : jsonHeaders;
  return { status, headers, body };
}

function rejectedResult(
  status: 400 | 401 | 405,
  message: string,
): WebhookHandleResult<RawWebhookResponse> {
  return {
    response: rawResponse(status, JSON.stringify({ error: message })),
    completion: Promise.resolve({
      status: "not-dispatched",
      reason: "rejected",
    }),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseWebhook(body: WebhookRawBody): ParsedWebhook | null {
  let parsed: unknown;
  try {
    const bytes = typeof body === "string"
      ? new TextEncoder().encode(body)
      : body instanceof Uint8Array
        ? body
        : new Uint8Array(body);
    parsed = JSON.parse(new TextDecoder().decode(bytes));
  }
  catch {
    return null;
  }

  if (
    !isRecord(parsed)
    || parsed.version !== 1
    || typeof parsed.application_id !== "string"
  ) {
    return null;
  }

  if (parsed.type === WebhookDeliveryType.Ping) {
    return { kind: "ping" };
  }

  if (
    parsed.type !== WebhookDeliveryType.Event
    || !isRecord(parsed.event)
    || typeof parsed.event.type !== "string"
    || typeof parsed.event.timestamp !== "string"
  ) {
    return null;
  }

  const known = knownEventTypes.has(parsed.event.type);
  return {
    kind: "event",
    event: parsed as WebhookEvent | UnknownWebhookEvent,
    known,
  };
}

async function reportFailure(
  error: unknown,
  event: WebhookEvent | UnknownWebhookEvent,
  options: CreateWebhookHandlerOptions,
  known: boolean,
): Promise<WebhookDispatchFailed> {
  let errorHandlerError: unknown;
  if (options.onError) {
    try {
      await options.onError(error, event);
    }
    catch (reportError) {
      errorHandlerError = reportError;
    }
  }

  return {
    status: "failed",
    event,
    eventType: event.event.type,
    known,
    error,
    ...(errorHandlerError === undefined ? {} : { errorHandlerError }),
  };
}

async function dispatchEvent(
  event: WebhookEvent | UnknownWebhookEvent,
  known: boolean,
  options: CreateWebhookHandlerOptions,
): Promise<WebhookDispatchResult> {
  if (known && "dispatch" in options && options.dispatch) {
    try {
      const typedEvent = event as WebhookEvent;
      const result = await options.dispatch(
        typedEvent.event.type,
        typedEvent.event.data,
      );
      return {
        status: result.matched === 0 ? "unhandled" : "handled",
        event,
        eventType: event.event.type,
        known,
      };
    }
    catch (error) {
      return reportFailure(error, event, options, known);
    }
  }

  const handler = known && "handlers" in options
    ? options.handlers?.[event.event.type as WebhookEventType] as
    | WebhookEventHandler<WebhookEventType>
    | undefined
    : options.onUnknownEvent;

  if (!handler) {
    return {
      status: "unhandled",
      event,
      eventType: event.event.type,
      known,
    };
  }

  try {
    await (handler as (delivery: typeof event) => void | Promise<void>)(event);
    return {
      status: "handled",
      event,
      eventType: event.event.type,
      known,
    };
  }
  catch (error) {
    return reportFailure(error, event, options, known);
  }
}

function scheduleDispatch(
  event: WebhookEvent | UnknownWebhookEvent,
  known: boolean,
  options: CreateWebhookHandlerOptions,
): Promise<WebhookDispatchResult> {
  return new Promise((resolve) => {
    setTimeout(() => {
      void dispatchEvent(event, known, options).then(resolve, (error) => {
        resolve({
          status: "failed",
          event,
          eventType: event.event.type,
          known,
          error,
        });
      });
    }, 0);
  });
}

function fetchResponse(response: RawWebhookResponse): Response {
  return new Response(response.body, {
    status: response.status,
    headers: response.headers,
  });
}

/** Creates a server-free, framework-neutral Discord Webhook Events handler. */
export function createWebhookHandler(
  options: CreateWebhookHandlerOptions,
): WebhookHandler {
  const hasHandlers = "handlers" in options && options.handlers !== undefined;
  const hasDispatch = "dispatch" in options && options.dispatch !== undefined;
  if (hasHandlers === hasDispatch) {
    throw new TypeError("configure exactly one webhook dispatch mode: handlers or dispatch");
  }
  if (hasDispatch && typeof options.dispatch !== "function") {
    throw new TypeError("webhook dispatch must be a function");
  }

  assertWebhookPublicKey(options.publicKey);

  const verifyWebhookSignature = (
    input: ConfiguredWebhookSignatureOptions,
  ): Promise<boolean> => verifySignature({
    ...input,
    publicKey: options.publicKey,
  });

  const handleRaw = async (
    request: RawWebhookRequest,
  ): Promise<WebhookHandleResult<RawWebhookResponse>> => {
    if ((request.method ?? "POST").toUpperCase() !== "POST") {
      return rejectedResult(405, "method not allowed");
    }

    if (!request.signature || !request.timestamp) {
      return rejectedResult(401, "invalid request signature");
    }

    const verified = await verifyWebhookSignature({
      body: request.body,
      signature: request.signature,
      timestamp: request.timestamp,
    });
    if (!verified) {
      return rejectedResult(401, "invalid request signature");
    }

    const payload = parseWebhook(request.body);
    if (!payload) {
      return rejectedResult(400, "invalid webhook payload");
    }

    if (payload.kind === "ping") {
      return {
        response: rawResponse(204),
        completion: Promise.resolve({
          status: "not-dispatched",
          reason: "ping",
        }),
      };
    }

    return {
      response: rawResponse(204),
      completion: scheduleDispatch(payload.event, payload.known, options),
    };
  };

  const handleRequest = async (
    request: Request,
  ): Promise<WebhookHandleResult<Response>> => {
    if (request.method.toUpperCase() !== "POST") {
      const result = rejectedResult(405, "method not allowed");
      return {
        response: fetchResponse(result.response),
        completion: result.completion,
      };
    }

    const signature = request.headers.get("x-signature-ed25519");
    const timestamp = request.headers.get("x-signature-timestamp");
    if (!signature || !timestamp) {
      const result = rejectedResult(401, "invalid request signature");
      return {
        response: fetchResponse(result.response),
        completion: result.completion,
      };
    }

    let body: ArrayBuffer;
    try {
      body = await request.arrayBuffer();
    }
    catch {
      const result = rejectedResult(400, "invalid request body");
      return {
        response: fetchResponse(result.response),
        completion: result.completion,
      };
    }

    const result = await handleRaw({
      body,
      signature,
      timestamp,
    });
    return {
      response: fetchResponse(result.response),
      completion: result.completion,
    };
  };

  return {
    handleRaw,
    handleRequest,
    verifyWebhookSignature,
  };
}
