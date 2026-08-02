import type { ClientEvents } from "discord.js";
import type {
  AnyEventHandler,
  BaseEventExecutionInfos,
  EventManager,
  EventResultHandlerInfos,
} from "#/index";
import { expectTypeOf } from "vitest";
import {
  createEvent,
  createEventSource,
  gatewayEvents,
} from "#/index";

type ExternalEvents = {
  completed: [id: string];
  started: [id: string, attempt: number];
};

const externalEvents = createEventSource<ExternalEvents>({
  name: "external",
});

const externalHandler = createEvent({
  source: externalEvents,
  event: "started",
  run(ctx, id, attempt) {
    expectTypeOf(ctx.source).toEqualTypeOf<typeof externalEvents>();
    expectTypeOf(ctx.event).toEqualTypeOf<"started">();
    expectTypeOf(id).toEqualTypeOf<string>();
    expectTypeOf(attempt).toEqualTypeOf<number>();
  },
});

expectTypeOf(externalHandler.event).toEqualTypeOf<"started">();

declare const eventManager: EventManager;
declare const gatewayHandler: AnyEventHandler;

const legacyBaseInfos: BaseEventExecutionInfos = {
  event: gatewayHandler,
  eventName: gatewayHandler.event,
};
const legacyResultInfos: EventResultHandlerInfos = {
  ...legacyBaseInfos,
  exit: undefined as never,
  startedAt: 0,
  endedAt: 0,
  durationMs: 0,
};

expectTypeOf(gatewayHandler.run).toBeFunction();
expectTypeOf(legacyResultInfos.source).toEqualTypeOf<
  typeof gatewayEvents | undefined
>();

eventManager.dispatch(externalEvents, "completed", "job_1");

// @ts-expect-error Dispatch only accepts event names declared by its source.
eventManager.dispatch(externalEvents, "messageCreate", "job_1");

// @ts-expect-error The argument tuple is inferred from the external event map.
eventManager.dispatch(externalEvents, "started", "job_1", "first");

// @ts-expect-error A custom source only accepts its own string event names.
createEvent({
  source: externalEvents,
  event: "messageCreate",
  run() {},
});

createEvent({
  source: externalEvents,
  // @ts-expect-error Unknown string events are rejected by custom sources.
  event: "missing",
  run() {},
});

// @ts-expect-error Event values must be argument tuples.
createEventSource<{ invalid: string }>({ name: "invalid" });

// @ts-expect-error Event names must be strings.
createEventSource<{ 1: [] }>({ name: "numeric" });

createEvent({
  source: gatewayEvents,
  event: "messageCreate",
  run(_ctx, message) {
    expectTypeOf(message).toEqualTypeOf<ClientEvents["messageCreate"][0]>();
  },
});

createEvent({
  source: gatewayEvents,
  // @ts-expect-error The Gateway source only accepts Discord.js events.
  event: "completed",
  run() {},
});
