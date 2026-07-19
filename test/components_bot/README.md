# Components test bot

Standalone Discord.js bot exercising the complete public runtime API of
`@arcscord/components`. It deliberately does not depend on or import `arcscord`.

## Run

1. Copy `.env.example` to `.env`.
2. Set `TOKEN` and `APPLICATION_ID` from the Discord developer portal.
3. Optionally set `GUILD_ID` for immediate guild-scoped command registration.
4. Invite the application with the `bot` and `applications.commands` scopes.
5. From the repository root, run:

```sh
pnpm test:components-bot
```

The bot registers `/components` with these scenarios:

- `layout`: text, separators, sections, accessories, containers and buttons;
- `media`: thumbnails, media galleries, attachment-backed file components and spoilers;
- `interactions`: every interactive button style and every message select-menu type;
- `inputs`: helper data, Discord.js builders and raw Discord API objects in one payload;
- `validation`: runs every exported validator and displays a structured expected failure;
- `migration`: creates a legacy message that a button converts to Components V2.

When `GUILD_ID` is omitted, the command is registered globally and may take longer to
appear. The bot only needs the `Guilds` gateway intent.
