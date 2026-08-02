import type {
  WebhookEventDataMap,
  WebhookEventDispatcher,
} from "@arcscord/webhooks";
import {
  createWebhookHandler,
  webhookEvents,
  WebhookEventType,
} from "@arcscord/webhooks";
import { createWebhookTestClient } from "@arcscord/webhooks/testing";

const handler = createWebhookHandler({
  publicKey: "00".repeat(32),
  handlers: {
    [WebhookEventType.ApplicationDeauthorized]: delivery => void delivery.event.data.user.id,
  },
});

const dispatcher: WebhookEventDispatcher = async (event, ...args) => {
  void event;
  void args;
  return { matched: 0 };
};

type Deauthorized = WebhookEventDataMap[WebhookEventType.ApplicationDeauthorized];

declare const deauthorized: Deauthorized;
void deauthorized.user.id;
void handler;
void dispatcher;
void webhookEvents;
void createWebhookTestClient;
