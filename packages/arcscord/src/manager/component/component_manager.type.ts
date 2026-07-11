import type { ComponentType } from "discord-api-types/v10";
import type { MessageComponentInteraction, ModalSubmitInteraction } from "discord.js";
import type {
  AnyStringSelectMenuComponentHandler,
  ButtonComponentHandler,
  ChannelSelectMenuComponentHandler,
  ComponentHandler,
  MentionableSelectMenuComponentHandler,
  ModalComponentHandler,
  RoleSelectMenuComponentHandler,
  UserSelectMenuComponentHandler,
} from "#/base/components/interaction/component_handlers.type";
import type { ComponentContext } from "#/base/components/interaction/context";
import type { ComponentDispatchDiagnostics } from "#/utils/error/dispatch.type";
import type { ExecutionExit } from "#/utils/error/execution_exit";

/** The {@link ComponentManager}'s registry: one `customId → handler` map per component type (buttons, each select-menu kind, and modals). */
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
  startedAt: number;

  /**
   * Unix timestamp (ms) when the component finished running.
   */
  endedAt: number;

  /** Total execution duration in milliseconds. */
  durationMs: number;

  /** Correlation ID generated for an unexpected defect. */
  incidentId?: string;

  /**
   * Detected i18next language for this interaction.
   */
  locale: string;
};

/** Payload received by `resultHandler` after every component execution. */
export type ComponentResultHandlerInfos = BaseComponentResultHandlerInfos & {
  exit: ExecutionExit<string | true, unknown>;
};

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
