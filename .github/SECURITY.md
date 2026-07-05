# Security Policy

Arcscord is tooling for Discord bots, so leaked bot tokens, unsafe command handling, and dependency-chain issues can affect real communities. Please report security issues responsibly.

## Supported Versions

Security fixes are prioritized for the latest published versions of maintained Arcscord packages.

Preview, development, and unreleased versions may receive fixes when the same issue affects a maintained release.

## Reporting a Vulnerability

Do not report security vulnerabilities in public GitHub issues, pull requests, discussions, or public Discord channels.

Report vulnerabilities through GitHub private vulnerability reporting:

https://github.com/arcscord/arcscord/security/advisories/new

This creates a private report visible only to maintainers, so the issue can be discussed and fixed before public disclosure.

Use the private GitHub report especially when the issue is critical or could be exploited immediately. Critical issues include token exposure, remote code execution, privilege escalation, account takeover, supply-chain compromise, or a bypass that lets untrusted users run privileged bot actions.

If GitHub private vulnerability reporting is unavailable, contact the maintainers through the Arcscord Discord server and ask for a private security contact:

https://discord.gg/4geBanVWGR

Include as much of the following as you can:

- Affected package and version
- A clear description of the vulnerability
- Steps to reproduce or a minimal proof of concept
- Impact and likely attack scenario
- Whether the issue is already public or actively exploited
- Any temporary mitigation you know

Do not send real Discord bot tokens, npm tokens, private keys, or production secrets. Use redacted examples or throwaway test credentials only.

## Response Process

Maintainers will try to:

- Acknowledge the report as soon as possible
- Confirm whether the issue is reproducible
- Estimate severity and affected versions
- Coordinate a fix and release plan
- Credit reporters when appropriate and requested

Public disclosure should wait until a fix or mitigation is available, unless users are already at immediate risk and coordinated disclosure is no longer practical.

## Security Best Practices for Users

- Keep Discord bot tokens in environment variables, never in source control.
- Revoke and rotate exposed tokens immediately.
- Grant Discord applications and bots only the permissions they need.
- Review generated bot code before deploying it.
- Keep Arcscord, Discord.js, Node.js, pnpm, and transitive dependencies updated.
- Treat logs, stack traces, screenshots, and build artifacts as potentially sensitive.
