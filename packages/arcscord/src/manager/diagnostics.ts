import type { RESTPostAPIApplicationCommandsJSONBody } from "discord-api-types/v10";
import type { AutocompleteInteraction, CommandInteraction, MessageComponentInteraction, ModalSubmitInteraction } from "discord.js";
import type { Channel } from "node:diagnostics_channel";
import type { ArcClient } from "#/base/client/client.class";
import type { Command } from "#/base/command/command_definition.type";
import type { ComponentHandler } from "#/base/components/interaction/component_handlers.type";
import type { AnyLoadableEventHandler } from "#/base/event/event.type";
import type { EventSource } from "#/base/event/event_source";
import type { ArcscordError } from "#/utils/error/arcscord_error";
import type { CommandManager } from "./command/command_manager.class";
import type { CommandExecutionContext, CommandExecutionOutcome } from "./command/command_manager.type";
import type { ApplicationCommandRegistration, CommandRegistrationScope, CommandRegistrationScopeConfig } from "./command/command_registration";
import type { ComponentManager } from "./component/component_manager.class";
import type { ComponentExecutionContext, ComponentExecutionOutcome } from "./component/component_manager.type";
import type { EventManager } from "./event/event_manager.class";
import type { AnyEventExecutionContext, AnySourceEventExecutionContext, EventExecutionOutcome, EventIntentCheckAction, EventIntentCheckIssue } from "./event/event_manager.type";
import { channel } from "node:diagnostics_channel";

/** Synchronous listener for a typed manager diagnostics channel. */
export type DiagnosticListener<Message> = (message: Message, name: string | symbol) => void;

/** A Node.js diagnostics channel whose messages are strongly typed. */
export type DiagnosticChannel<Message> = Omit<Channel, "publish" | "subscribe" | "unsubscribe"> & {
  /** Publishes one typed message synchronously. */
  publish: (message: Message) => void;
  /** Adds a synchronous listener for this channel. */
  subscribe: (listener: DiagnosticListener<Message>) => void;
  /** Removes a listener previously added with {@link subscribe}. */
  unsubscribe: (listener: DiagnosticListener<Message>) => void;
};

/** Fields included in every manager diagnostic message. */
export type DiagnosticBase<Manager> = {
  /** Manager which produced this diagnostic message. */
  manager: Manager;
  /** Client owning the manager. */
  client: ArcClient;
  /** Unix timestamp in milliseconds at publication time. */
  timestamp: number;
};

/** Common lifecycle fields for the start of an observed operation. */
export type Started<Manager> = DiagnosticBase<Manager> & {
  phase: "start";
  startedAt: number;
};

/** Common lifecycle fields for the successful end of an observed operation. */
export type Ended<Manager> = DiagnosticBase<Manager> & {
  phase: "end";
  startedAt: number;
  endedAt: number;
  durationMs: number;
};

/** Common lifecycle fields for an observed operation that failed. */
export type Failed<Manager> = DiagnosticBase<Manager> & {
  phase: "error";
  error: unknown;
};

/** Messages published while command definitions are transformed and validated. */
export type CommandLoadDiagnosticMessage
  = | (Started<CommandManager> & { commands: readonly Command[]; group: string })
    | (Ended<CommandManager> & { commands: readonly Command[]; group: string; apiCommands: readonly RESTPostAPIApplicationCommandsJSONBody[] })
    | (Failed<CommandManager> & { commands: readonly Command[]; group: string; error: ArcscordError });

/** Messages published while commands are synchronized with Discord. */
export type CommandRegisterDiagnosticMessage
  = | (Started<CommandManager> & { commands: readonly RESTPostAPIApplicationCommandsJSONBody[]; scope: CommandRegistrationScope; guildId?: string; config: CommandRegistrationScopeConfig })
    | (Ended<CommandManager> & { commands: readonly RESTPostAPIApplicationCommandsJSONBody[]; scope: CommandRegistrationScope; guildId?: string; config: CommandRegistrationScopeConfig; registrations: readonly ApplicationCommandRegistration[] })
    | (Failed<CommandManager> & { commands: readonly RESTPostAPIApplicationCommandsJSONBody[]; scope: CommandRegistrationScope; guildId?: string; config: CommandRegistrationScopeConfig; error: ArcscordError });

/** Message published when a local command is resolved against Discord registration data. */
export type CommandResolveDiagnosticMessage = DiagnosticBase<CommandManager> & {
  phase: "end";
  command: Command;
  registration?: ApplicationCommandRegistration;
  resolvedName?: string;
};

