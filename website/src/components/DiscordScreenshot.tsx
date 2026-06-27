import useBaseUrl from "@docusaurus/useBaseUrl";
import React from "react";

export function DiscordScreenshot({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="discord-screenshot">
      <img src={useBaseUrl(src)} alt={alt} />
    </div>
  );
}
