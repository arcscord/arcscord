import type { ReactNode } from "react";
import Link from "@docusaurus/Link";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import CodeBlock from "@theme/CodeBlock";
import Layout from "@theme/Layout";
import TabItem from "@theme/TabItem";
import Tabs from "@theme/Tabs";
import styles from "./index.module.css";

const quickStart = `import { ArcClient, createCommand } from "arcscord";

const client = new ArcClient(process.env.DISCORD_TOKEN!, {
  intents: ["Guilds"],
  applicationId: process.env.APPLICATION_ID!,
});

const ping = createCommand({
  slash: { name: "ping", description: "Check if the bot is available" },
  run: ctx => ctx.reply("Pong!"),
});

await client.login();
await client.loadCommands([ping]);`;

type Feature = {
  title: string;
  description: string;
  to: string;
};

const features: Feature[] = [
  {
    title: "TypeScript-first",
    description:
      "Handlers infer their context from your command definition. Options, autocomplete, and components are typed end to end.",
    to: "/guide/commands",
  },
  {
    title: "Flexible error handling",
    description:
      "Return nothing for simple handlers, or a typed Result for explicit failures. Returned and thrown errors flow through configurable result handlers.",
    to: "/guide/error-handling",
  },
  {
    title: "Composable middleware",
    description:
      "Reusable middleware for commands and components with next, cancel, and error control flow.",
    to: "/guide/middleware",
  },
  {
    title: "Built on discord.js",
    description:
      "ArcClient extends the discord.js Client. Every option, event, and REST method you already know still works.",
    to: "/guide/client",
  },
];

type Example = {
  name: string;
  github: string;
  description: string;
};

const examples: Example[] = [
  {
    name: "starter-bot",
    github: "https://github.com/arcscord/arcscord/tree/main/examples/starter-bot",
    description:
      "The smallest end-to-end bot: typed slash and context-menu commands, a self-updating button, a component middleware, and an event listener.",
  },
  {
    name: "reminder-bot",
    github: "https://github.com/arcscord/arcscord/tree/main/examples/reminder-bot",
    description:
      "A user-install bot storing personal reminders in SQLite, with a background scheduler, subcommands, and a duration parser.",
  },
  {
    name: "ticket_bot",
    github: "https://github.com/arcscord/arcscord/tree/main/examples/ticket_bot",
    description:
      "A full support-ticket system on Discord threads: Prisma + SQLite, i18n, modals, autocomplete, and a custom result handler.",
  },
];

type Pkg = {
  name: string;
  npm: string;
  doc: string;
  description: string;
};

const packages: Pkg[] = [
  {
    name: "arcscord",
    npm: "arcscord",
    doc: "/packages/arcscord",
    description: "Core Discord bot framework: client, commands, components, events.",
  },
  {
    name: "@arcscord/components",
    npm: "@arcscord/components",
    doc: "/packages/components",
    description: "Typed Components V2 helpers, available through Arcscord or standalone.",
  },
  {
    name: "@arcscord/adapter-i18next",
    npm: "@arcscord/adapter-i18next",
    doc: "/packages/adapter-i18next",
    description: "Typed i18next localization adapter.",
  },
  {
    name: "@arcscord/adapter-paraglide",
    npm: "@arcscord/adapter-paraglide",
    doc: "/packages/adapter-paraglide",
    description: "Typed Paraglide JS localization adapter.",
  },
  {
    name: "@arcscord/webhooks",
    npm: "@arcscord/webhooks",
    doc: "/packages/webhooks",
    description: "Typed Discord Webhook Events handling for existing web frameworks.",
  },
  {
    name: "@arcscord/middleware",
    npm: "@arcscord/middleware",
    doc: "/packages/middleware",
    description: "Reusable middleware for commands and components.",
  },
  {
    name: "@arcscord/error",
    npm: "@arcscord/error",
    doc: "/packages/error",
    description: "Result-style error handling helpers.",
  },
  {
    name: "@arcscord/better-error",
    npm: "@arcscord/better-error",
    doc: "/packages/better-error",
    description: "Richer Error class with debug context.",
  },
];

