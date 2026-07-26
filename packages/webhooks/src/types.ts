import type {
  APIApplication,
  APIChannel,
  APIEntitlement,
  APIMessage,
  APIMessageActivity,
  APIUser,
  APIWebhookEventApplicationAuthorizedData,
  APIWebhookEventApplicationDeauthorizedData,
  MessageFlags,
  MessageType,
  Snowflake,
} from "discord-api-types/v10";

/** Top-level Discord Webhook Events payload kind. */
export enum WebhookDeliveryType {
  /** Endpoint verification delivery. */
  Ping = 0,
  /** Application event delivery. */
  Event = 1,
}

/** Event names currently documented by Discord's Webhook Events API. */
export enum WebhookEventType {
  ApplicationAuthorized = "APPLICATION_AUTHORIZED",
  ApplicationDeauthorized = "APPLICATION_DEAUTHORIZED",
  EntitlementCreate = "ENTITLEMENT_CREATE",
  EntitlementUpdate = "ENTITLEMENT_UPDATE",
  EntitlementDelete = "ENTITLEMENT_DELETE",
  QuestUserEnrollment = "QUEST_USER_ENROLLMENT",
  LobbyMessageCreate = "LOBBY_MESSAGE_CREATE",
  LobbyMessageUpdate = "LOBBY_MESSAGE_UPDATE",
  LobbyMessageDelete = "LOBBY_MESSAGE_DELETE",
  GameDirectMessageCreate = "GAME_DIRECT_MESSAGE_CREATE",
  GameDirectMessageUpdate = "GAME_DIRECT_MESSAGE_UPDATE",
  GameDirectMessageDelete = "GAME_DIRECT_MESSAGE_DELETE",
}

/**
 * Message data delivered by Discord for lobby message create events.
 *
 * This type supplements `discord-api-types` until its Webhook Events types
 * include Discord Social SDK messages.
 */
export type WebhookLobbyMessage = {
  id: Snowflake;
  type: MessageType;
  content: string;
  lobby_id: Snowflake;
  channel_id: Snowflake;
  author: APIUser;
  metadata?: Record<string, unknown>;
  flags: MessageFlags;
  application_id?: Snowflake;
};

/** Lobby message data delivered for an update event. */
export type WebhookLobbyMessageUpdate = WebhookLobbyMessage & {
  edited_timestamp?: string | null;
  timestamp?: string;
};

/** Identity of a deleted lobby message. */
export type WebhookLobbyMessageDelete = {
  id: Snowflake;
  lobby_id: Snowflake;
};

/**
 * Direct-message data delivered during an active Discord Social SDK session.
 *
 * Discord can send either a standard message or its specialized provisional
 * account message shape. The common fields are required while fields from the
 * standard message object remain available when Discord includes them.
 */
export type WebhookGameDirectMessage
  = Pick<APIMessage, "id" | "channel_id" | "author" | "content">
    & Partial<Omit<APIMessage, "id" | "channel_id" | "author" | "content">>
    & {
      recipient_id?: Snowflake;
      lobby_id?: Snowflake;
      channel?: APIChannel;
      activity?: APIMessageActivity;
      application?: Partial<APIApplication>;
    };

/** Maps each documented event name to its Discord payload data. */
export type WebhookEventDataMap = {
  [WebhookEventType.ApplicationAuthorized]: APIWebhookEventApplicationAuthorizedData;
  [WebhookEventType.ApplicationDeauthorized]: APIWebhookEventApplicationDeauthorizedData;
  [WebhookEventType.EntitlementCreate]: APIEntitlement;
  [WebhookEventType.EntitlementUpdate]: APIEntitlement;
  [WebhookEventType.EntitlementDelete]: APIEntitlement;
  [WebhookEventType.QuestUserEnrollment]: undefined;
  [WebhookEventType.LobbyMessageCreate]: WebhookLobbyMessage;
  [WebhookEventType.LobbyMessageUpdate]: WebhookLobbyMessageUpdate;
  [WebhookEventType.LobbyMessageDelete]: WebhookLobbyMessageDelete;
  [WebhookEventType.GameDirectMessageCreate]: WebhookGameDirectMessage;
  [WebhookEventType.GameDirectMessageUpdate]: WebhookGameDirectMessage;
  [WebhookEventType.GameDirectMessageDelete]: WebhookGameDirectMessage;
};

/** Signed Discord PING delivery used to verify a Webhook Events endpoint. */
export type WebhookPing = {
  version: 1;
  application_id: Snowflake;
  type: WebhookDeliveryType.Ping;
};

/** A typed, signed Discord Webhook Events delivery. */
export type WebhookEvent<T extends WebhookEventType = WebhookEventType> = {
  version: 1;
  application_id: Snowflake;
  type: WebhookDeliveryType.Event;
  event: {
    type: T;
    timestamp: string;
    data: WebhookEventDataMap[T];
  };
};

