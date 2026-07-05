import type {
  ChannelSelectMenuContext,
  ComponentContext,
  MentionableSelectMenuContext,
  RoleSelectMenuContext,
  UserSelectMenuContext,
} from "#/base/components";
import type { ComponentMiddlewareRun } from "#/base/components/interaction/component_middleware";
import type { ComponentManagerOptions } from "#/manager/component/component_manager.type";
import type { MockArcClient } from "#/testing";
import { ComponentType } from "discord-api-types/v10";
import { MessageFlags } from "discord.js";
import { describe, expect, it, vi } from "vitest";
import {
  button,
  channelSelectMenu,
  createButton,
  createModal,
  createSelectMenu,
  createTypedStringMenu,
  mentionableSelectMenu,
  roleSelectMenu,
  stringSelectMenu,
  userSelectMenu,
} from "#/base/components";
import { ComponentMiddleware } from "#/base/components/interaction/component_middleware";
import { buildModal, modalTextInput } from "#/base/components/modal";
import {
  createMockButtonInteraction,
  createMockChannelSelectMenuInteraction,
  createMockClient,
  createMockMentionableSelectMenuInteraction,
  createMockModalSubmitInteraction,
  createMockRoleSelectMenuInteraction,
  createMockStringSelectMenuInteraction,
  createMockUser,
  createMockUserSelectMenuInteraction,
} from "#/testing";
import { ComponentError } from "#/utils";
import { ComponentManager } from "./component_manager.class";

type ExposedHandleInteraction = {
  handleInteraction: (interaction: unknown) => Promise<void>;
};

function createManagerWithClient(options?: ComponentManagerOptions): { client: MockArcClient; manager: ComponentManager } {
  const client = createMockClient();
  const manager = new ComponentManager(client, options);
  return { client, manager };
}

async function dispatch(manager: ComponentManager, interaction: unknown): Promise<void> {
  await (manager as unknown as ExposedHandleInteraction).handleInteraction(interaction as never);
}

