import type { ReactNode } from "react";
import Link from "@docusaurus/Link";
import useBaseUrl from "@docusaurus/useBaseUrl";
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
  build: {
    slash: { name: "ping", description: "Check if the bot is available" },
  },
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
    title: "Result-style errors",
    description:
      "Every handler returns a Result<T, E>. No silent throws — successes and failures flow through typed result and error handlers.",
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
  const logo = useBaseUrl("img/logo.webp");
  return (
    <header className={styles.hero}>
      <div className={styles.heroInner}>
        <img className={styles.heroLogo} src={logo} alt="Arcscord logo" width={251} height={320} />
        <h1 className={styles.heroTitle}>Arcscord</h1>
        <p className={styles.heroTagline}>
          A TypeScript-first framework for building Discord bots — typed
          commands, components, and result-style error handling on top of
          discord.js.
        </p>
        <div className={styles.heroButtons}>
          <Link className="button button--primary button--lg" to="/guide/installation">
            Get started
          </Link>
          <Link className="button button--secondary button--lg" to="/api">
            API reference
          </Link>
          <Link
            className="button button--secondary button--lg"
            href="https://github.com/arcscord/arcscord"
          >
            GitHub
          </Link>
        </div>
        <div className={styles.heroBadges}>
          <Link href="https://www.npmjs.com/package/arcscord" aria-label="arcscord on npm">
            <img
              src="https://img.shields.io/npm/v/arcscord?color=377bc3&label=arcscord&logo=npm"
              alt="arcscord npm version"
              width={118}
              height={20}
            />
          </Link>
          <Link href="https://www.npmjs.com/package/arcscord" aria-label="arcscord downloads on npm">
            <img
              src="https://img.shields.io/npm/dm/arcscord?color=8298ed&label=downloads"
              alt="arcscord monthly downloads"
              width={134}
              height={20}
            />
          </Link>
          <Link href="https://github.com/arcscord/arcscord" aria-label="arcscord on GitHub">
            <img
              src="https://img.shields.io/github/stars/arcscord/arcscord?color=8298ed&logo=github"
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
    <section className={styles.section}>
      <div className="container">
        <h2 className={styles.sectionTitle}>A bot in a few lines</h2>
        <p className={styles.sectionSubtitle}>
          Create a client, declare a typed slash command, and register it.
        </p>
        <div className={styles.codeWrapper}>
          <CodeBlock language="ts" title="index.ts">
            {quickStart}
          </CodeBlock>
        </div>
      </div>
    </section>
  );
}

function Features(): ReactNode {
  return (
    <section className={styles.section}>
      <div className="container">
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
          Requires Node.js 24.11.0 or newer.
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

export default function Home(): ReactNode {
  const { siteConfig } = useDocusaurusContext();
  return (
    <Layout
      title="Arcscord — TypeScript framework for Discord bots"
      description={siteConfig.tagline}
    >
      <Hero />
      <main>
        <QuickStart />
        <Features />
        <Install />
        <Packages />
      </main>
    </Layout>
  );
}
