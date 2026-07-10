import { createEvent } from "arcscord";

/**
 * `messageCreate` listener that reacts with 🚀 to any message mentioning
 * "arcscord".
 *
 * The word-boundary regex avoids matching substrings, and reading
 * `message.content` requires the privileged `MessageContent` intent enabled in
 * index.ts.
 */
export const reactToArcscord = createEvent({
  event: "messageCreate",
  name: "reactToArcscord",
  run: async (ctx, message) => {
    const mentionsArcscord = /\barcscord\b/i.test(message.content);

    if (mentionsArcscord) {
      await message.react("🚀");
      return ctx.client.logger.info(`Reacted to message ${message.id} mentioning "arcscord" with 🚀`);
    }
  },
});
