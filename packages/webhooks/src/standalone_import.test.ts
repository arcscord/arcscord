import { describe, expect, it, vi } from "vitest";

vi.mock("arcscord", () => {
  throw new Error("standalone webhooks imported Arcscord at runtime");
});

describe("standalone package import", () => {
  it("does not load Arcscord", async () => {
    const webhooks = await import("./index");

    expect(webhooks.createWebhookHandler).toBeTypeOf("function");
    expect(webhooks.webhookEvents.name).toBe("discord-webhooks");
    expect(webhooks.webhookEvents.id).toBeTypeOf("symbol");
  });
});
