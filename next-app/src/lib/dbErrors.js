/** Return true for PostgreSQL unique/primary-key conflicts and SQLite equivalents. */
export function isUniqueViolation(error) {
  const message = String(error?.message || error || "");
  return error?.code === "23505" || /duplicate key value|unique constraint|\bUNIQUE\b|\bPRIMARY KEY\b/i.test(message);
}
