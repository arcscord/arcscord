import * as basic from "./demos/basic";
import * as child from "./demos/child";
import * as customDebug from "./demos/custom_debug";
import * as customPino from "./demos/custom_pino";
import * as customWinston from "./demos/custom_winston";
import * as diagnostics from "./demos/diagnostics";
import * as fatal from "./demos/fatal";
import * as meta from "./demos/meta";

const sections: { title: string; run: () => void }[] = [
  { title: "Basic usage", run: basic.run },
  { title: "Structured meta", run: meta.run },
  { title: "Scoped context with child()", run: child.run },
  { title: "Diagnostics sink & errorDetail", run: diagnostics.run },
  { title: "fatal()/fatalError() no longer exit", run: fatal.run },
  { title: "Custom logger: pino", run: customPino.run },
  { title: "Custom logger: winston", run: customWinston.run },
  { title: "Custom logger: debug", run: customDebug.run },
];

for (const section of sections) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(section.title);
  console.log("=".repeat(60));
  section.run();
}
