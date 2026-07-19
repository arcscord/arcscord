<p align="center">
  <a href="https://arcscord.dev/">
    <img src="https://arcscord.dev/img/brand-wordmark.webp" alt="Arcscord" width="380" />
  </a>
</p>

# create-arcscord-bot

Scaffold a ready-to-run [Arcscord](https://arcscord.dev) Discord bot in one command.

```sh
pnpm create arcscord-bot
# or
npm create arcscord-bot
# or
yarn create arcscord-bot
# or
bun create arcscord-bot
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
| `--package-manager <npm\|pnpm\|yarn\|bun>` | Package manager to use |
| `--eslint [eslint\|antfu\|arcscord]` | Enable ESLint with the given config |
| `--prettier` | Enable Prettier (with the recommended ESLint config) |
| `--i18n` | Enable i18n (i18next) |
| `--no-install` | Skip dependency installation |

After scaffolding, the project is yours — Arcscord imposes no structure, organize it however
you like.

The committed `arcscord` dependency range used by generated projects matches the
release line against which the templates were tested. Patch and minor Arcscord
updates are accepted automatically; a new major is adopted only after the
templates have been validated and the range has been updated in the CLI source.

## Local development

To test the scaffolder from this repo without publishing:

```sh
# build it
pnpm --filter create-arcscord-bot build

# run the built binary directly
node packages/create-arcscord-bot/dist/index.js my-test-bot --package-manager pnpm --no-install

# or test the real `create` invocation by linking it globally
cd packages/create-arcscord-bot && pnpm link --global
pnpm create arcscord-bot my-test-bot
```

## Links

- [Documentation](https://arcscord.dev/)
- [Source](https://github.com/arcscord/arcscord/tree/main/packages/create-arcscord-bot)
