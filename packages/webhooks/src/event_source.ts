import type {
  EventDispatcher,
  EventSource,
} from "arcscord";
import type {
  WebhookEventDataMap,
  WebhookEventType,
} from "./types";
import { createEventSource } from "arcscord";

/** Event map used when Discord Webhook Events run through Arcscord. */
export type WebhookEventMap = {
  [T in WebhookEventType]: [data: WebhookEventDataMap[T]];
};

/** Typed source of Discord Webhook Events. */
export const webhookEvents: EventSource<WebhookEventMap>
  = createEventSource<WebhookEventMap>({
    name: "discord-webhooks",
  });

/** Dispatcher accepted by Arcscord mode in {@link createWebhookHandler}. */
export type WebhookEventDispatcher = EventDispatcher<typeof webhookEvents>;
