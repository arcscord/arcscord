import { describe, expect, it, vi } from "vitest";
import { createParaglideAdapter } from "./index";

describe("paraglide adapter", () => {
  it("forces the context locale without changing global runtime state", () => {
    const greeting = vi.fn((inputs: { name: string }, options: { locale?: string } = {}) => {
      return `${options.locale}:${inputs.name}`;
    });
    const adapter = createParaglideAdapter({
      messages: { greeting },
      runtime: { baseLocale: "en", locales: ["en", "fr"] },
    });

    expect(adapter.getFixed({ locale: "fr" }).greeting({ name: "Ada" })).toBe("fr:Ada");
    expect(adapter.getFixed({ locale: "en" }).greeting({ name: "Lin" })).toBe("en:Lin");
    expect(greeting).toHaveBeenNthCalledWith(1, { name: "Ada" }, { locale: "fr" });
    expect(greeting).toHaveBeenNthCalledWith(2, { name: "Lin" }, { locale: "en" });
  });

  it("localizes nested messages with stable references and native options", () => {
    const greeting = vi.fn((inputs: { name: string }, options: { locale?: string; suffix?: string } = {}) => {
      return `${options.locale}:${inputs.name}${options.suffix ?? ""}`;
    });
    const messages = { greeting, m: { greeting, nested: { greeting }, empty: null, label: "Messages" } };
    const adapter = createParaglideAdapter({
      messages,
      runtime: { baseLocale: "en", locales: ["en", "fr"] },
    });
    const french = adapter.getFixed("fr");
    const english = adapter.getFixed("en");

    expect(french.m.greeting({ name: "Ada" }, { locale: "en", suffix: "!" })).toBe("fr:Ada!");
    expect(english.m.nested.greeting({ name: "Lin" })).toBe("en:Lin");
    expect(french.greeting({ name: "Ada" })).toBe("fr:Ada");
    expect(french.m).toBe(adapter.getFixed("fr").m);
    expect(french.m.greeting).toBe(french.greeting);
    expect(french.m.nested).toBe(french.m.nested);
    expect(french.m.empty).toBeNull();
    expect(french.m.label).toBe("Messages");
    expect(messages.m.greeting).toBe(greeting);
    expect(greeting).toHaveBeenNthCalledWith(1, { name: "Ada" }, { locale: "fr", suffix: "!" });
  });

  it("preserves native function call, apply, and bind methods", () => {
    const greeting = (inputs: { name: string }, options: { locale?: string } = {}) => {
      return `${options.locale}:${inputs.name}`;
    };
    const adapter = createParaglideAdapter({
      messages: { greeting, m: { greeting } },
      runtime: { baseLocale: "en", locales: ["en", "fr"] },
    });
    const fixed = adapter.getFixed("fr").m.greeting;

    expect(Reflect.apply(fixed.call, fixed, [null, { name: "Ada" }])).toBe("fr:Ada");
    expect(Reflect.apply(fixed.apply, fixed, [null, [{ name: "Lin" }]])).toBe("fr:Lin");
    expect(fixed.bind(null)({ name: "Eve" })).toBe("fr:Eve");
  });

  it("supports messages without inputs and lazy command localizations", () => {
    const messages = {
      ping: (_inputs: object = {}, options: { locale?: string } = {}) => `${options.locale}:pong`,
    };
    const adapter = createParaglideAdapter({
      messages,
      runtime: { baseLocale: "en", locales: ["en", "fr"] },
    });
    const localizations = adapter.discord(messages.ping);

    expect(adapter.getFixed("fr").ping()).toBe("fr:pong");
    expect(localizations.resolve("en")).toBe("en:pong");
    expect(adapter.discord(messages.ping).resolve("fr")).toBe("fr:pong");
  });

  it("passes native message inputs when localizing Discord metadata", () => {
    const messages = {
      command: (inputs: { name: string }, options: { locale?: string } = {}) => {
        return `${options.locale}:${inputs.name}`;
      },
    };
    const adapter = createParaglideAdapter({
      messages,
      runtime: { baseLocale: "en", locales: ["en", "fr"] },
    });

    expect(adapter.discord(messages.command, { name: "ping" }).resolve("fr")).toBe("fr:ping");
  });

  it("isolates locales across concurrent interaction work", async () => {
    const adapter = createParaglideAdapter({
      messages: {
        greeting: async (inputs: { name: string }, options: { locale?: string } = {}) => {
          await Promise.resolve();
          return `${options.locale}:${inputs.name}`;
        },
      },
      runtime: { baseLocale: "en", locales: ["en", "fr"] },
    });

    await expect(Promise.all([
      adapter.getFixed("fr").greeting({ name: "Ada" }),
      adapter.getFixed("en").greeting({ name: "Lin" }),
    ])).resolves.toEqual(["fr:Ada", "en:Lin"]);
  });
});
