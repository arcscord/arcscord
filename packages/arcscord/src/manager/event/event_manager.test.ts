import type { GatewayIntentBits } from "discord-api-types/v10";
import type { ArcClient } from "#/base";
import type { AnyEventHandler, HandlersList } from "#/index";
import type { EventManagerOptions } from "./event_manager.type";
import { ok } from "@arcscord/error";
import { IntentsBitField } from "discord.js";
import { describe, expect, it, vi } from "vitest";
import { createEvent } from "../../base/event";
import { ArcscordError, arcscordErrorCodes } from "../../utils";
import { EventManager } from "./event_manager.class";
import { intentsMap } from "./intents_map";

type MockClient = ArcClient & {
  listenersMap: Map<string, ((...args: unknown[]) => void | Promise<void>)[]>;
  emitMock: (event: string, ...args: unknown[]) => Promise<void>;
  resolveReady: () => void;
};

function createMockClient(
  intents: string[] = [],
  options: EventManagerOptions = { intentCheck: false },
): { client: MockClient; manager: EventManager } {
  let resolveReady: () => void = () => {};
  const readyPromise = new Promise<void>((resolve) => {
    resolveReady = resolve;
  });

  const listenersMap = new Map<string, ((...args: unknown[]) => void | Promise<void>)[]>();
  const client = {
    ready: true,
    arcOptions: {
      enableInternalTrace: false,
    },
    options: {
      intents: new IntentsBitField(intents as unknown as GatewayIntentBits[]),
    },
    createLogger: () => ({
      trace: vi.fn(),
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      logError: vi.fn(),
      fatal: vi.fn(),
      fatalError: vi.fn(),
      log: vi.fn(),
    }),
    on: vi.fn((event: string, listener: (...args: unknown[]) => void | Promise<void>) => {
      listenersMap.set(event, [...(listenersMap.get(event) ?? []), listener]);
      return client;
    }),
    once: vi.fn((event: string, listener: (...args: unknown[]) => void | Promise<void>) => {
      const wrapped = async (...args: unknown[]): Promise<void> => {
        client.off(event, wrapped);
        await listener(...args);
      };
      listenersMap.set(event, [...(listenersMap.get(event) ?? []), wrapped]);
      return client;
    }),
    off: vi.fn((event: string, listener: (...args: unknown[]) => void | Promise<void>) => {
      listenersMap.set(
        event,
        (listenersMap.get(event) ?? []).filter(item => item !== listener),
      );
      return client;
    }),
    waitReady: vi.fn(() => readyPromise),
    listenersMap,
    resolveReady,
    emitMock: async (event: string, ...args: unknown[]) => {
      for (const listener of [...(listenersMap.get(event) ?? [])]) {
        await listener(...args);
      }
    },
  } as unknown as MockClient;

  return {
    client,
    manager: new EventManager(client, options),
  };
}

