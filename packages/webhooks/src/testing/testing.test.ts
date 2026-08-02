import type { WebhookEventDataMap } from "../types";
import { describe, expect, it, vi } from "vitest";
import { createWebhookHandler } from "../handler";
import {
  WebhookDeliveryType,
  WebhookEventType,
} from "../types";
import { createWebhookTestClient } from "./index";

describe("createWebhookTestClient", () => {
  it("creates signed ping requests accepted by a real handler", async () => {
    const client = await createWebhookTestClient({
      applicationId: "123456789012345678",
    });
    const handler = createWebhookHandler({
      publicKey: client.publicKey,
      handlers: {},
    });
    const request = await client.createPingRequest("https://example.com/webhooks");
    const result = await handler.handleRequest(request);

    expect(client.publicKey).toMatch(/^[\da-f]{64}$/);
    expect(result.response.status).toBe(204);
    await expect(result.completion).resolves.toEqual({
      status: "not-dispatched",
      reason: "ping",
    });
  });

  it("creates typed event requests and preserves custom timestamps", async () => {
    const callback = vi.fn();
    const client = await createWebhookTestClient();
    const handler = createWebhookHandler({
      publicKey: client.publicKey,
      handlers: {
        [WebhookEventType.QuestUserEnrollment]: callback,
      },
    });
    const request = await client.createEventRequest("https://example.com/webhooks", {
      type: WebhookEventType.QuestUserEnrollment,
      data: undefined,
      eventTimestamp: "2026-07-26T10:00:00.000Z",
      signatureTimestamp: "2026-07-26T10:00:01.000Z",
      headers: {
        "x-test-framework": "vitest",
      },
    });
    const result = await handler.handleRequest(request);

    expect(request.headers.get("x-signature-timestamp")).toBe("2026-07-26T10:00:01.000Z");
    expect(request.headers.get("x-test-framework")).toBe("vitest");
    expect(result.response.status).toBe(204);
    await expect(result.completion).resolves.toMatchObject({
      status: "handled",
      eventType: WebhookEventType.QuestUserEnrollment,
    });
    expect(callback).toHaveBeenCalledWith(expect.objectContaining({
      type: WebhookDeliveryType.Event,
      event: expect.objectContaining({
        timestamp: "2026-07-26T10:00:00.000Z",
      }),
    }));
  });

  it("sends requests through an injected Fetch implementation", async () => {
    let receivedRequest: Request | undefined;
    const fetchImplementation: typeof globalThis.fetch = async (input, init) => {
      receivedRequest = input instanceof Request ? input : new Request(input, init);
      return new Response(
        receivedRequest.headers.get("x-signature-ed25519"),
        { status: 200 },
      );
    };
    const client = await createWebhookTestClient({ fetch: fetchImplementation });
    const response = await client.sendPing("https://example.com/webhooks");

    expect(receivedRequest).toBeInstanceOf(Request);
    expect(await response.text()).toMatch(/^[\da-f]{128}$/);
  });

  it("creates signed future-event requests", async () => {
    const unknownCallback = vi.fn();
    const client = await createWebhookTestClient();
    const handler = createWebhookHandler({
      publicKey: client.publicKey,
      handlers: {},
      onUnknownEvent: unknownCallback,
    });
    const request = await client.createUnknownEventRequest("https://example.com/webhooks", {
      type: "FUTURE_EVENT",
      data: { value: true },
    });
    const result = await handler.handleRequest(request);

    expect(result.response.status).toBe(204);
    await expect(result.completion).resolves.toMatchObject({
      status: "handled",
      eventType: "FUTURE_EVENT",
      known: false,
    });
    expect(unknownCallback).toHaveBeenCalledOnce();
  });
});

function acceptsEventData<T extends WebhookEventType>(
  type: T,
  data: WebhookEventDataMap[T],
): { type: T; data: WebhookEventDataMap[T] } {
  return { type, data };
}

describe("test client event typing", () => {
  it("keeps event names and data associated", () => {
    expect(acceptsEventData(
      WebhookEventType.QuestUserEnrollment,
      undefined,
    )).toEqual({
      type: WebhookEventType.QuestUserEnrollment,
      data: undefined,
    });

    // @ts-expect-error Quest enrollment data must remain undefined.
    acceptsEventData(WebhookEventType.QuestUserEnrollment, { id: "invalid" });
  });
});