function Hero(): ReactNode {
  return (
    <header className={styles.hero}>
      <div className="container">
        <h1 className={styles.heroTitle}>
          Build Discord bots
          {" "}
          <span>with TypeScript</span>
        </h1>
        <p className={styles.heroTagline}>
          A TypeScript-first framework for building Discord bots — typed
          commands, components, and result-style error handling on top of
          discord.js.
        </p>
        <div className={styles.heroButtons}>
          <Link className={`button button--primary ${styles.heroAction}`} to="/guide/installation">
            Get Started
          </Link>
          <Link className={`button button--secondary ${styles.heroAction}`} to="/api">
            API Reference
          </Link>
          <Link
            className={`button button--secondary ${styles.heroAction}`}
            href="https://github.com/arcscord/arcscord"
          >
            GitHub
          </Link>
        </div>
        <div className={styles.heroBadges}>
          <Link href="https://www.npmjs.com/package/arcscord" aria-label="arcscord on npm">
            <img
              src="https://img.shields.io/npm/v/arcscord?color=1c70cd&label=arcscord&logo=npm"
              alt="arcscord npm version"
              width={118}
              height={20}
            />
          </Link>
          <Link href="https://www.npmjs.com/package/arcscord" aria-label="arcscord downloads on npm">
            <img
              src="https://img.shields.io/npm/dm/arcscord?color=31318a&label=downloads"
              alt="arcscord monthly downloads"
              width={134}
              height={20}
            />
          </Link>
          <Link href="https://github.com/arcscord/arcscord" aria-label="arcscord on GitHub">
            <img
              src="https://img.shields.io/github/stars/arcscord/arcscord?color=31318a&logo=github"
              alt="GitHub stars"
              width={96}
              height={20}
            />
          </Link>
        </div>
      </div>
    </header>
  );
}

function QuickStart(): ReactNode {
  return (
    <section className={styles.quickStart} aria-labelledby="quick-start-title">
      <div className="container">
        <h2 className={styles.sectionTitle} id="quick-start-title">A Bot in a Few Lines</h2>
        <p className={styles.sectionSubtitle}>
          Create a client, declare a typed slash command, and register it.
        </p>
        <CodeBlock className={styles.quickStartBlock} language="ts" title="index.ts">
          {quickStart}
        </CodeBlock>
      </div>
    </section>
  );
}

function Features(): ReactNode {
  return (
    <section className={styles.section}>
      <div className="container">
        <h2 className={styles.sectionTitle}>Framework Highlights</h2>
        <div className={styles.featureGrid}>
          {features.map(feature => (
            <Link key={feature.title} className={styles.featureCard} to={feature.to}>
              <h3 className={styles.featureTitle}>{feature.title}</h3>
              <p className={styles.featureDescription}>{feature.description}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function Install(): ReactNode {
  return (
    <section className={`${styles.section} ${styles.sectionAlt}`}>
      <div className="container">
        <h2 className={styles.sectionTitle}>Installation</h2>
        <p className={styles.sectionSubtitle}>
          Requires Node.js 24.11.0 or newer, or Bun 1.3.0 or newer, and
          TypeScript 5.4 or newer.
        </p>
        <div className={styles.codeWrapper}>
          <Tabs groupId="package-manager">
            <TabItem value="pnpm" label="pnpm" default>
              <CodeBlock language="bash">pnpm add arcscord discord.js</CodeBlock>
            </TabItem>
            <TabItem value="npm" label="npm">
              <CodeBlock language="bash">npm install arcscord discord.js</CodeBlock>
            </TabItem>
            <TabItem value="yarn" label="yarn">
              <CodeBlock language="bash">yarn add arcscord discord.js</CodeBlock>
            </TabItem>
            <TabItem value="bun" label="bun">
              <CodeBlock language="bash">bun add arcscord discord.js</CodeBlock>
            </TabItem>
          </Tabs>
        </div>
      </div>
    </section>
  );
}

function Packages(): ReactNode {
  return (
    <section className={styles.section}>
      <div className="container">
        <h2 className={styles.sectionTitle}>Packages</h2>
        <p className={styles.sectionSubtitle}>
          Install only what you need. Each package ships its own types.
        </p>
        <div className={styles.packageGrid}>
          {packages.map(pkg => (
            <div key={pkg.name} className={styles.packageCard}>
              <code className={styles.packageName}>{pkg.name}</code>
              <p className={styles.packageDescription}>{pkg.description}</p>
              <div className={styles.packageLinks}>
                <Link to={pkg.doc}>Docs</Link>
                <Link href={`https://www.npmjs.com/package/${pkg.npm}`}>npm</Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Examples(): ReactNode {
  return (
    <section className={`${styles.section} ${styles.sectionAlt}`}>
      <div className="container">
        <h2 className={styles.sectionTitle}>Examples</h2>
        <p className={styles.sectionSubtitle}>
          Full bots you can clone and run, from a minimal starter to a
          Prisma-backed ticket system.
        </p>
        <div className={`${styles.packageGrid} ${styles.exampleGrid}`}>
          {examples.map(example => (
            <div key={example.name} className={styles.packageCard}>
              <code className={styles.packageName}>{example.name}</code>
              <p className={styles.packageDescription}>{example.description}</p>
              <div className={styles.packageLinks}>
                <Link href={example.github}>View on GitHub</Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function Home(): ReactNode {
  const { siteConfig } = useDocusaurusContext();
  return (
    <Layout
      title="Arcscord — TypeScript framework for Discord bots"
      description={siteConfig.tagline}
    >
      <main>
        <Hero />
        <QuickStart />
        <Features />
        <Install />
        <Packages />
        <Examples />
      </main>
    </Layout>
  );
}
