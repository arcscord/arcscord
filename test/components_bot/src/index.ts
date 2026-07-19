import type {
  ChatInputCommandInteraction,
  Interaction,
} from "discord.js";
import process from "node:process";
import {
  Client,
  Events,
  GatewayIntentBits,
  MessageFlags,
  SlashCommandBuilder,
} from "discord.js";
import { componentIds } from "./ids";
import {
  inputsScenario,
  interactionsScenario,
  layoutScenario,
  mediaScenario,
  migratedScenario,
  migrationStarter,
  validationScenario,
} from "./scenarios";

const token = process.env.TOKEN;
const applicationId = process.env.APPLICATION_ID;
const guildId = process.env.GUILD_ID;

if (!token || !applicationId) {
  throw new Error("TOKEN and APPLICATION_ID must be set. See test/components_bot/.env.example.");
}

const command = new SlashCommandBuilder()
  .setName("components")
  .setDescription("Test @arcscord/components without the Arcscord framework")
  .addSubcommand(subcommand => subcommand.setName("layout").setDescription("Test layout and display helpers"))
  .addSubcommand(subcommand => subcommand.setName("media").setDescription("Test media, thumbnails and files"))
  .addSubcommand(subcommand => subcommand.setName("interactions").setDescription("Test buttons and every select-menu type"))
  .addSubcommand(subcommand => subcommand.setName("inputs").setDescription("Test helpers, builders and raw API data"))
  .addSubcommand(subcommand => subcommand.setName("validation").setDescription("Run every public runtime validator"))
  .addSubcommand(subcommand => subcommand.setName("migration").setDescription("Test legacy-to-Components-V2 migration"));

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

async function registerCommand(readyClient: Client<true>): Promise<void> {
  if (readyClient.application.id !== applicationId) {
    throw new Error(`APPLICATION_ID ${applicationId} does not match the logged-in bot application ${readyClient.application.id}.`);
  }

  if (guildId) {
    const guild = await readyClient.guilds.fetch(guildId);
    await guild.commands.create(command.toJSON());
    process.stdout.write(`Registered /components in guild ${guild.name} (${guild.id}).\n`);
    return;
  }

  await readyClient.application.commands.create(command.toJSON());
  process.stdout.write("Registered /components globally. Discord may take time to propagate it.\n");
}

async function handleCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  switch (interaction.options.getSubcommand()) {
    case "layout":
      await interaction.reply(layoutScenario());
      return;
    case "media":
      await interaction.reply(mediaScenario());
      return;
    case "interactions":
      await interaction.reply(interactionsScenario());
      return;
    case "inputs":
      await interaction.reply(inputsScenario());
      return;
    case "validation":
      await interaction.reply(validationScenario());
      return;
    case "migration":
      await interaction.reply(migrationStarter());
      return;
    default:
      await interaction.reply({ content: "Unknown test scenario.", flags: MessageFlags.Ephemeral });
  }
}

function selectedValues(interaction: Interaction): readonly string[] | undefined {
  if (interaction.isStringSelectMenu())
    return interaction.values;
  if (interaction.isUserSelectMenu())
    return [...interaction.users.keys()];
  if (interaction.isRoleSelectMenu())
    return [...interaction.roles.keys()];
  if (interaction.isMentionableSelectMenu())
    return [...interaction.values];
  if (interaction.isChannelSelectMenu())
    return [...interaction.channels.keys()];
  return undefined;
}

async function handleInteraction(interaction: Interaction): Promise<void> {
  if (interaction.isChatInputCommand() && interaction.commandName === command.name) {
    await handleCommand(interaction);
    return;
  }

  if (interaction.isButton()) {
    if (interaction.customId === componentIds.migration) {
      await interaction.update(migratedScenario());
      return;
    }

    if (interaction.customId.startsWith("components:button:")) {
      await interaction.reply({
        content: `Button routed successfully: \`${interaction.customId}\``,
        flags: MessageFlags.Ephemeral,
      });
    }
    return;
  }

  const values = selectedValues(interaction);
  if (values && "customId" in interaction && interaction.customId.startsWith("components:select:")) {
    await interaction.reply({
      content: `Select routed successfully: \`${interaction.customId}\`\nValues: ${values.map(value => `\`${value}\``).join(", ") || "none"}`,
      flags: MessageFlags.Ephemeral,
    });
  }
}

client.once(Events.ClientReady, async (readyClient) => {
  await registerCommand(readyClient);
  process.stdout.write(`Logged in as ${readyClient.user.tag}.\n`);
});

client.on(Events.InteractionCreate, (interaction) => {
  void handleInteraction(interaction).catch(async (error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
    if (!interaction.isRepliable())
      return;

    const response = { content: "The test scenario failed. See the bot process output for details.", flags: MessageFlags.Ephemeral } as const;
    if (interaction.replied || interaction.deferred)
      await interaction.followUp(response).catch(() => undefined);
    else
      await interaction.reply(response).catch(() => undefined);
  });
});

client.login(token).catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
