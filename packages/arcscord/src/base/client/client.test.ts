import { ok } from "@arcscord/error";
import { describe, expect, it, vi } from "vitest";
import { ArcClient } from "./client.class";

describe("arc client", () => {
  it("loads command handlers before ready when applicationId is configured", async () => {
    const client = new ArcClient("token", {
      intents: [],
      applicationId: "app_1",
    });
    const command = {
      build: {
        slash: {
          name: "ping",
          description: "Ping command",
        },
      },
      run: vi.fn(),
    };

    client.ready = false;
    client.waitReady = vi.fn();
    client.loadCommands = vi.fn(async () => ok(true));

    await client.loadHandlers({
      commands: [command],
    });

    expect(client.waitReady).not.toHaveBeenCalled();
    expect(client.loadCommands).toHaveBeenCalledWith([command]);
  });
});