describe("event manager", () => {
  it("accepts heterogeneous event handler lists at type level", () => {
    const events = [
      createEvent({
        event: "messageCreate",
        run: (ctx, message) => ctx.ok(message.id),
      }),
      createEvent({
        event: "clientReady",
        run: (ctx, client) => ctx.ok(client.user.id),
      }),
    ] satisfies AnyEventHandler[];

    const handlers = {
      events,
    } satisfies HandlersList;

    expect(handlers.events).toHaveLength(2);
  });

  it("loads events and binds listeners", async () => {
    const { client, manager } = createMockClient(["GuildMessages"]);
    const run = vi.fn(async (_ctx: unknown, _msg: unknown) => ok(true as const));
    const event = createEvent({
      event: "messageCreate",
      run,
    });

    await expect(manager.loadEvents([event])).resolves.toEqual([null, 1]);
    await client.emitMock("messageCreate", { id: "message_1" });

    expect(client.on).toHaveBeenCalledWith("messageCreate", expect.any(Function));
    expect(run).toHaveBeenCalledOnce();
    expect(run.mock.calls[0]?.[1]).toEqual({ id: "message_1" });
  });

  it("unloads a registered event listener", async () => {
    const { client, manager } = createMockClient(["GuildMessages"]);
    const run = vi.fn(async () => ok(true as const));
    const event = createEvent({
      event: "messageCreate",
      name: "messageLogger",
      run,
    });

    await manager.loadEvent(event);

    expect(manager.unloadEvent("messageLogger")).toBe(true);
    expect(manager.unloadEvent("messageLogger")).toBe(false);

    await client.emitMock("messageCreate", { id: "message_1" });

    expect(run).not.toHaveBeenCalled();
  });

  it("unloads once events after the first emit", async () => {
    const { client, manager } = createMockClient(["GuildMessages"]);
    const run = vi.fn(async () => ok(true as const));
    const event = createEvent({
      event: "messageCreate",
      options: {
        once: true,
      },
      run,
    });

    await manager.loadEvent(event);
    await client.emitMock("messageCreate", { id: "message_1" });
    await client.emitMock("messageCreate", { id: "message_2" });

    expect(client.once).toHaveBeenCalledWith("messageCreate", expect.any(Function));
    expect(run).toHaveBeenCalledOnce();
    expect((manager as unknown as { events: Map<string, unknown> }).events.has("messageCreate")).toBe(false);
  });

  it("returns a failure when event handler names are duplicated", async () => {
    const { manager } = createMockClient(["GuildMessages"]);
    const first = createEvent({
      event: "messageCreate",
      name: "messageLogger",
      run: () => ok(true),
    });
    const second = createEvent({
      event: "messageDelete",
      name: "messageLogger",
      run: () => ok(true),
    });

    await manager.loadEvent(first);

    const [err] = await manager.loadEvent(second);
    expect(err).toBeInstanceOf(ArcscordError);
    expect(err?.code).toBe(arcscordErrorCodes.EventHandlerDuplicate);
  });

  it("runs before ready by default", async () => {
    const { client, manager } = createMockClient(["GuildMessages"]);
    client.ready = false;
    const run = vi.fn(async () => ok(true as const));

    await manager.loadEvent(createEvent({
      event: "messageCreate",
      run,
    }));

    await client.emitMock("messageCreate", { id: "message_1" });

    expect(run).toHaveBeenCalledOnce();
    expect(client.waitReady).not.toHaveBeenCalled();
  });

  it("queues events before ready when beforeReady is queue", async () => {
    const { client, manager } = createMockClient(["GuildMessages"]);
    client.ready = false;
    const run = vi.fn(async () => ok(true as const));

    await manager.loadEvent(createEvent({
      event: "messageCreate",
      options: {
        beforeReady: "queue",
      },
      run,
    }));

    const emitted = client.emitMock("messageCreate", { id: "message_1" });

    expect(client.waitReady).toHaveBeenCalledOnce();
    expect(run).not.toHaveBeenCalled();

    client.ready = true;
    client.resolveReady();
    await emitted;

    expect(run).toHaveBeenCalledOnce();
  });

  it("drops events before ready when beforeReady is drop", async () => {
    const { client, manager } = createMockClient(["GuildMessages"]);
    client.ready = false;
    const run = vi.fn(async () => ok(true as const));

    await manager.loadEvent(createEvent({
      event: "messageCreate",
      options: {
        beforeReady: "drop",
      },
      run,
    }));

    await client.emitMock("messageCreate", { id: "message_1" });

    expect(run).not.toHaveBeenCalled();
  });

  it("awaits async result handlers", async () => {
    const resultHandler = vi.fn(async () => {
      await Promise.resolve();
    });
    const { client, manager } = createMockClient(["GuildMessages"], {
      intentCheck: false,
      resultHandler,
    });

    await manager.loadEvent(createEvent({
      event: "messageCreate",
      run: () => ok(true),
    }));
    await client.emitMock("messageCreate", { id: "message_1" });

    expect(resultHandler).toHaveBeenCalledOnce();
  });

  it("logs thrown event errors through the result handler", async () => {
    const resultHandler = vi.fn();
    const { client, manager } = createMockClient(["GuildMessages"], {
      intentCheck: false,
      resultHandler,
    });

    await manager.loadEvent(createEvent({
      event: "messageCreate",
      run: () => {
        throw new Error("boom");
      },
    }));
    await client.emitMock("messageCreate", { id: "message_1" });

    expect(resultHandler).toHaveBeenCalledOnce();
    expect(resultHandler.mock.calls[0]?.[0].exit.status).toBe("defect");
    expect(resultHandler.mock.calls[0]?.[0].exit.defect).toBeInstanceOf(Error);
  });

  it("sets status to returned when run() returns ok", async () => {
    const resultHandler = vi.fn();
    const { client, manager } = createMockClient(["GuildMessages"], {
      intentCheck: false,
      resultHandler,
    });

    await manager.loadEvent(createEvent({
      event: "messageCreate",
      run: () => ok(true),
    }));
    await client.emitMock("messageCreate", { id: "message_1" });

    expect(resultHandler.mock.calls[0]?.[0].exit.status).toBe("success");
    expect(resultHandler.mock.calls[0]?.[0].exit.value).toBe(true);
  });

  it("passes the owning manager as the second argument and supports delegating to defaultResultHandler", async () => {
    const { client, manager } = createMockClient(["GuildMessages"], {
      intentCheck: false,
      resultHandler: (infos, m) => m.defaultResultHandler(infos),
    });
    const defaultSpy = vi.spyOn(manager, "defaultResultHandler");

    await manager.loadEvent(createEvent({
      event: "messageCreate",
      run: () => ok(true),
    }));
    await client.emitMock("messageCreate", { id: "message_1" });

    expect(defaultSpy).toHaveBeenCalledOnce();
    expect(defaultSpy.mock.calls[0]?.[0].exit.status).toBe("success");
  });

  it("sets status to thrown and preserves the raw thrown value", async () => {
    const resultHandler = vi.fn();
    const { client, manager } = createMockClient(["GuildMessages"], {
      intentCheck: false,
      resultHandler,
    });

    const thrown = new Error("boom");
    await manager.loadEvent(createEvent({
      event: "messageCreate",
      run: () => {
        throw thrown;
      },
    }));
    await client.emitMock("messageCreate", { id: "message_1" });

    const infos = resultHandler.mock.calls[0]?.[0];
    expect(infos.exit.status).toBe("defect");
    expect(infos.exit.defect).toBe(thrown);
    expect("result" in infos).toBe(false);
  });

  it("normalizes void run() return to ok(true)", async () => {
    const resultHandler = vi.fn();
    const { client, manager } = createMockClient(["GuildMessages"], {
      intentCheck: false,
      resultHandler,
    });

    await manager.loadEvent(createEvent({
      event: "messageCreate",
      run: () => {},
    }));
    await client.emitMock("messageCreate", { id: "message_1" });

    const infos = resultHandler.mock.calls[0]?.[0];
    expect(infos.exit.status).toBe("success");
    expect(infos.exit.value).toBe(true);
  });

  it("normalizes string run() return to ok(string)", async () => {
    const resultHandler = vi.fn();
    const { client, manager } = createMockClient(["GuildMessages"], {
      intentCheck: false,
      resultHandler,
    });

    await manager.loadEvent(createEvent({
      event: "messageCreate",
      run: () => "message sent",
    }));
    await client.emitMock("messageCreate", { id: "message_1" });

    const infos = resultHandler.mock.calls[0]?.[0];
    expect(infos.exit.status).toBe("success");
    expect(infos.exit.value).toBe("message sent");
  });

  it("warns when an all intent requirement is missing", async () => {
    const { manager } = createMockClient([], {
      intentCheck: {
        missing: "warn",
      },
    });

    await manager.loadEvent(createEvent({
      event: "guildCreate",
      run: () => ok(true),
    }));

    expect(manager.logger.warn).toHaveBeenCalledWith(expect.stringContaining("Guilds"));
  });

  it("returns a failure when a missing intent check is strict", async () => {
    const { manager } = createMockClient([], {
      intentCheck: {
        missing: "error",
      },
    });

    const [err] = await manager.loadEvent(createEvent({
      event: "guildCreate",
      run: () => ok(true),
    }));
    expect(err).toBeInstanceOf(ArcscordError);
    expect(err?.code).toBe(arcscordErrorCodes.EventIntentMissing);
  });

  it("accepts oneOf requirements when one intent is present", async () => {
    const { manager } = createMockClient(["GuildMessages"], {
      intentCheck: {
        missing: "error",
      },
    });

    await expect(manager.loadEvent(createEvent({
      event: "messageCreate",
      run: () => ok(true),
    }))).resolves.toEqual([null, true]);
  });

  it("warns about partial coverage when enabled", async () => {
    const { manager } = createMockClient(["GuildMessages"], {
      intentCheck: {
        partialCoverage: "warn",
      },
    });

    await manager.loadEvent(createEvent({
      event: "messageCreate",
      run: () => ok(true),
    }));

    expect(manager.logger.warn).toHaveBeenCalledWith(expect.stringContaining("Partial intent coverage"));
  });

  it("does not warn about disabled coverage targets", async () => {
    const { manager } = createMockClient(["GuildMessages"], {
      intentCheck: {
        partialCoverage: "warn",
        coverage: {
          guild: true,
          dm: false,
        },
      },
    });

    await manager.loadEvent(createEvent({
      event: "messageCreate",
      run: () => ok(true),
    }));

    expect(manager.logger.warn).not.toHaveBeenCalled();
  });

  it("warns when an enabled coverage target is missing", async () => {
    const { manager } = createMockClient(["GuildMessages"], {
      intentCheck: {
        partialCoverage: "warn",
        coverage: {
          guild: true,
          dm: true,
        },
      },
    });

    await manager.loadEvent(createEvent({
      event: "messageCreate",
      run: () => ok(true),
    }));

    expect(manager.logger.warn).toHaveBeenCalledWith(expect.stringContaining("dm"));
    expect(manager.logger.warn).toHaveBeenCalledWith(expect.stringContaining("DirectMessages"));
  });

  it("still checks missing against every possible oneOf intent", async () => {
    const { manager } = createMockClient([], {
      intentCheck: {
        missing: "error",
        coverage: {
          guild: true,
          dm: false,
        },
      },
    });

    const [err] = await manager.loadEvent(createEvent({
      event: "messageCreate",
      run: () => ok(true),
    }));
    expect(err).toBeInstanceOf(ArcscordError);
    expect(err?.code).toBe(arcscordErrorCodes.EventIntentMissing);
  });

  it("ignores configured events during intent checks", async () => {
    const { manager } = createMockClient([], {
      intentCheck: {
        missing: "error",
        ignore: ["guildCreate"],
      },
    });

    await expect(manager.loadEvent(createEvent({
      event: "guildCreate",
      run: () => ok(true),
    }))).resolves.toEqual([null, true]);
  });

  it("keeps the intent map aligned with discord.js ClientEvents", () => {
    expect(Object.keys(intentsMap).length).toBeGreaterThan(0);
    expect(intentsMap.messageCreate).toEqual({
      mode: "oneOf",
      intents: {
        guild: "GuildMessages",
        dm: "DirectMessages",
      },
    });
    expect(intentsMap.threadMembersUpdate).toEqual({
      mode: "all",
      intents: ["Guilds", "GuildMembers"],
    });
    expect(intentsMap.interactionCreate).toEqual({
      mode: "none",
    });
  });
});
