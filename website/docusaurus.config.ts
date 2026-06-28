import type * as Preset from "@docusaurus/preset-classic";
import type { Config } from "@docusaurus/types";
import { themes } from "prism-react-renderer";

const config: Config = {
  title: "Arcscord",
  tagline: "TypeScript tools for Discord bots",
  favicon: "img/logo.svg",
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
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    navbar: {
      title: "Arcscord",
      logo: {
        alt: "Arcscord logo",
        src: "img/logo.svg",
        srcDark: "img/logo.svg",
      },
      items: [
        { type: "docSidebar", sidebarId: "guideSidebar", position: "left", label: "Guide" },
        { to: "/api", label: "API", position: "left" },
        { href: "https://discord.gg/4geBanVWGR", label: "Discord", position: "right" },
        { href: "https://github.com/arcscord/arcscord", label: "GitHub", position: "right" },
      ],
    },
    prism: {
      theme: themes.github,
      darkTheme: themes.oneDark,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
