import type { ReactNode } from "react";
import { DiscordUI } from "@arcscord/discord-ui";
import { useColorMode } from "@docusaurus/theme-common";
import "@arcscord/discord-ui/styles.css";

const lightTokens = {
  muted: "var(--arcscord-muted)",
  selectMuted: "var(--arcscord-muted)",
  border: "var(--arcscord-control-border)",
};
const darkTokens = { border: "var(--arcscord-control-border)" };

export function DiscordPreview({ children, className }: { children: ReactNode; className?: string }) {
  const { colorMode } = useColorMode();

  return (
    <DiscordUI
      className={className}
      theme={colorMode}
      tokens={colorMode === "light" ? lightTokens : darkTokens}
      locale="en-US"
      timeZone="UTC"
    >
      {children}
    </DiscordUI>
  );
}
