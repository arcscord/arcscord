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
import type {
  ExecutionControls,
  ExecutionHandler,
  ExecutionOutcome,
} from "#/base/manager/execution_handler";
import type { ComponentManager } from "#/manager/component/component_manager.class";
import type { ComponentDispatchDiagnostics } from "#/utils/error/dispatch.type";
import type { ExecutionExit } from "#/utils/error/execution_exit";

/**
 * The {@link ComponentManager}'s registry: one `customId → handler` map per
 * component type (buttons, each select-menu kind, and modals).
 */
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
export type BaseComponentExecutionInfos = {
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
   * Detected i18next language for this interaction.
   */
  locale: string;
};

/**
 * Payload received by `resultHandler` after every component execution.
 *
 * @deprecated Use {@link ComponentExecutionContext} and
 * {@link ComponentExecutionOutcome}.
 */
export type ComponentResultHandlerInfos = BaseComponentExecutionInfos & {
  exit: ExecutionExit<string | true, unknown>;
  startedAt: number;
  endedAt: number;
  durationMs: number;
  incidentId?: string;
};

/** Context exposed to component execution interceptors. */
export type ComponentExecutionContext = BaseComponentExecutionInfos
  & ExecutionControls<string | true, unknown>;

/** Outcome returned by component execution interceptors. */
export type ComponentExecutionOutcome = ExecutionOutcome<string | true, unknown>;

/** Koa-style interceptor around component middleware and `run()`. */
export type ComponentExecutionHandler = ExecutionHandler<
  ComponentExecutionContext,
  ComponentExecutionOutcome,
  ComponentManager
>;

/**
 * Handler called after every component `run()` execution, whether it returned
 * normally or threw.
 *
 * Receives the owning {@link ComponentManager} as a second argument so a custom
 * handler can run its own logic and then delegate to the framework default via
 * `manager.defaultResultHandler(infos)`.
 *
 * @deprecated Use {@link ComponentExecutionHandler}.
 */
export type ComponentResultHandler = (
  infos: ComponentResultHandlerInfos,
  manager: ComponentManager,
) => void | Promise<void>;

/**
 * Options for configuring the component manager.
 */
type BaseComponentManagerOptions = {
  /**
   * Per-case configuration for dispatch errors that occur before `run()` is
   * invoked (component not found, multiple matches, defer failure, etc.).
   *
   * Each key accepts a {@link DispatchErrorConfig} that controls the log level
   * and optional user-facing reply independently.
   */
  dispatchDiagnostics?: ComponentDispatchDiagnostics;
};

type ComponentExecutionHandlerOptions = {
  /**
   * Ordered Koa-style interceptors around component middleware and `run()`.
   *
   * Providing this option replaces Arcscord's default execution handler.
   */
  executionHandlers?: readonly ComponentExecutionHandler[];
  resultHandler?: never;
};

type LegacyComponentResultHandlerOptions = {
  executionHandlers?: never;

  /**
   * Custom result handler called after every component `run()` execution.
   *
   * @deprecated Use {@link ComponentManagerOptions.executionHandlers}.
   */
  resultHandler?: ComponentResultHandler;
};

/**
 * Options for configuring the component manager.
 *
 * `executionHandlers` and the deprecated `resultHandler` are mutually exclusive.
 */
export type ComponentManagerOptions = BaseComponentManagerOptions
  & (ComponentExecutionHandlerOptions | LegacyComponentResultHandlerOptions);
