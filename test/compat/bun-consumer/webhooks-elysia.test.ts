import {
  createWebhookHandler,
  WebhookEventType,
} from "@arcscord/webhooks";
import { createWebhookTestClient } from "@arcscord/webhooks/testing";
import { describe, expect, test } from "bun:test";
import { Elysia } from "elysia";

describe("@arcscord/webhooks Elysia integration", () => {
  test("dispatches a signed event through Elysia's Fetch handler", async () => {
    let handled = 0;
    const completions: Array<Promise<unknown>> = [];
    const client = await createWebhookTestClient({
      applicationId: "123456789012345678",
    });
    const handler = createWebhookHandler({
      publicKey: client.publicKey,
      handlers: {
        [WebhookEventType.QuestUserEnrollment]: () => {
          handled += 1;
        },
      },
    });
    const app = new Elysia().post("/discord/webhooks", async ({ request }) => {
      const result = await handler.handleRequest(request);
      completions.push(result.completion);
      return result.response;
    });
    const request = await client.createEventRequest(
      "http://localhost/discord/webhooks",
      {
        type: WebhookEventType.QuestUserEnrollment,
        data: undefined,
      },
    );

    const response = await app.handle(request);

    expect(response.status).toBe(204);
    expect(response.headers.get("content-type")).toBe("application/json; charset=utf-8");
    expect(await response.text()).toBe("");
    expect(completions).toHaveLength(1);
    expect(await completions[0]).toMatchObject({
      status: "handled",
      eventType: WebhookEventType.QuestUserEnrollment,
      known: true,
    });
    expect(handled).toBe(1);
  });
});
