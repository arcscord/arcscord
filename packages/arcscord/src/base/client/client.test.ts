import type { ArcClientReadyTimeoutError } from "#/utils/error/class/client_ready_timeout_error";
import { afterEach, describe, expect, it, vi } from "vitest";
import { button, createButton } from "#/base/components";
import { ArcscordError } from "#/utils";
import { ArcClient } from "./client.class";

function duplicateRouteButtons(): ReturnType<typeof createButton>[] {
  const make = (): ReturnType<typeof createButton> => createButton({
    route: "same-route",
    build: id => button({ label: "x", style: "primary", customId: id() }),
    run: ctx => ctx.ok(),
  });
  return [make(), make()];
}

afterEach(() => {
  vi.useRealTimers();
});

describe("arc client messages", () => {
  it("passes locale context to user-visible base messages", async () => {
    const client = new ArcClient("token", {
      intents: [],
      managers: {
        locale: {
          enabled: true,
          i18nOptions: {
            resources: {
              fr: {
                translation: {
                  "errors.internal": "Erreur {{id}}",
                },
              },
            },
            fallbackLng: "fr",
            enableSelector: "optimize",
          },
        },
      },
      baseMessages: {
        error: (id, context) => ({
          content: context?.t?.("errors.internal", { id }) ?? id,
        }),
      },
    });

    await client.localeManager.ready;

    expect(client.getErrorMessage("abc", "fr")).toEqual({
      content: "Erreur abc",
    });
  });
});

describe("arcClient.waitReady", () => {
  it("resolves immediately when the client is already ready", async () => {
    vi.useFakeTimers();
    const client = new ArcClient("token", { intents: [] });
    client.ready = true;
    const existingTimers = vi.getTimerCount();

    await expect(client.waitReady()).resolves.toBeUndefined();
    expect(vi.getTimerCount()).toBe(existingTimers);
  });

  it("uses the configured interval between readiness checks", async () => {
    vi.useFakeTimers();
    const client = new ArcClient("token", { intents: [] });
    const existingTimers = vi.getTimerCount();
    let resolved = false;
    const ready = client.waitReady({ timeout: 1_000, checkInterval: 25 });
    void ready.then(() => {
      resolved = true;
    });

    client.ready = true;
    await vi.advanceTimersByTimeAsync(24);
    expect(resolved).toBe(false);

    await vi.advanceTimersByTimeAsync(1);
    await expect(ready).resolves.toBeUndefined();
    expect(resolved).toBe(true);
    expect(vi.getTimerCount()).toBe(existingTimers);
  });

  it("rejects and clears readiness checks when the timeout is reached", async () => {
    vi.useFakeTimers();
    const client = new ArcClient("token", { intents: [] });
    const existingTimers = vi.getTimerCount();
    const ready = client.waitReady({ timeout: 100, checkInterval: 10 });
    const rejection = expect(ready).rejects.toMatchObject({
      name: "ArcClientReadyTimeoutError",
      timeout: 100,
    } satisfies Partial<ArcClientReadyTimeoutError>);

    await vi.advanceTimersByTimeAsync(100);
    await rejection;
    expect(vi.getTimerCount()).toBe(existingTimers);
  });

  it("uses the global waitReady configuration for calls without options", async () => {
    vi.useFakeTimers();
    const client = new ArcClient("token", {
      intents: [],
      waitReady: {
        timeout: 75,
        checkInterval: 10,
      },
    });
    const ready = client.waitReady();
    const rejection = expect(ready).rejects.toMatchObject({
      name: "ArcClientReadyTimeoutError",
      timeout: 75,
    } satisfies Partial<ArcClientReadyTimeoutError>);

    await vi.advanceTimersByTimeAsync(74);
    expect(client.ready).toBe(false);

    await vi.advanceTimersByTimeAsync(1);
    await rejection;
  });

  it("keeps accepting a numeric check interval", async () => {
    vi.useFakeTimers();
    const client = new ArcClient("token", { intents: [] });
    const ready = client.waitReady(20);

    client.ready = true;
    await vi.advanceTimersByTimeAsync(20);

    await expect(ready).resolves.toBeUndefined();
  });

  it.each([
    [{ timeout: -1 }, "timeout"],
    [{ timeout: Number.POSITIVE_INFINITY }, "timeout"],
    [{ checkInterval: 0 }, "checkInterval"],
    [{ checkInterval: Number.NaN }, "checkInterval"],
  ] as const)("rejects invalid %s options", (options, optionName) => {
    const client = new ArcClient("token", { intents: [] });

    expect(() => client.waitReady(options)).toThrow(optionName);
  });
});

describe("arcClient.loadHandlers", () => {
  it("returns a per-category report on success", async () => {
    const client = new ArcClient("token", { intents: [] });
    const simpleButton = createButton({
      route: "ready-button",
      build: id => button({ label: "x", style: "primary", customId: id() }),
      run: ctx => ctx.ok(),
    });

    await expect(client.loadHandlers({ components: [simpleButton] })).resolves.toEqual({
      commands: 0,
      components: 1,
      events: 0,
    });
  });

  it("throws the first ArcscordError on a loading failure", async () => {
    const client = new ArcClient("token", { intents: [] });

    await expect(
      client.loadHandlers({ components: duplicateRouteButtons() }),
    ).rejects.toBeInstanceOf(ArcscordError);
  });
});
