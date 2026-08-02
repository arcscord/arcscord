import {
  webhookEvents,
  WebhookEventType,
} from "@arcscord/webhooks";
import { createEvent } from "arcscord";
import { reminderDm } from "../utils/reply";

export const applicationAuthorized = createEvent({
  source: webhookEvents,
  event: WebhookEventType.ApplicationAuthorized,
  run: async (ctx, data) => {
    try {
      const user = await ctx.client.users.fetch(data.user.id);
      await user.send(reminderDm(
        "Reminder bot is ready",
        "Thanks for adding me! Use `/reminder create` to schedule a personal reminder. I will send it back to you here by DM when it is due.",
        "Use `/reminder list` to see pending reminders and `/reminder delete` to remove one. Delays such as `10m`, `1h30m`, or `2 days` are supported.",
      ));
      ctx.logger.info("Sent reminder bot introduction after authorization", {
        userId: data.user.id,
      });
    }
    catch (error) {
      ctx.logger.logError(error, {
        source: "applicationAuthorizedIntroduction",
        userId: data.user.id,
      });
    }
  },
});
