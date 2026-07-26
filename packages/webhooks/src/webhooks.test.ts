import type { RawWebhookRequest, WebhookRawBody } from "./types";
import { MessageType } from "discord-api-types/v10";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { createWebhookHandler } from "./handler";
import {
  WebhookDeliveryType,
  WebhookEventType,
} from "./types";
import { verifyWebhookSignature } from "./verification";

const timestamp = "2026-07-26T12:00:00.000000+00:00";

let publicKey = "";
let privateKey: CryptoKey;

function bytesToHex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes))
    .map(value => value.toString(16).padStart(2, "0"))
    .join("");
}

function bodyBytes(body: WebhookRawBody): Uint8Array<ArrayBuffer> {
  if (typeof body === "string") {
    return new TextEncoder().encode(body);
  }
  if (body instanceof Uint8Array) {
    const result = new Uint8Array(new ArrayBuffer(body.byteLength));
    result.set(body);
    return result;
  }
  return new Uint8Array(body.slice(0));
}

async function signBody(body: WebhookRawBody, signedTimestamp = timestamp): Promise<string> {
  const timestampBytes = new TextEncoder().encode(signedTimestamp);
  const rawBody = bodyBytes(body);
  const message = new Uint8Array(new ArrayBuffer(timestampBytes.length + rawBody.length));
  message.set(timestampBytes);
  message.set(rawBody, timestampBytes.length);
  return bytesToHex(await crypto.subtle.sign("Ed25519", privateKey, message));
}

async function signedRequest(
  payload: unknown,
  format: "string" | "uint8array" | "arraybuffer" = "string",
): Promise<RawWebhookRequest> {
  const serialized = JSON.stringify(payload);
  const encoded = new TextEncoder().encode(serialized);
  const body = format === "string"
    ? serialized
    : format === "uint8array"
      ? encoded
      : encoded.buffer;
  return {
    body,
    signature: await signBody(body),
    timestamp,
  };
}

function eventPayload(type: string, data: unknown): unknown {
  return {
    version: 1,
    application_id: "123456789012345678",
    type: WebhookDeliveryType.Event,
    event: {
      type,
      timestamp,
      data,
    },
  };
}

beforeAll(async () => {
  const pair = await crypto.subtle.generateKey(
    "Ed25519",
    true,
    ["sign", "verify"],
  ) as CryptoKeyPair;
  privateKey = pair.privateKey;
  publicKey = bytesToHex(await crypto.subtle.exportKey("raw", pair.publicKey));
});

describe("signature verification", () => {
  it("rejects malformed application public keys at handler creation", () => {
    expect(() => createWebhookHandler({
      publicKey: "not-hex",
      handlers: {},
    })).toThrow(TypeError);
  });

  it.each(["string", "uint8array", "arraybuffer"] as const)(
    "verifies the exact %s body",
    async (format) => {
      const request = await signedRequest({
        version: 1,
        application_id: "123456789012345678",
        type: WebhookDeliveryType.Ping,
      }, format);

      await expect(verifyWebhookSignature({
        publicKey,
        body: request.body,
        signature: request.signature!,
        timestamp: request.timestamp!,
      })).resolves.toBe(true);
    },
  );

  it("rejects malformed signatures and signed-message changes", async () => {
    const body = JSON.stringify({ value: true });
    const signature = await signBody(body);

    await expect(verifyWebhookSignature({
      publicKey,
      body,
      signature: "zz",
      timestamp,
    })).resolves.toBe(false);
    await expect(verifyWebhookSignature({
      publicKey,
      body: `${body} `,
      signature,
      timestamp,
    })).resolves.toBe(false);
    await expect(verifyWebhookSignature({
      publicKey,
      body,
      signature,
      timestamp: `${timestamp}1`,
    })).resolves.toBe(false);
  });

  it("exposes the configured verifier on the handler", async () => {
    const handler = createWebhookHandler({ publicKey, handlers: {} });
    const body = JSON.stringify({ value: true });
    const signature = await signBody(body);

    await expect(handler.verifyWebhookSignature({
      body,
      signature,
      timestamp,
    })).resolves.toBe(true);
  });
});

