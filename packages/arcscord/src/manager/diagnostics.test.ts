import type {
  CommandLoadDiagnosticMessage,
  ComponentLoadDiagnosticMessage,
  EventDispatchDiagnosticMessage,
  EventIntentDiagnosticMessage,
} from "./diagnostics";
import { channel } from "node:diagnostics_channel";
import { describe, expect, it, vi } from "vitest";
import { createCommand } from "#/base/command/command_func";
import { createButton } from "#/base/components/interaction/component_handler.func";
import { button } from "#/base/components/shared/builders";
import { createEvent } from "#/base/event/event.func";
import { createEventSource } from "#/base/event/event_source";
import { createMockClient } from "#/testing";
import { CommandManager } from "./command/command_manager.class";
import { ComponentManager } from "./component/component_manager.class";
import { managerDiagnosticChannels } from "./diagnostics";
import { EventManager } from "./event/event_manager.class";

describe("manager diagnostics channels", () => {
  it("uses stable process-wide channel identities and documented names", () => {
    expect(managerDiagnosticChannels.command.execute.name).toBe("arcscord:manager:command:execute");
    expect(managerDiagnosticChannels.component.dispatch.name).toBe("arcscord:manager:component:dispatch");
    expect(managerDiagnosticChannels.event.intent.name).toBe("arcscord:manager:event:intent");
    expect(channel("arcscord:manager:command:execute")).toBe(managerDiagnosticChannels.command.execute);
  });

  it("publishes typed command load phases only while subscribed", () => {
    const manager = new CommandManager(createMockClient());
    const command = createCommand({
      slash: { name: "ping", description: "Ping" },
      run: ctx => ctx.ok(true),
    });
    const messages: CommandLoadDiagnosticMessage[] = [];
    const listener = (message: CommandLoadDiagnosticMessage): void => {
      messages.push(message);
    };

    expect(managerDiagnosticChannels.command.load.hasSubscribers).toBe(false);
    managerDiagnosticChannels.command.load.subscribe(listener);
    manager.loadCommands([command], "diagnostics");
    managerDiagnosticChannels.command.load.unsubscribe(listener);
    manager.loadCommands([command], "unobserved");

    expect(messages.map(message => message.phase)).toEqual(["start", "end"]);
    expect(messages[0]).toMatchObject({ manager, commands: [command], group: "diagnostics" });
    expect(managerDiagnosticChannels.command.load.hasSubscribers).toBe(false);
  });

  it("does not calculate diagnostic timestamps without subscribers", () => {
    const manager = new CommandManager(createMockClient());
    const command = createCommand({
      slash: { name: "no-diagnostics", description: "No diagnostics" },
      run: ctx => ctx.ok(true),
    });
    const now = vi.spyOn(Date, "now");

    manager.loadCommands([command]);

    expect(now).not.toHaveBeenCalled();
    now.mockRestore();
  });

  it("does not publish an orphaned terminal phase after unsubscription", () => {
    const manager = new CommandManager(createMockClient());
    const command = createCommand({
      slash: { name: "unsubscribe", description: "Unsubscribe" },
      run: ctx => ctx.ok(true),
    });
    const phases: string[] = [];
    const listener = (message: CommandLoadDiagnosticMessage): void => {
      phases.push(message.phase);
      managerDiagnosticChannels.command.load.unsubscribe(listener);
    };

    managerDiagnosticChannels.command.load.subscribe(listener);
    manager.loadCommands([command]);

    expect(phases).toEqual(["start"]);
  });

  it("publishes component registry mutations", () => {
    const manager = new ComponentManager(createMockClient());
    const component = createButton({
      route: "diagnostics",
      build: id => button({ customId: id(), label: "Diagnostics", style: "primary" }),
      run: ctx => ctx.ok(true),
    });
    const messages: ComponentLoadDiagnosticMessage[] = [];
    const listener = (message: ComponentLoadDiagnosticMessage): void => {
      messages.push(message);
    };

    managerDiagnosticChannels.component.load.subscribe(listener);
    manager.loadComponent(component);
    managerDiagnosticChannels.component.load.unsubscribe(listener);

    expect(messages.map(message => message.phase)).toEqual(["start", "end"]);
    expect(messages[1]).toMatchObject({ manager, components: [component], loaded: 1 });
  });

  it("correlates custom event dispatch and execution outcomes", async () => {
    type Jobs = { completed: [id: string] };
    const source = createEventSource<Jobs>({ name: "jobs" });
    const manager = new EventManager(createMockClient(), { intentCheck: false });
    const event = createEvent({
      source,
      event: "completed",
      run: (_ctx, id) => id,
    });
    await manager.loadEvent(event);

    const messages: EventDispatchDiagnosticMessage[] = [];
    const listener = (message: EventDispatchDiagnosticMessage): void => {
      messages.push(message);
    };
    managerDiagnosticChannels.event.dispatch.subscribe(listener);
    await manager.dispatch(source, "completed", "job-1");
    managerDiagnosticChannels.event.dispatch.unsubscribe(listener);

    expect(messages.map(message => message.phase)).toEqual(["start", "end"]);
    expect(messages[0]).toMatchObject({ source, event, args: ["job-1"] });
    expect(messages[1]).toMatchObject({ outcome: { kind: "completed", exit: { status: "success" } } });
  });

  it("publishes structured intent diagnostics", async () => {
    const manager = new EventManager(createMockClient(), {
      intentCheck: { missing: "error" },
    });
    const event = createEvent({
      event: "messageCreate",
      run: ctx => ctx.ok(true),
    });
    const messages: EventIntentDiagnosticMessage[] = [];
    const listener: Parameters<typeof managerDiagnosticChannels.event.intent.subscribe>[0] = (message) => {
      messages.push(message);
    };

    managerDiagnosticChannels.event.intent.subscribe(listener);
    const [err] = await manager.loadEvent(event);
    managerDiagnosticChannels.event.intent.unsubscribe(listener);

    expect(err).not.toBeNull();
    expect(messages).toHaveLength(1);
    expect(messages[0]).toMatchObject({
      phase: "end",
      manager,
      action: "error",
      issue: { type: "missing", event },
    });
  });
});
