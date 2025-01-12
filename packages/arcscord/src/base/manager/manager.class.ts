import type { ArcClient } from "#/base/client/client.class";
import type { LoggerInterface } from "#/utils/logger/logger.type";

/**
 * Abstract class representing a base manager that all other managers should extend.
 */
export abstract class BaseManager {
  /**
   * The client instance
   */
  client: ArcClient;

  /**
   * The name of the manager. Should be defined by subclasses.
   */
  name: string;

  logger: LoggerInterface;
  /**
   * Constructs a new instance of the BaseManager.
   *
   * @param client - The ArcClient instance.
   */
  constructor(client: ArcClient, name: string) {
    this.client = client;
    this.logger = client.createLogger(name);
    this.name = name;
  }

  /**
   * Logs a trace message if tracing is enabled in the client options.
   *
   * @param msg - The message to be logged.
   */
  trace(msg: string): void {
    if (this.client.arcOptions.enableInternalTrace) {
      this.logger.trace(msg);
    }
  }
}
