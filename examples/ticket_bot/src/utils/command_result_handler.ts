import type { CommandResultHandler } from "arcscord";
import { anyToError } from "arcscord";
import { MessageFlags } from "discord.js";
import { prisma } from "#/utils/prisma";

/**
 * Custom command result handler wired through `managers.command.resultHandler`.
 *
 * It runs after every command execution and does two things:
 *  1. records the invocation in the `CommandUsage` table (read back by `/stats`);
 *  2. reproduces the framework's default logging + user-facing error reply,
 *     since providing a custom handler fully replaces the default one.
 */
export const commandResultHandler: CommandResultHandler = async (infos) => {
  const { client } = infos.context;
  const name = infos.interaction.commandName;

  await prisma.commandUsage.upsert({
    where: { name },
    create: { name, count: 1 },
    update: { count: { increment: 1 } },
  });

  if (infos.status === "thrown") {
    const err = anyToError(infos.thrownValue);
    client.logger.error(`Command "${name}" threw: ${err.message}`);
    return;
  }

  const [err, value] = infos.result;
  if (err) {
    err.generateId();
    client.logger.logError(err);
    const message = client.getErrorMessage(err.id, infos.locale);
    if (infos.defer) {
      await infos.interaction.editReply(message);
    }
    else {
      await infos.interaction.reply({ ...message, flags: MessageFlags.Ephemeral });
    }
    return;
  }

  client.logger.debug(`Command "${name}" ran successfully (${String(value)})`);
};
