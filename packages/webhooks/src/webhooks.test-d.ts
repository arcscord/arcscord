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
import { expectTypeOf } from "vitest";
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
