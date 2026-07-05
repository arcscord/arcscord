import type * as Preset from "@docusaurus/preset-classic";
import type { Config } from "@docusaurus/types";
import { themes } from "prism-react-renderer";

const config: Config = {
  title: "Arcscord",
  tagline:
    "A TypeScript-first framework for building Discord bots, with typed commands, components, and result-style error handling on top of discord.js.",
  favicon: "img/favicon.png",
  url: "https://arcscord.dev",
  baseUrl: "/",
  organizationName: "arcscord",
  projectName: "arcscord",
  trailingSlash: false,
  staticDirectories: ["static"],

  onBrokenLinks: "throw",
  markdown: {
    hooks: {
      onBrokenMarkdownLinks: "warn",
    },
  },

  presets: [
    [
      "classic",
      {
        docs: {
          sidebarPath: "./sidebars.ts",
          routeBasePath: "/",
          editUrl: "https://github.com/arcscord/arcscord/tree/main/website/",
        },
        blog: false,
        theme: {
          customCss: "./src/css/custom.css",
        },
        sitemap: {
          changefreq: "weekly",
          priority: 0.5,
          ignorePatterns: ["/tags/**"],
          filename: "sitemap.xml",
        },
      } satisfies Preset.Options,
    ],
  ],

  headTags: [
    {
      tagName: "meta",
      attributes: {
        name: "theme-color",
        content: "#377bc3",
      },
    },
    {
      tagName: "script",
      attributes: {
        type: "application/ld+json",
      },
      innerHTML: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "SoftwareSourceCode",
        "name": "Arcscord",
        "description":
          "A TypeScript-first framework for building Discord bots, with typed commands, components, and result-style error handling on top of discord.js.",
        "codeRepository": "https://github.com/arcscord/arcscord",
        "programmingLanguage": "TypeScript",
        "url": "https://arcscord.dev",
        "license": "https://github.com/arcscord/arcscord/blob/main/LICENSE",
      }),
    },
  ],

  themeConfig: {
    colorMode: {
      defaultMode: "dark",
      respectPrefersColorScheme: false,
    },
    image: "img/social-card.png",
    metadata: [
      {
        name: "description",
        content:
          "A TypeScript-first framework for building Discord bots, with typed commands, components, and result-style error handling on top of discord.js.",
      },
      {
        name: "keywords",
        content:
          "arcscord, discord bot, discord.js, discord bot framework, typescript discord, discord bot typescript",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    navbar: {
      title: "Arcscord",
      logo: {
        alt: "Arcscord logo",
        src: "img/logo.webp",
        srcDark: "img/logo.webp",
        width: 25,
        height: 32,
      },
      items: [
        { type: "docSidebar", sidebarId: "guideSidebar", position: "left", label: "Guide" },
        { to: "/api", label: "API", position: "left" },
        { href: "https://discord.gg/4geBanVWGR", label: "Discord", position: "right" },
        { href: "https://github.com/arcscord/arcscord", label: "GitHub", position: "right" },
        { href: "https://github.com/arcscord/arcscord/releases", label: "Changelog", position: "right" },
      ],
    },
    prism: {
      theme: themes.github,
      darkTheme: themes.oneDark,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
