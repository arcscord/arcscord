import { Client as DJSClient, IntentsBitField, REST } from "discord.js";
import { CommandManager } from "#/manager/command/command_manager.class";
import { DevManager } from "#/manager/dev";
import { logger } from "#/utils/logger/logger.class";
import { EventManager } from "#/manager/event/event_manager.class";
import { TaskManager } from "#/manager/task/task_manager";

export class ArcClient extends DJSClient {

  commandManager = new CommandManager(this);

  devManager = new DevManager();

  eventManager = new EventManager(this);

  taskManager = new TaskManager(this);

  logger = logger;

  rest: REST;

  ready = false;

  constructor(token: string) {
    super({
      intents: [
        IntentsBitField.Flags.GuildScheduledEvents,
        IntentsBitField.Flags.Guilds,
        IntentsBitField.Flags.GuildMessages,
        IntentsBitField.Flags.MessageContent,
        IntentsBitField.Flags.DirectMessages,
        IntentsBitField.Flags.GuildMembers,
        IntentsBitField.Flags.GuildVoiceStates,
        IntentsBitField.Flags.GuildPresences,
      ],
    });

    this.token = token;

    this.rest = new REST({
      version: "10",
    }).setToken(token);

    this.on("ready", () => {
      this.ready = true;
      this.logger.info("bot connected...");
      void this.commandManager.load();
    });
  }

  async preLoad(): Promise<void> {
    this.eventManager.load();
    this.taskManager.load();
  }

  waitReady(delay = 50): Promise<void> {
    return new Promise((resolve) => {
      if (this.ready) {
        return resolve();
      }

      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      setTimeout(() => {
        if (this.ready) {
          return resolve();
        }

        // delay : 0.05s, 0.1s, 0.2s 0.4s, 0.8s, 0.5s, 1s, and repeat infinity last two
        return this.waitReady(delay <= 500 ? delay * 2 : 500);

      }, delay);

    });
  }

}