/** Command dispatch stage at which a pre-execution failure occurred. */
export type CommandDispatchStage = "resolve" | "options" | "context" | "defer" | "execution";

/** Messages published across the complete dispatch of a command interaction. */
export type CommandDispatchDiagnosticMessage
  = | (Started<CommandManager> & { interaction: CommandInteraction })
    | (Ended<CommandManager> & { interaction: CommandInteraction; outcome: CommandExecutionOutcome })
    | (Failed<CommandManager> & { interaction: CommandInteraction; stage: CommandDispatchStage; locale?: string; error: ArcscordError | unknown });

/** Messages published around command execution interceptors, middleware, and `run()`. */
export type CommandExecuteDiagnosticMessage
  = | (Started<CommandManager> & { execution: CommandExecutionContext })
    | (Ended<CommandManager> & { execution: CommandExecutionContext; outcome: CommandExecutionOutcome })
    | (Failed<CommandManager> & { execution: CommandExecutionContext });

/** Messages published while handling an autocomplete interaction. */
export type CommandAutocompleteDiagnosticMessage
  = | (Started<CommandManager> & { interaction: AutocompleteInteraction })
    | (Ended<CommandManager> & { interaction: AutocompleteInteraction; command: CommandExecutionContext["command"]; focused: { name: string; value: string | number }; locale: string })
    | (Failed<CommandManager> & { interaction: AutocompleteInteraction; command?: CommandExecutionContext["command"]; focused?: { name: string; value: string | number }; locale?: string });

/** Messages published while component handlers are validated and loaded. */
export type ComponentLoadDiagnosticMessage
  = | (Started<ComponentManager> & { components: readonly ComponentHandler[] })
    | (Ended<ComponentManager> & { components: readonly ComponentHandler[]; loaded: number })
    | (Failed<ComponentManager> & { components: readonly ComponentHandler[]; error: ArcscordError });

/** Message published after an attempt to unload a component route. */
export type ComponentUnloadDiagnosticMessage = DiagnosticBase<ComponentManager> & {
  phase: "end";
  route: string;
  component?: ComponentHandler;
  removed: boolean;
};

/** Component dispatch stage at which a pre-execution failure occurred. */
export type ComponentDispatchStage = "match" | "values" | "context" | "defer" | "execution";

/** Messages published across the complete dispatch of a component interaction. */
export type ComponentDispatchDiagnosticMessage
  = | (Started<ComponentManager> & { interaction: MessageComponentInteraction | ModalSubmitInteraction })
    | (Ended<ComponentManager> & { interaction: MessageComponentInteraction | ModalSubmitInteraction; outcome: ComponentExecutionOutcome })
    | (Failed<ComponentManager> & { interaction: MessageComponentInteraction | ModalSubmitInteraction; stage: ComponentDispatchStage; locale?: string; error: ArcscordError | unknown });

/** Messages published around component execution interceptors, middleware, and `run()`. */
export type ComponentExecuteDiagnosticMessage
  = | (Started<ComponentManager> & { execution: ComponentExecutionContext })
    | (Ended<ComponentManager> & { execution: ComponentExecutionContext; outcome: ComponentExecutionOutcome })
    | (Failed<ComponentManager> & { execution: ComponentExecutionContext });

/** Messages published while event handlers are validated and loaded. */
export type EventLoadDiagnosticMessage
  = | (Started<EventManager> & { events: readonly AnyLoadableEventHandler[] })
    | (Ended<EventManager> & { events: readonly AnyLoadableEventHandler[]; loaded: number })
    | (Failed<EventManager> & { events: readonly AnyLoadableEventHandler[]; error: ArcscordError });

/** Message published after an attempt to unload an event handler. */
export type EventUnloadDiagnosticMessage = DiagnosticBase<EventManager> & {
  phase: "end";
  source: EventSource;
  name: string;
  event?: AnyLoadableEventHandler;
  removed: boolean;
};

/** Messages published when a Gateway or custom-source event is delivered to a handler. */
export type EventDispatchDiagnosticMessage
  = | (Started<EventManager> & { source: EventSource; event: AnyLoadableEventHandler; args: readonly unknown[] })
    | (Ended<EventManager> & { source: EventSource; event: AnyLoadableEventHandler; args: readonly unknown[]; outcome: EventExecutionOutcome });