/** A valid signed delivery whose event name is not known by this package version. */
export type UnknownWebhookEvent = {
  version: 1;
  application_id: Snowflake;
  type: WebhookDeliveryType.Event;
  event: {
    type: string;
    timestamp: string;
    data?: unknown;
  };
};

/** Synchronous or asynchronous callback return. */
export type MaybePromise<T> = T | Promise<T>;

/** Callback for one known Discord Webhook Event. */
export type WebhookEventHandler<T extends WebhookEventType> = (
  event: WebhookEvent<T>,
) => MaybePromise<void>;

/** Registry of callbacks keyed by Discord event name. */
export type WebhookEventHandlers = {
  [T in WebhookEventType]?: WebhookEventHandler<T>;
};

/** Callback for forward-compatible event names unknown to this package version. */
export type UnknownWebhookEventHandler = (
  event: UnknownWebhookEvent,
) => MaybePromise<void>;

/** Callback used to observe a user handler failure. */
export type WebhookErrorHandler = (
  error: unknown,
  event: WebhookEvent | UnknownWebhookEvent,
) => MaybePromise<void>;

/** Options accepted by {@link createWebhookHandler}. */
export type CreateWebhookHandlerOptions = {
  /** Application public key from the Discord Developer Portal, encoded as hex. */
  publicKey: string;
  /** Typed event callbacks. One callback can be registered for each event name. */
  handlers: WebhookEventHandlers;
  /** Called for signed event names introduced after this package version. */
  onUnknownEvent?: UnknownWebhookEventHandler;
  /** Called when a known or unknown event callback fails. */
  onError?: WebhookErrorHandler;
};

/** Raw request body accepted by the framework-neutral handler. */
export type WebhookRawBody = string | Uint8Array | ArrayBuffer;

/** Framework-neutral input for a Discord Webhook Events request. */
export type RawWebhookRequest = {
  /** HTTP method. Defaults to `POST`. */
  method?: string;
  /** Exact, unparsed request body used for signature verification. */
  body: WebhookRawBody;
  /** Value of `X-Signature-Ed25519`. */
  signature?: string | null;
  /** Value of `X-Signature-Timestamp`. */
  timestamp?: string | null;
};

/** Serializable HTTP response returned by {@link WebhookHandler.handleRaw}. */
export type RawWebhookResponse = {
  status: 204 | 400 | 401 | 405;
  headers: Readonly<Record<string, string>>;
  body: string | null;
};

/** Event identity shared by handled, unhandled, and failed dispatch results. */
export type WebhookDispatchEventResult = {
  event: WebhookEvent | UnknownWebhookEvent;
  eventType: string;
  known: boolean;
};

/** A registered known or unknown-event callback completed successfully. */
export type WebhookDispatchHandled = WebhookDispatchEventResult & {
  status: "handled";
};

/** The delivery was valid but no callback was registered for it. */
export type WebhookDispatchUnhandled = WebhookDispatchEventResult & {
  status: "unhandled";
};

/** A callback failed after Discord's HTTP acknowledgement was prepared. */
export type WebhookDispatchFailed = WebhookDispatchEventResult & {
  status: "failed";
  error: unknown;
  errorHandlerError?: unknown;
};

/** No event callback should run for the request. */
export type WebhookNotDispatched = {
  status: "not-dispatched";
  reason: "ping" | "rejected";
};

/** Structured completion of the event dispatch associated with one request. */
export type WebhookDispatchResult
  = WebhookDispatchHandled
    | WebhookDispatchUnhandled
    | WebhookDispatchFailed
    | WebhookNotDispatched;

/** HTTP acknowledgement and independently observable event processing. */
export type WebhookHandleResult<ResponseType> = {
  response: ResponseType;
  completion: Promise<WebhookDispatchResult>;
};

/** Arguments accepted by the standalone signature verifier. */
export type VerifyWebhookSignatureOptions = {
  publicKey: string;
  signature: string;
  timestamp: string;
  body: WebhookRawBody;
};

/** Arguments accepted by a handler's configured signature verifier. */
export type ConfiguredWebhookSignatureOptions = Omit<
  VerifyWebhookSignatureOptions,
  "publicKey"
>;

/** Framework-neutral Discord Webhook Events request handler. */
export type WebhookHandler = {
  /**
   * Handles a Fetch API request and returns a Fetch response plus dispatch completion.
   */
  handleRequest: (
    request: Request,
  ) => Promise<WebhookHandleResult<Response>>;

  /**
   * Handles an exact raw body and signature headers without depending on a web framework.
   */
  handleRaw: (
    request: RawWebhookRequest,
  ) => Promise<WebhookHandleResult<RawWebhookResponse>>;

  /**
   * Verifies a request signature with the public key configured on this handler.
   */
  verifyWebhookSignature: (
    options: ConfiguredWebhookSignatureOptions,
  ) => Promise<boolean>;
};
