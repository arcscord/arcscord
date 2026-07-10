import { createEvent } from "arcscord";

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