/** Messages published around a Gateway or custom-source event execution pipeline. */
export type EventExecuteDiagnosticMessage
  = | (Started<EventManager> & { execution: AnyEventExecutionContext | AnySourceEventExecutionContext })
    | (Ended<EventManager> & { execution: AnyEventExecutionContext | AnySourceEventExecutionContext; outcome: EventExecutionOutcome })
    | (Failed<EventManager> & { execution: AnyEventExecutionContext | AnySourceEventExecutionContext });

/** Message published when an event handler has a Gateway intent coverage issue. */
export type EventIntentDiagnosticMessage = DiagnosticBase<EventManager> & {
  phase: "end";
  issue: EventIntentCheckIssue;
  action: EventIntentCheckAction;
};

function typedChannel<Message>(name: string): DiagnosticChannel<Message> {
  return channel(name) as DiagnosticChannel<Message>;
}

/** All stable, process-wide diagnostics channels published by Arcscord managers. */
export type ManagerDiagnosticChannels = {
  command: {
    load: DiagnosticChannel<CommandLoadDiagnosticMessage>;
    register: DiagnosticChannel<CommandRegisterDiagnosticMessage>;
    resolve: DiagnosticChannel<CommandResolveDiagnosticMessage>;
    dispatch: DiagnosticChannel<CommandDispatchDiagnosticMessage>;
    execute: DiagnosticChannel<CommandExecuteDiagnosticMessage>;
    autocomplete: DiagnosticChannel<CommandAutocompleteDiagnosticMessage>;
  };
  component: {
    load: DiagnosticChannel<ComponentLoadDiagnosticMessage>;
    unload: DiagnosticChannel<ComponentUnloadDiagnosticMessage>;
    dispatch: DiagnosticChannel<ComponentDispatchDiagnosticMessage>;
    execute: DiagnosticChannel<ComponentExecuteDiagnosticMessage>;
  };
  event: {
    load: DiagnosticChannel<EventLoadDiagnosticMessage>;
    unload: DiagnosticChannel<EventUnloadDiagnosticMessage>;
    dispatch: DiagnosticChannel<EventDispatchDiagnosticMessage>;
    execute: DiagnosticChannel<EventExecuteDiagnosticMessage>;
    intent: DiagnosticChannel<EventIntentDiagnosticMessage>;
  };
};

/** Stable, process-wide diagnostics channels published by Arcscord managers. */
export const managerDiagnosticChannels: ManagerDiagnosticChannels = {
  command: {
    load: typedChannel<CommandLoadDiagnosticMessage>("arcscord:manager:command:load"),
    register: typedChannel<CommandRegisterDiagnosticMessage>("arcscord:manager:command:register"),
    resolve: typedChannel<CommandResolveDiagnosticMessage>("arcscord:manager:command:resolve"),
    dispatch: typedChannel<CommandDispatchDiagnosticMessage>("arcscord:manager:command:dispatch"),
    execute: typedChannel<CommandExecuteDiagnosticMessage>("arcscord:manager:command:execute"),
    autocomplete: typedChannel<CommandAutocompleteDiagnosticMessage>("arcscord:manager:command:autocomplete"),
  },
  component: {
    load: typedChannel<ComponentLoadDiagnosticMessage>("arcscord:manager:component:load"),
    unload: typedChannel<ComponentUnloadDiagnosticMessage>("arcscord:manager:component:unload"),
    dispatch: typedChannel<ComponentDispatchDiagnosticMessage>("arcscord:manager:component:dispatch"),
    execute: typedChannel<ComponentExecuteDiagnosticMessage>("arcscord:manager:component:execute"),
  },
  event: {
    load: typedChannel<EventLoadDiagnosticMessage>("arcscord:manager:event:load"),
    unload: typedChannel<EventUnloadDiagnosticMessage>("arcscord:manager:event:unload"),
    dispatch: typedChannel<EventDispatchDiagnosticMessage>("arcscord:manager:event:dispatch"),
    execute: typedChannel<EventExecuteDiagnosticMessage>("arcscord:manager:event:execute"),
    intent: typedChannel<EventIntentDiagnosticMessage>("arcscord:manager:event:intent"),
  },
};

/** @internal */
export function diagnosticTiming(startedAt: number): Pick<Ended<never>, "startedAt" | "endedAt" | "durationMs" | "timestamp"> {
  const endedAt = Date.now();
  return { startedAt, endedAt, durationMs: endedAt - startedAt, timestamp: endedAt };
}
