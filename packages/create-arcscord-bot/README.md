# create-arcscord-bot

Scaffold a ready-to-run [Arcscord](https://arcscord.dev) Discord bot in one command.

```sh
pnpm create arcscord-bot
# or
npm create arcscord-bot
# or
yarn create arcscord-bot
```

It sets up TypeScript, the `ArcClient`, optional ESLint / Prettier / i18n, and a working
`/ping` command with a **Refresh** button so you have a real example to build on.

You can also pass options to skip the prompts:

```sh
pnpm create arcscord-bot my-bot -- --package-manager npm --eslint arcscord --i18n
```

| Option | Description |
| --- | --- |
| `[name]` | Project name / target directory |
| `--package-manager <npm\|pnpm\|yarn>` | Package manager to use |
| `--eslint [eslint\|antfu\|arcscord]` | Enable ESLint with the given config |
| `--prettier` | Enable Prettier (with the recommended ESLint config) |
| `--i18n` | Enable i18n (i18next) |
| `--no-install` | Skip dependency installation |

After scaffolding, the project is yours — Arcscord imposes no structure, organize it however
you like.

## Links

- [Documentation](https://arcscord.dev/)
- [Source](https://github.com/arcscord/arcscord/tree/main/packages/create-arcscord-bot)
