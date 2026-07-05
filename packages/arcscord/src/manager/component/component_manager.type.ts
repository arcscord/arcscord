import type { ComponentType } from "discord-api-types/v10";
import type { MessageComponentInteraction, ModalSubmitInteraction } from "discord.js";
import type { ComponentRunResult } from "#/base/components/interaction/component.type";
import type {
  AnyStringSelectMenuComponentHandler,
  ButtonComponentHandler,
  ChannelSelectMenuComponentHandler,
  ComponentHandler,
  MentionableSelectMenuComponentHandler,
  ModalComponentHandler,
  RoleSelectMenuComponentHandler,
  StringSelectMenuComponentHandler,
  UserSelectMenuComponentHandler,
} from "#/base/components/interaction/component_handlers.type";
import type { ComponentContext } from "#/base/components/interaction/context";
import type { ComponentDispatchDiagnostics } from "#/utils/error/dispatch.type";

/**
 * @internal
 */
export type OldComponentList = {
  button: Map<string, ButtonComponentHandler>;
  stringSelect: Map<string, StringSelectMenuComponentHandler>;
  userSelect: Map<string, UserSelectMenuComponentHandler>;
  roleSelect: Map<string, RoleSelectMenuComponentHandler>;
  mentionableSelect: Map<string, MentionableSelectMenuComponentHandler>;
  channelSelect: Map<string, ChannelSelectMenuComponentHandler>;
  modal: Map<string, ModalComponentHandler>;
};

export type ComponentList = {
  [ComponentType.Button]: Map<string, ButtonComponentHandler>;
  [ComponentType.StringSelect]: Map<string, AnyStringSelectMenuComponentHandler>;
  [ComponentType.UserSelect]: Map<string, UserSelectMenuComponentHandler>;
  [ComponentType.RoleSelect]: Map<string, RoleSelectMenuComponentHandler>;
  [ComponentType.MentionableSelect]: Map<string, MentionableSelectMenuComponentHandler>;
  [ComponentType.ChannelSelect]: Map<string, ChannelSelectMenuComponentHandler>;
  modal: Map<string, ModalComponentHandler>;
};

/**
 * Shared fields present in all component result handler payloads.
 */
type BaseComponentResultHandlerInfos = {
  /**
   * The loaded component handler.
   */
  component: ComponentHandler;

  /**
   * The Discord.js interaction.
   */
  interaction: MessageComponentInteraction | ModalSubmitInteraction;

  /**
   * The Arcscord component context for this execution.
   */
  context: ComponentContext;

  /**
   * Whether the reply was deferred before `run()` was called.
   */
  defer: boolean;

  /**
   * Unix timestamp (ms) when the component started running.
   */
  start: number;

  /**
   * Unix timestamp (ms) when the component finished running.
   */
  end: number;

  /**
   * Detected i18next language for this interaction.
   */
  locale: string;
};

/**
 * Payload delivered to `resultHandler` when `run()` returned normally
 * (with a `Result`, a raw value, or `void`).
 */
export type ComponentReturnedHandlerInfos = BaseComponentResultHandlerInfos & {
  status: "returned";
  /**
   * The normalized result of `run()`. May be `ok` or `error` — the author
   * explicitly returned an error `Result`.
   */
  result: ComponentRunResult;
};

/**
 * Payload delivered to `resultHandler` when `run()` threw an unhandled
 * exception or a middleware threw.
 *
 * There is no `result` field here — the thrown value has not been normalized.
 * Use `thrownValue` directly and construct whatever error type you need.
 * The default handler wraps it in a `ComponentError`.
 */
export type ComponentThrownHandlerInfos = BaseComponentResultHandlerInfos & {
  status: "thrown";
  /**
   * The raw value that was thrown by `run()` or middleware.
   * May be any type — a `ComponentError`, a plain `Error`, a string, etc.
   */
  thrownValue: unknown;
};

/**
 * Payload received by `resultHandler` after every component `run()` execution.
 *
 * Use the `status` discriminant to branch between the two cases:
 * ```ts
 * resultHandler: (infos) => {
 *   if (infos.status === "thrown") {
 *     // infos.thrownValue is the raw thrown value (not wrapped)
 *     return;
 *   }
 *   const [err, value] = infos.result;
 * }
 * ```
 */
export type ComponentResultHandlerInfos
  = | ComponentReturnedHandlerInfos
    | ComponentThrownHandlerInfos;

/**
 * Handler called after every component `run()` execution, whether it returned
 * normally or threw.
 */
export type ComponentResultHandler = (
  infos: ComponentResultHandlerInfos,
) => void | Promise<void>;

/**
 * Options for configuring the component manager.
 */
export type ComponentManagerOptions = {
  /**
   * Custom result handler called after every component `run()` execution.
   *
   * Receives a normalized `Result` regardless of whether `run()` returned or
   * threw. Check `infos.status` to distinguish between the two cases.
   *
   * @default logs errors and sends `client.getErrorMessage(...)` to the user
   */
  resultHandler?: ComponentResultHandler;

  /**
   * Per-case configuration for dispatch errors that occur before `run()` is
   * invoked (component not found, multiple matches, defer failure, etc.).
   *
   * Each key accepts a {@link DispatchErrorConfig} that controls the log level
   * and optional user-facing reply independently.
   */
  dispatchDiagnostics?: ComponentDispatchDiagnostics;
};
