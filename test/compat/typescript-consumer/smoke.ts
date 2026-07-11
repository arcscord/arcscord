import { CommandBotPermissionMiddleware } from "@arcscord/middleware";
import { ArcClient, createCommand } from "arcscord";
import { GatewayIntentBits } from "discord.js";

const command = createCommand({
  slash: {
    name: "compatibility",
    description: "TypeScript 5.4 compatibility check",
  },
  async run() {
    return "ok" as const;
  },
});

const client = new ArcClient("", { intents: [GatewayIntentBits.Guilds] });
const middleware = new CommandBotPermissionMiddleware(["SendMessages"], () => ({
  content: "Missing permissions",
}));

void command;
void client;
void middleware;
