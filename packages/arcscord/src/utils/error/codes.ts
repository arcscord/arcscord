/** Stable public error codes emitted by the Arcscord framework. */
export const arcscordErrorCodes = {
  ClientReadyTimeout: "CLIENT_READY_TIMEOUT",
  ApplicationUnavailable: "APPLICATION_UNAVAILABLE",
  CommandValidationFailed: "COMMAND_VALIDATION_FAILED",
  CommandRegistrationFailed: "COMMAND_REGISTRATION_FAILED",
  CommandResolutionFailed: "COMMAND_RESOLUTION_FAILED",
  ComponentValidationFailed: "COMPONENT_VALIDATION_FAILED",
  MessageComponentValidationFailed: "MESSAGE_COMPONENT_VALIDATION_FAILED",
  ComponentRouteInvalid: "COMPONENT_ROUTE_INVALID",
  ComponentRouteDuplicate: "COMPONENT_ROUTE_DUPLICATE",
  ComponentCustomIdTooLong: "COMPONENT_CUSTOM_ID_TOO_LONG",
  EventHandlerDuplicate: "EVENT_HANDLER_DUPLICATE",
  EventIntentMissing: "EVENT_INTENT_MISSING",
  InteractionOperationFailed: "INTERACTION_OPERATION_FAILED",
  CommandNotFound: "COMMAND_NOT_FOUND",
  CommandOptionParsingFailed: "COMMAND_OPTION_PARSING_FAILED",
  CommandContextCreationFailed: "COMMAND_CONTEXT_CREATION_FAILED",
  CommandDeferFailed: "COMMAND_DEFER_FAILED",
  ComponentNotFound: "COMPONENT_NOT_FOUND",
  ComponentMultipleMatches: "COMPONENT_MULTIPLE_MATCHES",
  ComponentContextCreationFailed: "COMPONENT_CONTEXT_CREATION_FAILED",
  ComponentTypedSelectInvalidValues: "COMPONENT_TYPED_SELECT_INVALID_VALUES",
  ComponentDeferFailed: "COMPONENT_DEFER_FAILED",
  AutocompleteExecutionFailed: "AUTOCOMPLETE_EXECUTION_FAILED",
} as const;

/** Union of every stable Arcscord framework error code. */
export type ArcscordErrorCode = typeof arcscordErrorCodes[keyof typeof arcscordErrorCodes];

/** Shared metadata shape for interaction-related error codes (commands, components, autocomplete). */
type InteractionErrorContext = {
  interactionId?: string;
  commandName?: string;
  route?: string;
  reason?: string;
  [key: string]: unknown;
};

/** Code-specific structured metadata carried by {@link ArcscordError}. */
export type ArcscordErrorMetadata = {
  CLIENT_READY_TIMEOUT: { timeoutMs: number };
  APPLICATION_UNAVAILABLE: { operation: string };
  COMMAND_VALIDATION_FAILED: {
    rule: string;
    path?: string;
    group?: string;
    [key: string]: unknown;
  };
  COMMAND_REGISTRATION_FAILED: {
    scope: "global" | "guild";
    guildId?: string;
    operation: "put" | "create" | "fetch" | "delete" | "sync";
  };
  COMMAND_RESOLUTION_FAILED: {
    commandName?: string;
    interactionType?: number;
    reason: string;
  };
  COMPONENT_VALIDATION_FAILED: {
    rule: string;
    route?: string;
    [key: string]: unknown;
  };
  MESSAGE_COMPONENT_VALIDATION_FAILED: {
    rule: string;
    path: string;
    componentType?: number;
    details: Readonly<Record<string, unknown>>;
  };
  COMPONENT_ROUTE_INVALID: { route: string; reason: string };
  COMPONENT_ROUTE_DUPLICATE: { route: string; canonicalRoute: string };
  COMPONENT_CUSTOM_ID_TOO_LONG: { route: string; length: number; maximum: number };
  EVENT_HANDLER_DUPLICATE: { handlerName: string; eventName: string };
  EVENT_INTENT_MISSING: {
    handlerName: string;
    eventName: string;
    missingIntents: string[];
    presentIntents: string[];
  };
  INTERACTION_OPERATION_FAILED: {
    operation: "reply" | "editReply" | "deferReply" | "showModal" | "deferUpdate" | "updateMessage" | "autocomplete";
  };
  COMMAND_NOT_FOUND: InteractionErrorContext;
  COMMAND_OPTION_PARSING_FAILED: InteractionErrorContext;
  COMMAND_CONTEXT_CREATION_FAILED: InteractionErrorContext;
  COMMAND_DEFER_FAILED: InteractionErrorContext;
  COMPONENT_NOT_FOUND: InteractionErrorContext;
  COMPONENT_MULTIPLE_MATCHES: InteractionErrorContext;
  COMPONENT_CONTEXT_CREATION_FAILED: InteractionErrorContext;
  COMPONENT_TYPED_SELECT_INVALID_VALUES: InteractionErrorContext;
  COMPONENT_DEFER_FAILED: InteractionErrorContext;
  AUTOCOMPLETE_EXECUTION_FAILED: InteractionErrorContext;
};
