import type { NonNullish } from "@arcscord/error";
import type { ClientEvents } from "discord.js";
import type { ArcClient, EventHandleResult } from "#/base";
import type { EventHandler } from "#/base/event/event.type";
import type { ContextDocs } from "#/base/utils";
import { error, ok } from "@arcscord/error";

/**
 * The context in which an event handler is executed.
 */
export class EventContext<E extends keyof ClientEvents = keyof ClientEvents> implements Pick<ContextDocs, "client"> {
  client: ArcClient;

  /**
   * The event handler.
   */
  handler: EventHandler<E>;

  /**
   * Creates an instance of EventContext.
   *
   * @param client - The client instance.
   * @param handler - The event handler.
   */
  constructor(client: ArcClient, handler: EventHandler<E>) {
    this.client = client;
    this.handler = handler;
  }

  /**
   * Returns a successful result.
   *
   * @param value - The value to wrap in the result. Defaults to `true`.
   * @returns A successful event handle result.
   */
  ok(value: string | true = true): EventHandleResult {
    return ok(value);
  }

  /**
   * Returns an error result.
   *
   * @param failure - The expected failure value.
   * @returns An error event handle result.
   */
  error<Failure extends NonNullish>(failure: Failure): EventHandleResult<Failure> {
    return error(failure);
  }

  /**
   * Executes multiple promises and returns the first error result encountered.
   *
   * @param funcList - The list of promises to execute.
   * @returns A successful result if all promises succeed, otherwise the first error result.
   */
  async multiple(
    ...funcList: Promise<EventHandleResult>[]
  ): Promise<EventHandleResult> {
    for (const func of funcList) {
      const [err] = await func;

      if (err !== null) {
        return error(err);
      }
    }

    return ok(true);
  }
}