describe("component manager pipeline", () => {
  describe("full interactionCreate pipeline (via client.on)", () => {
    it("dispatches a button interaction emitted on the client through to resultHandler", async () => {
      const resultHandler = vi.fn();
      const client = createMockClient();
      const manager = new ComponentManager(client, { resultHandler });

      const run = vi.fn(async ctx => ctx.ok());
      const handler = createButton({
        route: "greet",
        build: id => button({ customId: id(), label: "Greet", style: "primary" }),
        run,
      });
      manager.loadComponent(handler);

      await client._emitMock("interactionCreate", createMockButtonInteraction({ customId: "greet" }));
      await vi.waitFor(() => expect(resultHandler).toHaveBeenCalledOnce());

      expect(run).toHaveBeenCalledOnce();
      expect(resultHandler.mock.calls[0]?.[0].status).toBe("returned");
    });

    it("dispatches a modal submit interaction emitted on the client through to resultHandler", async () => {
      const resultHandler = vi.fn();
      const client = createMockClient();
      const manager = new ComponentManager(client, { resultHandler });

      const run = vi.fn(async ctx => ctx.ok(ctx.values.message));
      const handler = createModal({
        route: "feedback",
        fields: {
          message: modalTextInput({ label: "Message", required: true }),
        },
        build: (id, fields) => buildModal({
          title: "Feedback",
          customId: id(),
          components: [fields.message.label()],
        }),
        run,
      });
      manager.loadComponent(handler);

      await client._emitMock("interactionCreate", createMockModalSubmitInteraction({
        customId: "feedback",
        fields: { message: "hello" },
      }));
      await vi.waitFor(() => expect(resultHandler).toHaveBeenCalledOnce());

      expect(run).toHaveBeenCalledOnce();
      expect(resultHandler.mock.calls[0]?.[0].result).toEqual([null, "hello"]);
    });
  });

  describe("select menu value extraction", () => {
    it("passes raw selected values for an untyped string select", async () => {
      const resultHandler = vi.fn();
      const { manager } = createManagerWithClient({ resultHandler });

      const run = vi.fn(async ctx => ctx.ok(ctx.values.join(",")));
      const handler = createSelectMenu({
        type: ComponentType.StringSelect,
        route: "untyped-select",
        build: id => stringSelectMenu({ customId: id(), options: ["a", "b"] }),
        run,
      });
      manager.loadComponent(handler);

      await dispatch(manager, createMockStringSelectMenuInteraction({
        customId: "untyped-select",
        values: ["a", "b"],
      }));

      expect(run).toHaveBeenCalledOnce();
      expect(resultHandler.mock.calls[0]?.[0].result).toEqual([null, "a,b"]);
    });

    it("allows a value declared in a typed string select", async () => {
      const resultHandler = vi.fn();
      const { manager } = createManagerWithClient({ resultHandler });

      const run = vi.fn(async ctx => ctx.ok(ctx.values.join(",")));
      const handler = createTypedStringMenu({
        route: "typed-select",
        values: { fun: "Fun", happy: "Happy" } as const,
        build: id => ({
          customId: id(),
        }),
        run,
      });
      handler.build();
      manager.loadComponent(handler);

      await dispatch(manager, createMockStringSelectMenuInteraction({
        customId: "typed-select",
        values: ["fun"],
      }));

      expect(run).toHaveBeenCalledOnce();
      expect(resultHandler.mock.calls[0]?.[0].status).toBe("returned");
    });

    it("rejects a value outside the allowed set for a typed string select", async () => {
      const resultHandler = vi.fn();
      const { manager } = createManagerWithClient({ resultHandler });

      const run = vi.fn(async ctx => ctx.ok());
      const handler = createTypedStringMenu({
        route: "typed-select-strict",
        values: { fun: "Fun", happy: "Happy" } as const,
        build: id => ({
          customId: id(),
        }),
        run,
      });
      handler.build();
      manager.loadComponent(handler);

      await dispatch(manager, createMockStringSelectMenuInteraction({
        customId: "typed-select-strict",
        values: ["outdated-value"],
      }));

      expect(run).not.toHaveBeenCalled();
      expect(resultHandler).not.toHaveBeenCalled();
      expect(manager.logger.logError).toHaveBeenCalledOnce();
    });

    it("rejects multiple selected values for a single-value typed string select", async () => {
      const resultHandler = vi.fn();
      const { manager } = createManagerWithClient({ resultHandler });

      const run = vi.fn(async ctx => ctx.ok());
      const handler = createTypedStringMenu({
        route: "typed-select-single",
        values: { fun: "Fun", happy: "Happy" } as const,
        maxValues: 1,
        build: id => ({
          customId: id(),
        }),
        run,
      });
      handler.build();
      manager.loadComponent(handler);

      await dispatch(manager, createMockStringSelectMenuInteraction({
        customId: "typed-select-single",
        values: ["fun", "happy"],
      }));

      expect(run).not.toHaveBeenCalled();
      expect(resultHandler).not.toHaveBeenCalled();
      expect(manager.logger.logError).toHaveBeenCalledOnce();
    });

    it("validates values correctly for a typed string select whose build() has never run (e.g. right after a restart)", async () => {
      const resultHandler = vi.fn();
      const { manager } = createManagerWithClient({ resultHandler });

      const run = vi.fn(async ctx => ctx.ok(ctx.values.join(",")));
      const handler = createTypedStringMenu({
        route: "typed-select-never-built",
        values: { fun: "Fun", happy: "Happy" } as const,
        build: id => ({
          customId: id(),
        }),
        run,
      });
      // Deliberately skip handler.build() to simulate a handler that was just
      // re-registered on startup but whose message was sent before the
      // restart, so the code path that calls build() hasn't run again yet.
      manager.loadComponent(handler);

      await dispatch(manager, createMockStringSelectMenuInteraction({
        customId: "typed-select-never-built",
        values: ["fun"],
      }));

      expect(run).toHaveBeenCalledOnce();
      expect(resultHandler.mock.calls[0]?.[0].status).toBe("returned");
    });

    it("rejects an invalid value for a typed string select whose build() has never run", async () => {
      const resultHandler = vi.fn();
      const { manager } = createManagerWithClient({ resultHandler });

      const run = vi.fn(async ctx => ctx.ok());
      const handler = createTypedStringMenu({
        route: "typed-select-never-built-strict",
        values: { fun: "Fun", happy: "Happy" } as const,
        build: id => ({
          customId: id(),
        }),
        run,
      });
      manager.loadComponent(handler);

      await dispatch(manager, createMockStringSelectMenuInteraction({
        customId: "typed-select-never-built-strict",
        values: ["outdated-value"],
      }));

      expect(run).not.toHaveBeenCalled();
      expect(resultHandler).not.toHaveBeenCalled();
      expect(manager.logger.logError).toHaveBeenCalledOnce();
    });

    it("routes invalid typed-select values through dispatchDiagnostics.typedSelectInvalidValues, not contextCreationFailed", async () => {
      const resultHandler = vi.fn();
      const { manager } = createManagerWithClient({
        resultHandler,
        dispatchDiagnostics: {
          typedSelectInvalidValues: { level: "warn" },
        },
      });

      const run = vi.fn(async ctx => ctx.ok());
      const handler = createTypedStringMenu({
        route: "typed-select-diagnostic",
        values: { fun: "Fun", happy: "Happy" } as const,
        build: id => ({
          customId: id(),
        }),
        run,
      });
      handler.build();
      manager.loadComponent(handler);

      await dispatch(manager, createMockStringSelectMenuInteraction({
        customId: "typed-select-diagnostic",
        values: ["outdated-value"],
      }));

      expect(run).not.toHaveBeenCalled();
      expect(resultHandler).not.toHaveBeenCalled();
      expect(manager.logger.warning).toHaveBeenCalledOnce();
      expect(manager.logger.logError).not.toHaveBeenCalled();
    });

    it("exposes selected users for a user select menu", async () => {
      const resultHandler = vi.fn();
      const { manager } = createManagerWithClient({ resultHandler });

      const run = vi.fn(async (ctx: UserSelectMenuContext) => ctx.ok(ctx.values.map(u => u.id).join(",")));
      const handler = createSelectMenu({
        type: ComponentType.UserSelect,
        route: "user-select",
        build: id => userSelectMenu({ customId: id() }),
        run,
      });
      manager.loadComponent(handler);

      await dispatch(manager, createMockUserSelectMenuInteraction({
        customId: "user-select",
        users: [createMockUser({ id: "u1" }), createMockUser({ id: "u2" })],
      }));

      expect(run).toHaveBeenCalledOnce();
      expect(resultHandler.mock.calls[0]?.[0].result).toEqual([null, "u1,u2"]);
    });

    it("exposes selected roles for a role select menu", async () => {
      const resultHandler = vi.fn();
      const { manager } = createManagerWithClient({ resultHandler });

      const run = vi.fn(async (ctx: RoleSelectMenuContext) => ctx.ok(ctx.values.map(r => r.id).join(",")));
      const handler = createSelectMenu({
        type: ComponentType.RoleSelect,
        route: "role-select",
        build: id => roleSelectMenu({ customId: id() }),
        run,
      });
      manager.loadComponent(handler);

      await dispatch(manager, createMockRoleSelectMenuInteraction({
        customId: "role-select",
        roles: [{ id: "r1" }, { id: "r2" }] as never,
      }));

      expect(run).toHaveBeenCalledOnce();
      expect(resultHandler.mock.calls[0]?.[0].result).toEqual([null, "r1,r2"]);
    });

    it("exposes separate users/roles and a merged values list for a mentionable select menu", async () => {
      const resultHandler = vi.fn();
      const { manager } = createManagerWithClient({ resultHandler });

      const run = vi.fn(async (ctx: MentionableSelectMenuContext) => {
        expect(ctx.users.map(u => u.id)).toEqual(["u1"]);
        expect(ctx.roles.map(r => r.id)).toEqual(["r1"]);
        expect(ctx.values).toHaveLength(2);
        return ctx.ok();
      });
      const handler = createSelectMenu({
        type: ComponentType.MentionableSelect,
        route: "mentionable-select",
        build: id => mentionableSelectMenu({ customId: id() }),
        run,
      });
      manager.loadComponent(handler);

      await dispatch(manager, createMockMentionableSelectMenuInteraction({
        customId: "mentionable-select",
        users: [createMockUser({ id: "u1" })],
        roles: [{ id: "r1" }] as never,
      }));

      expect(run).toHaveBeenCalledOnce();
    });

    it("exposes selected channels for a channel select menu", async () => {
      const resultHandler = vi.fn();
      const { manager } = createManagerWithClient({ resultHandler });

      const run = vi.fn(async (ctx: ChannelSelectMenuContext) => ctx.ok(ctx.values.map(c => (c as { id: string }).id).join(",")));
      const handler = createSelectMenu({
        type: ComponentType.ChannelSelect,
        route: "channel-select",
        build: id => channelSelectMenu({ customId: id() }),
        run,
      });
      manager.loadComponent(handler);

      await dispatch(manager, createMockChannelSelectMenuInteraction({
        customId: "channel-select",
        channels: [{ id: "c1" }] as never,
      }));

      expect(run).toHaveBeenCalledOnce();
      expect(resultHandler.mock.calls[0]?.[0].result).toEqual([null, "c1"]);
    });
  });

  describe("modal submission", () => {
    it("wraps a field parse() failure into a ComponentError with contextCreationFailed diagnostics", async () => {
      const resultHandler = vi.fn();
      const { manager } = createManagerWithClient({ resultHandler });

      const run = vi.fn(async ctx => ctx.ok());
      const handler = createModal({
        route: "strict-feedback",
        fields: {
          message: modalTextInput({ label: "Message", required: true }),
        },
        build: (id, fields) => buildModal({
          title: "Feedback",
          customId: id(),
          components: [fields.message.label()],
        }),
        run,
      });
      manager.loadComponent(handler);

      await dispatch(manager, createMockModalSubmitInteraction({
        customId: "strict-feedback",
        fields: {},
      }));

      expect(run).not.toHaveBeenCalled();
      expect(resultHandler).not.toHaveBeenCalled();
      expect(manager.logger.logError).toHaveBeenCalledOnce();
    });
  });

  describe("route matching", () => {
    it("decodes dynamic route parameters (including encoded spaces) into ctx.params", async () => {
      const resultHandler = vi.fn();
      const { manager } = createManagerWithClient({ resultHandler });

      const run = vi.fn(async ctx => ctx.ok(ctx.params.name));
      const handler = createButton({
        route: "greet/{name}",
        build: (id, label: string) => button({ customId: id(), label, style: "primary" }),
        run,
      });
      manager.loadComponent(handler);

      await dispatch(manager, createMockButtonInteraction({ customId: "greet/$john%20doe" }));

      expect(run).toHaveBeenCalledOnce();
      expect(resultHandler.mock.calls[0]?.[0].result).toEqual([null, "john doe"]);
    });

    it("applies componentNotFound diagnostics when no route matches the customId", async () => {
      const resultHandler = vi.fn();
      const { manager } = createManagerWithClient({ resultHandler });

      const run = vi.fn(async ctx => ctx.ok());
      const handler = createButton({
        route: "known-route",
        build: id => button({ customId: id(), label: "Known", style: "primary" }),
        run,
      });
      manager.loadComponent(handler);

      await dispatch(manager, createMockButtonInteraction({ customId: "unknown-route" }));

      expect(run).not.toHaveBeenCalled();
      expect(resultHandler).not.toHaveBeenCalled();
      expect(manager.logger.logError).toHaveBeenCalledOnce();
    });

    it("applies componentNotFound diagnostics (not a crash) for malformed percent-encoding in the customId", async () => {
      const resultHandler = vi.fn();
      const { manager } = createManagerWithClient({ resultHandler });

      const run = vi.fn(async ctx => ctx.ok());
      const handler = createButton({
        route: "greet/{name}",
        build: (id, label: string) => button({ customId: id(), label, style: "primary" }),
        run,
      });
      manager.loadComponent(handler);

      await expect(dispatch(manager, createMockButtonInteraction({ customId: "greet/$%" }))).resolves.toBeUndefined();

      expect(run).not.toHaveBeenCalled();
      expect(resultHandler).not.toHaveBeenCalled();
      expect(manager.logger.logError).toHaveBeenCalledOnce();
    });

    it("throws when loading two components with the exact same route", () => {
      const { manager } = createManagerWithClient();

      const buildHandler = (): ReturnType<typeof createButton> => createButton({
        route: "duplicate-route",
        build: id => button({ customId: id(), label: "A", style: "primary" }),
        run: async ctx => ctx.ok(),
      });

      manager.loadComponent(buildHandler());
      expect(() => manager.loadComponent(buildHandler())).toThrow();
    });

    it("applies multipleMatches diagnostics when more than one loaded route matches the customId", async () => {
      const resultHandler = vi.fn();
      const { manager } = createManagerWithClient({ resultHandler });

      const runA = vi.fn(async ctx => ctx.ok());
      const runB = vi.fn(async ctx => ctx.ok());
      const handlerA = createButton({
        route: "help",
        build: id => button({ customId: id(), label: "A", style: "primary" }),
        run: runA,
      });
      const handlerB = createButton({
        route: "help",
        build: id => button({ customId: id(), label: "B", style: "primary" }),
        run: runB,
      });

      // Bypass loadComponent's duplicate-route guard to simulate two distinct
      // registrations that both independently match the same customId.
      manager.components[ComponentType.Button].set("help#1", handlerA);
      manager.components[ComponentType.Button].set("help#2", handlerB);

      await dispatch(manager, createMockButtonInteraction({ customId: "help" }));

      expect(runA).not.toHaveBeenCalled();
      expect(runB).not.toHaveBeenCalled();
      expect(resultHandler).not.toHaveBeenCalled();
      expect(manager.logger.logError).toHaveBeenCalledOnce();
    });
  });

  describe("preReply / deferReply", () => {
    it("defers the reply before running the component when preReply is true", async () => {
      const resultHandler = vi.fn();
      const { manager } = createManagerWithClient({ resultHandler });

      const run = vi.fn(async (ctx: ComponentContext) => {
        expect(ctx.defer).toBe(true);
        return ctx.ok();
      });
      const handler = createButton({
        route: "greet",
        preReply: true,
        build: id => button({ customId: id(), label: "Greet", style: "primary" }),
        run,
      });
      manager.loadComponent(handler);

      const interaction = createMockButtonInteraction({ customId: "greet" });
      await dispatch(manager, interaction);

      expect(interaction.deferReply).toHaveBeenCalledWith({ flags: undefined });
      expect(run).toHaveBeenCalledOnce();
    });

    it("defers with the ephemeral flag when preReply is \"ephemeral\"", async () => {
      const resultHandler = vi.fn();
      const { manager } = createManagerWithClient({ resultHandler });

      const handler = createButton({
        route: "greet",
        preReply: "ephemeral",
        build: id => button({ customId: id(), label: "Greet", style: "primary" }),
        run: async ctx => ctx.ok(),
      });
      manager.loadComponent(handler);

      const interaction = createMockButtonInteraction({ customId: "greet" });
      await dispatch(manager, interaction);

      expect(interaction.deferReply).toHaveBeenCalledWith({ flags: MessageFlags.Ephemeral });
    });

    it("stops the pipeline and applies deferFailed diagnostics when deferReply fails", async () => {
      const resultHandler = vi.fn();
      const { manager } = createManagerWithClient({ resultHandler });

      const run = vi.fn(async ctx => ctx.ok());
      const handler = createButton({
        route: "greet",
        preReply: true,
        build: id => button({ customId: id(), label: "Greet", style: "primary" }),
        run,
      });
      manager.loadComponent(handler);

      const interaction = createMockButtonInteraction({ customId: "greet" });
      vi.mocked(interaction.deferReply).mockRejectedValue(new Error("defer boom"));

      await dispatch(manager, interaction);

      expect(run).not.toHaveBeenCalled();
      expect(resultHandler).not.toHaveBeenCalled();
      expect(manager.logger.warning).toHaveBeenCalled();
    });

    it("uses editReply instead of reply for the default resultHandler when defer is true", async () => {
      const { manager } = createManagerWithClient();

      const handler = createButton({
        route: "greet",
        preReply: true,
        build: id => button({ customId: id(), label: "Greet", style: "primary" }),
        run: () => {
          throw new Error("boom");
        },
      });
      manager.loadComponent(handler);

      const interaction = createMockButtonInteraction({ customId: "greet" });
      await dispatch(manager, interaction);

      expect(interaction.deferReply).toHaveBeenCalledOnce();
      expect(interaction.editReply).toHaveBeenCalledOnce();
      expect(interaction.reply).not.toHaveBeenCalled();
    });

    it("uses reply for the default resultHandler when there was no defer", async () => {
      const { manager } = createManagerWithClient();

      const handler = createButton({
        route: "greet",
        build: id => button({ customId: id(), label: "Greet", style: "primary" }),
        run: () => {
          throw new Error("boom");
        },
      });
      manager.loadComponent(handler);

      const interaction = createMockButtonInteraction({ customId: "greet" });
      await dispatch(manager, interaction);

      expect(interaction.reply).toHaveBeenCalledOnce();
      expect(interaction.editReply).not.toHaveBeenCalled();
    });
  });

  describe("middleware pipeline", () => {
    class FirstMiddleware extends ComponentMiddleware {
      readonly name = "first" as const;
      run(): ComponentMiddlewareRun<{ step: 1 }> {
        return this.next({ step: 1 });
      }
    }

    class SecondMiddleware extends ComponentMiddleware {
      readonly name = "second" as const;
      run(): ComponentMiddlewareRun<{ step: 2 }> {
        return this.next({ step: 2 });
      }
    }

    class CancelThirdMiddleware extends ComponentMiddleware {
      readonly name = "third" as const;
      run(): ComponentMiddlewareRun<NonNullable<unknown>> {
        return this.cancel(Promise.resolve([null, true]));
      }
    }

    class ErrorThirdMiddleware extends ComponentMiddleware {
      readonly name = "third" as const;
      run(ctx: ComponentContext): ComponentMiddlewareRun<NonNullable<unknown>> {
        return this.error(new ComponentError({ message: "third failed", interaction: ctx.interaction }));
      }
    }

    function buttonWithMiddlewares(use: ComponentMiddleware[], run: (ctx: ComponentContext) => ReturnType<ComponentMiddleware["run"]> | unknown): ReturnType<typeof createButton> {
      return createButton({
        route: "greet",
        use: use as never,
        build: id => button({ customId: id(), label: "Greet", style: "primary" }),
        run: run as never,
      });
    }

    it("accumulates next() values from multiple middlewares into context.additional before run()", async () => {
      const resultHandler = vi.fn();
      const { manager } = createManagerWithClient({ resultHandler });

      const run = vi.fn(async (ctx: ComponentContext) => {
        expect(ctx.additional).toEqual({ first: { step: 1 }, second: { step: 2 } });
        return ctx.ok();
      });
      manager.loadComponent(buttonWithMiddlewares([new FirstMiddleware(), new SecondMiddleware()], run));

      await dispatch(manager, createMockButtonInteraction({ customId: "greet" }));

      expect(run).toHaveBeenCalledOnce();
      expect(resultHandler.mock.calls[0]?.[0].status).toBe("returned");
    });

    it("stops the pipeline without calling run() or resultHandler when a middleware cancels", async () => {
      const resultHandler = vi.fn();
      const { manager } = createManagerWithClient({ resultHandler });

      const run = vi.fn(async ctx => ctx.ok());
      manager.loadComponent(buttonWithMiddlewares(
        [new FirstMiddleware(), new SecondMiddleware(), new CancelThirdMiddleware()],
        run,
      ));

      await dispatch(manager, createMockButtonInteraction({ customId: "greet" }));

      expect(run).not.toHaveBeenCalled();
      expect(resultHandler).not.toHaveBeenCalled();
    });

    it("passes status thrown with the middleware's ComponentError when a middleware in the chain errors", async () => {
      const resultHandler = vi.fn();
      const { manager } = createManagerWithClient({ resultHandler });

      const run = vi.fn(async ctx => ctx.ok());
      manager.loadComponent(buttonWithMiddlewares(
        [new FirstMiddleware(), new SecondMiddleware(), new ErrorThirdMiddleware()],
        run,
      ));

      await dispatch(manager, createMockButtonInteraction({ customId: "greet" }));

      expect(run).not.toHaveBeenCalled();
      const infos = resultHandler.mock.calls[0]?.[0];
      expect(infos.status).toBe("thrown");
      expect(infos.thrownValue).toBeInstanceOf(ComponentError);
      expect(infos.thrownValue.message).toBe("third failed");
    });

    it("wraps a thrown exception from a middleware into a ComponentError with status thrown", async () => {
      const resultHandler = vi.fn();
      const { manager } = createManagerWithClient({ resultHandler });

      class ThrowingMiddleware extends ComponentMiddleware {
        readonly name = "throwing" as const;
        run(): never {
          throw new Error("middleware boom");
        }
      }

      const run = vi.fn(async ctx => ctx.ok());
      manager.loadComponent(buttonWithMiddlewares([new ThrowingMiddleware()], run));

      await dispatch(manager, createMockButtonInteraction({ customId: "greet" }));

      expect(run).not.toHaveBeenCalled();
      const infos = resultHandler.mock.calls[0]?.[0];
      expect(infos.status).toBe("thrown");
      expect(infos.thrownValue).toBeInstanceOf(ComponentError);
      expect(infos.thrownValue.message).toBe("failed to run middleware : middleware boom");
    });
  });

  describe("run() throwing non-Error values", () => {
    const nonErrorThrows: [string, unknown][] = [
      ["a string", "boom string"],
      ["null", null],
      ["a plain object", { code: 42 }],
    ];

    it.each(nonErrorThrows)("preserves %s thrown from run() as thrownValue", async (_label, thrown) => {
      const resultHandler = vi.fn();
      const { manager } = createManagerWithClient({ resultHandler });

      const handler = createButton({
        route: "greet",
        build: id => button({ customId: id(), label: "Greet", style: "primary" }),
        run: () => {
          throw thrown;
        },
      });
      manager.loadComponent(handler);

      await dispatch(manager, createMockButtonInteraction({ customId: "greet" }));

      const infos = resultHandler.mock.calls[0]?.[0];
      expect(infos.status).toBe("thrown");
      expect(infos.thrownValue).toBe(thrown);
    });
  });

  describe("locale detection", () => {
    it("passes the detected locale through to run() and resultHandler", async () => {
      const resultHandler = vi.fn();
      const { client, manager } = createManagerWithClient({ resultHandler });
      vi.mocked(client.localeManager.detectLanguage).mockResolvedValue("fr");

      const run = vi.fn(async (ctx: ComponentContext) => {
        expect(ctx.locale).toBe("fr");
        return ctx.ok();
      });
      const handler = createButton({
        route: "greet",
        build: id => button({ customId: id(), label: "Greet", style: "primary" }),
        run,
      });
      manager.loadComponent(handler);

      await dispatch(manager, createMockButtonInteraction({ customId: "greet" }));

      expect(run).toHaveBeenCalledOnce();
      expect(resultHandler.mock.calls[0]?.[0].locale).toBe("fr");
    });
  });
});
