# Releasing Arcscord packages

Arcscord uses a deliberately manual release flow for a solo maintainer. GitHub
Actions may prepare a package, but only an npm account with two-factor
authentication can make the staged package public.

## One-time repository setup

### GitHub

1. Set the default Actions permission to read-only and disable permission for
   workflows to create or approve pull requests.
2. Allow GitHub-owned actions plus the pinned `pnpm/action-setup`,
   `oven-sh/setup-bun`, and `crazy-max/ghaction-github-labeler` actions used by
   this repository.
3. Create a `main` ruleset with:
   - pull requests required and zero required approvals;
   - `CI / Required` and `Analyze (javascript-typescript)` required;
   - conversation resolution required;
   - force pushes and deletion blocked;
   - no administrator bypass.
4. Create tag rulesets for `arcscord@v*`, `@arcscord/*@v*`, and
   `create-arcscord-bot@v*`. Block tag updates, force pushes, and deletions.
5. Keep Dependabot alerts enabled, but disable the repository-wide
   **Dependabot security updates** switch. Add an enabled repository
   auto-triage rule named `Critical runtime npm on root lockfile` that opens a
   pull request only when all of these conditions match:
   - severity is `critical`;
   - ecosystem is `npm`;
   - dependency scope is `runtime`;
   - a patch is available;
   - manifest path is `/pnpm-lock.yaml`.

The root Dependabot configuration disables routine version pull requests and
limits candidate security updates to production dependencies. The manifest-path
condition keeps `examples/pnpm-lock.yaml` out of the automatic pull request
flow.

### npm

For every published package, configure the GitHub Actions trusted publisher
with:

- organization: `arcscord`;
- repository: `arcscord`;
- workflow: `publish.yml`;
- environment: `npm-publish`;
- allowed action: `npm stage publish` only.

The packages are `arcscord`, `@arcscord/components`,
`@arcscord/middleware`, `@arcscord/error`, `@arcscord/better-error`,
`@arcscord/webhooks`, and `create-arcscord-bot`.

Enable two-factor authentication on the maintainer account. For each package,
select **Require two-factor authentication and disallow tokens**, then revoke
any legacy automation token that can publish.

## Prepare a release pull request

1. Update local `main` and create `release/<package>-<version>` from it.
2. Change the selected package version using SemVer. Update internal dependency
   ranges and examples when the release requires them.
3. For a documented library package, run `pnpm build` followed by
   `pnpm docs:api:release`, then commit the new API snapshot. The scaffolding
   CLI has no generated API snapshot.
4. Run:

   ```sh
   pnpm lint --fix=false
   pnpm knip
   pnpm typecheck
   pnpm test
   pnpm build
   pnpm docs:build
   pnpm docs:check-release
   ```

5. Open the pull request and merge it only after `CI / Required` and CodeQL
   pass.

## Stage and approve the package

Create an annotated tag on the merge commit using the package's exact npm name:

```text
arcscord@v1.3.0
@arcscord/components@v1.1.0
create-arcscord-bot@v1.1.0
```

Stable versions use the npm `latest` dist-tag. Prereleases must use `next`,
`beta`, `alpha`, or `rc`, for example `arcscord@v2.0.0-next.1`; that channel
becomes the npm dist-tag.

Push the tag and wait for **Stage npm release**. The workflow checks that the
tag matches the manifest, that its commit belongs to `main`, and that the
version is not already present on npm. It rebuilds and validates the repository,
packs only the selected package, records the tarball SHA-256, and submits it to
npm staging with OIDC provenance.

Download or inspect the staged package on npm. If its name, version, dist-tag,
files, and checksum are correct, approve it with 2FA using npmjs.com or:

```sh
npm stage list <package-name>
npm stage view <stage-id>
npm stage approve <stage-id>
```

If anything is wrong, reject the staged package instead. After approval, create
the GitHub Release from the same tag and publish its release notes.
