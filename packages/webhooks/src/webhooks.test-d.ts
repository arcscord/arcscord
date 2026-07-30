import type {
  APIEntitlement,
  APIUser,
  OAuth2Scopes,
} from "discord-api-types/v10";
import type {
  WebhookEventDataMap,
  WebhookEventHandlers,
  WebhookGameDirectMessage,
  WebhookLobbyMessage,
  WebhookLobbyMessageDelete,
} from "./types";
import { createEvent } from "arcscord";
import { expectTypeOf } from "vitest";
import { webhookEvents } from "./event_source";
import { WebhookEventType } from "./types";

const handlers = {
  [WebhookEventType.ApplicationAuthorized]: (delivery) => {
    expectTypeOf(delivery.event.data.user).toEqualTypeOf<APIUser>();
    expectTypeOf(delivery.event.data.scopes).toEqualTypeOf<OAuth2Scopes[]>();
  },
  [WebhookEventType.ApplicationDeauthorized]: (delivery) => {
    expectTypeOf(delivery.event.data.user).toEqualTypeOf<APIUser>();
  },
  [WebhookEventType.EntitlementCreate]: (delivery) => {
    expectTypeOf(delivery.event.data).toEqualTypeOf<APIEntitlement>();
  },
  [WebhookEventType.QuestUserEnrollment]: (delivery) => {
    expectTypeOf(delivery.event.data).toEqualTypeOf<undefined>();
  },
  [WebhookEventType.LobbyMessageCreate]: (delivery) => {
    expectTypeOf(delivery.event.data).toEqualTypeOf<WebhookLobbyMessage>();
  },
  [WebhookEventType.LobbyMessageDelete]: (delivery) => {
    expectTypeOf(delivery.event.data).toEqualTypeOf<WebhookLobbyMessageDelete>();
  },
  [WebhookEventType.GameDirectMessageUpdate]: (delivery) => {
    expectTypeOf(delivery.event.data).toEqualTypeOf<WebhookGameDirectMessage>();
  },
} satisfies WebhookEventHandlers;

expectTypeOf<
  WebhookEventDataMap[typeof WebhookEventType.EntitlementDelete]
>().toEqualTypeOf<APIEntitlement>();

const invalidHandlers = {
  [WebhookEventType.EntitlementUpdate]: (delivery) => {
    // @ts-expect-error Entitlement payloads do not expose lobby message fields.
    void delivery.event.data.lobby_id;
  },
} satisfies WebhookEventHandlers;

void handlers;
void invalidHandlers;

const arcscordHandler = createEvent({
  source: webhookEvents,
  event: WebhookEventType.ApplicationDeauthorized,
  run: (ctx, data) => {
    expectTypeOf(ctx.source).toEqualTypeOf<typeof webhookEvents>();
    expectTypeOf(data.user).toEqualTypeOf<APIUser>();
    // @ts-expect-error Deauthorization data is not an entitlement payload.
    void data.sku_id;
  },
});

void arcscordHandler;