describe("request handling", () => {
  it("acknowledges a signed ping without dispatching", async () => {
    const handler = createWebhookHandler({ publicKey, handlers: {} });
    const result = await handler.handleRaw(await signedRequest({
      version: 1,
      application_id: "123456789012345678",
      type: WebhookDeliveryType.Ping,
    }));

    expect(result.response).toEqual({
      status: 204,
      headers: {
        "content-type": "application/json; charset=utf-8",
      },
      body: null,
    });
    await expect(result.completion).resolves.toEqual({
      status: "not-dispatched",
      reason: "ping",
    });
  });

  it("returns 405 before reading signature information for non-POST methods", async () => {
    const handler = createWebhookHandler({ publicKey, handlers: {} });
    const result = await handler.handleRaw({
      method: "GET",
      body: "",
    });

    expect(result.response.status).toBe(405);
    expect(result.response.headers.allow).toBe("POST");
    await expect(result.completion).resolves.toEqual({
      status: "not-dispatched",
      reason: "rejected",
    });
  });

  it("returns 401 for missing, malformed and invalid signatures", async () => {
    const handler = createWebhookHandler({ publicKey, handlers: {} });
    const missing = await handler.handleRaw({ body: "{}" });
    const malformed = await handler.handleRaw({
      body: "{}",
      signature: "not-hex",
      timestamp,
    });
    const otherBody = JSON.stringify({ changed: true });
    const invalid = await handler.handleRaw({
      body: otherBody,
      signature: await signBody("{}"),
      timestamp,
    });

    expect(missing.response.status).toBe(401);
    expect(malformed.response.status).toBe(401);
    expect(invalid.response.status).toBe(401);
  });

  it("returns 400 for signed malformed JSON and invalid envelopes", async () => {
    const handler = createWebhookHandler({ publicKey, handlers: {} });
    const malformedBody = "{";
    const malformed = await handler.handleRaw({
      body: malformedBody,
      signature: await signBody(malformedBody),
      timestamp,
    });
    const invalidEnvelope = await handler.handleRaw(await signedRequest({
      version: 2,
      application_id: "123456789012345678",
      type: WebhookDeliveryType.Ping,
    }));

    expect(malformed.response.status).toBe(400);
    expect(invalidEnvelope.response.status).toBe(400);
  });

  it("returns a Fetch Response with the same acknowledgement semantics", async () => {
    const handler = createWebhookHandler({ publicKey, handlers: {} });
    const raw = await signedRequest({
      version: 1,
      application_id: "123456789012345678",
      type: WebhookDeliveryType.Ping,
    });
    const request = new Request("https://example.com/webhooks", {
      method: "POST",
      headers: {
        "x-signature-ed25519": raw.signature!,
        "x-signature-timestamp": raw.timestamp!,
      },
      body: raw.body as string,
    });
    const result = await handler.handleRequest(request);

    expect(result.response).toBeInstanceOf(Response);
    expect(result.response.status).toBe(204);
    expect(result.response.body).toBeNull();
    expect(result.response.headers.get("content-type")).toBe("application/json; charset=utf-8");
  });

  it("returns Fetch 405 and 401 responses without consuming a body", async () => {
    const handler = createWebhookHandler({ publicKey, handlers: {} });
    const get = await handler.handleRequest(new Request("https://example.com", {
      method: "GET",
    }));
    const unsigned = await handler.handleRequest(new Request("https://example.com", {
      method: "POST",
      body: "{}",
    }));

    expect(get.response.status).toBe(405);
    expect(get.response.headers.get("allow")).toBe("POST");
    expect(unsigned.response.status).toBe(401);
  });
});

describe("event dispatch", () => {
  it("dispatches a known event after preparing the acknowledgement", async () => {
    const callback = vi.fn();
    const handler = createWebhookHandler({
      publicKey,
      handlers: {
        [WebhookEventType.EntitlementCreate]: callback,
      },
    });
    const result = await handler.handleRaw(await signedRequest(eventPayload(
      WebhookEventType.EntitlementCreate,
      {
        id: "entitlement",
        application_id: "application",
        sku_id: "sku",
        type: 4,
        deleted: false,
      },
    )));

    expect(result.response.status).toBe(204);
    expect(callback).not.toHaveBeenCalled();
    await expect(result.completion).resolves.toMatchObject({
      status: "handled",
      eventType: WebhookEventType.EntitlementCreate,
      known: true,
    });
    expect(callback).toHaveBeenCalledOnce();
    expect(callback.mock.calls[0]?.[0].event.data.id).toBe("entitlement");
  });

  it("reports a known event without a registered callback as unhandled", async () => {
    const handler = createWebhookHandler({ publicKey, handlers: {} });
    const result = await handler.handleRaw(await signedRequest(eventPayload(
      WebhookEventType.ApplicationDeauthorized,
      { user: { id: "user" } },
    )));

    await expect(result.completion).resolves.toMatchObject({
      status: "unhandled",
      eventType: WebhookEventType.ApplicationDeauthorized,
      known: true,
    });
  });

  it("accepts and reports future event names", async () => {
    const onUnknownEvent = vi.fn();
    const handler = createWebhookHandler({
      publicKey,
      handlers: {},
      onUnknownEvent,
    });
    const result = await handler.handleRaw(await signedRequest(eventPayload(
      "FUTURE_EVENT",
      { value: true },
    )));

    expect(result.response.status).toBe(204);
    await expect(result.completion).resolves.toMatchObject({
      status: "handled",
      eventType: "FUTURE_EVENT",
      known: false,
    });
    expect(onUnknownEvent.mock.calls[0]?.[0].event.data).toEqual({ value: true });
  });

  it("marks a future event without onUnknownEvent as unhandled", async () => {
    const handler = createWebhookHandler({ publicKey, handlers: {} });
    const result = await handler.handleRaw(await signedRequest(eventPayload(
      "FUTURE_EVENT",
      {},
    )));

    await expect(result.completion).resolves.toMatchObject({
      status: "unhandled",
      eventType: "FUTURE_EVENT",
      known: false,
    });
  });

  it("contains handler and error reporter failures in completion", async () => {
    const handlerError = new Error("handler failed");
    const reporterError = new Error("reporter failed");
    const onError = vi.fn(() => {
      throw reporterError;
    });
    const handler = createWebhookHandler({
      publicKey,
      handlers: {
        [WebhookEventType.LobbyMessageCreate]: () => {
          throw handlerError;
        },
      },
      onError,
    });
    const result = await handler.handleRaw(await signedRequest(eventPayload(
      WebhookEventType.LobbyMessageCreate,
      {
        id: "message",
        type: MessageType.Default,
        content: "hello",
        lobby_id: "lobby",
        channel_id: "channel",
        author: { id: "user" },
        flags: 0,
      },
    )));

    await expect(result.completion).resolves.toMatchObject({
      status: "failed",
      known: true,
      error: handlerError,
      errorHandlerError: reporterError,
    });
    expect(onError).toHaveBeenCalledWith(
      handlerError,
      expect.objectContaining({
        event: expect.objectContaining({
          type: WebhookEventType.LobbyMessageCreate,
        }),
      }),
    );
  });
});
