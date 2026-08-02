import type {
  WebhookEventDataMap,
  WebhookEventType,
} from "./types";

/** Event map used when Discord Webhook Events run through Arcscord. */
export type WebhookEventMap = {
  [T in WebhookEventType]: [data: WebhookEventDataMap[T]];
};

/**
 * Structurally compatible Arcscord event source.
 *
 * The phantom event map is type-only. Keeping the source contract local lets
 * standalone consumers import this package without installing Arcscord.
 */
export type WebhookEventSource = {
  readonly name: string;
  readonly id: symbol;
  /** @internal */
  readonly __events: WebhookEventMap;
};

/** Typed source of Discord Webhook Events. */
export const webhookEvents = Object.freeze({
  name: "discord-webhooks",
  id: Symbol("discord-webhooks"),
}) as WebhookEventSource;

/** Dispatcher accepted by Arcscord mode in {@link createWebhookHandler}. */
export type WebhookEventDispatcher = <T extends WebhookEventType>(
  event: T,
  ...args: WebhookEventMap[T]
) => Promise<{ matched: number }>;
