const SEMVER_PATTERN = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Z-]+(?:\.[0-9A-Z-]+)*))?(?:\+[0-9A-Z-]+(?:\.[0-9A-Z-]+)*)?$/i;

export function parseSemver(version) {
  const match = SEMVER_PATTERN.exec(version);

  if (!match)
    return undefined;

  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    prerelease: match[4]?.split(".") ?? [],
  };
}

function comparePrerelease(left, right) {
  if (left.length === 0 || right.length === 0)
    return left.length === 0 ? (right.length === 0 ? 0 : 1) : -1;

  for (let index = 0; index < Math.max(left.length, right.length); index++) {
    const leftIdentifier = left[index];
    const rightIdentifier = right[index];

    if (leftIdentifier === undefined)
      return -1;
    if (rightIdentifier === undefined)
      return 1;
    if (leftIdentifier === rightIdentifier)
      continue;

    const leftNumeric = /^\d+$/.test(leftIdentifier);
    const rightNumeric = /^\d+$/.test(rightIdentifier);

    if (leftNumeric && rightNumeric)
      return Number(leftIdentifier) - Number(rightIdentifier);
    if (leftNumeric)
      return -1;
    if (rightNumeric)
      return 1;

    return leftIdentifier.localeCompare(rightIdentifier);
  }

  return 0;
}

export function compareSemver(leftVersion, rightVersion) {
  const left = parseSemver(leftVersion);
  const right = parseSemver(rightVersion);

  if (!left || !right)
    return leftVersion.localeCompare(rightVersion, undefined, { numeric: true });

  return left.major - right.major
    || left.minor - right.minor
    || left.patch - right.patch
    || comparePrerelease(left.prerelease, right.prerelease);
}

export function resolveApiDocVersions(versions) {
  const releaseVersions = versions
    .filter(version => version !== "dev")
    .sort((left, right) => compareSemver(right, left));
  const latestStable = releaseVersions.find(version => parseSemver(version)?.prerelease.length === 0);
  const latest = latestStable ?? releaseVersions[0] ?? (versions.includes("dev") ? "dev" : versions[0]);
  const defaultVersion = latest;

  return {
    defaultVersion,
    latest,
    versions: [
      ...(versions.includes("dev") ? ["dev"] : []),
      ...releaseVersions,
    ],
  };
}
