"use strict";

const assert = require("node:assert/strict");
const process = require("node:process");
const {
  createWebhookHandler,
  WebhookEventType,
} = require("@arcscord/webhooks");
const { createWebhookTestClient } = require("@arcscord/webhooks/testing");

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
  process.stdout.write("standalone webhooks cjs ok\n");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
