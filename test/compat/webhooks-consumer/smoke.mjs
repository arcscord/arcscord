import assert from "node:assert/strict";
import process from "node:process";
import {
  createWebhookHandler,
  WebhookEventType,
} from "@arcscord/webhooks";
import { createWebhookTestClient } from "@arcscord/webhooks/testing";

async function main() {
  let handled = 0;
  const client = await createWebhookTestClient();
  const handler = createWebhookHandler({
    publicKey: client.publicKey,
    handlers: {
      [WebhookEventType.QuestUserEnrollment]: () => {
        handled += 1;
      },
    },
  });
  const request = await client.createEventRequest("https://example.test/webhooks", {
    type: WebhookEventType.QuestUserEnrollment,
    data: undefined,
  });
  const result = await handler.handleRequest(request);

  assert.equal(result.response.status, 204);
  assert.equal((await result.completion).status, "handled");
  assert.equal(handled, 1);
  process.stdout.write("standalone webhooks esm ok\n");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
