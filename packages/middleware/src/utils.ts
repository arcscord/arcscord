export function normalizeUserIds(userIds: Iterable<string>): Set<string> {
  return new Set(
    [...userIds]
      .map(userId => userId.trim())
      .filter(userId => userId.length > 0),
  );
}
