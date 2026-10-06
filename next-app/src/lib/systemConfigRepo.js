import { dbAll, dbGet, dbRun } from "./postgresCompat.js";

export const systemConfigRepo = {
  getSettings: async () => {
    const rows = await dbAll("SELECT key, value FROM settings");
    const settings = {};
    if (rows && Array.isArray(rows)) {
      rows.forEach((row) => {
        if (row && typeof row === "object" && "key" in row) {
          settings[row.key] = row.value;
        }
      });
    }
    return settings;
  },

  getSetting: async (key, defaultValue = null) => {
    try {
      const row = await dbGet("SELECT value FROM settings WHERE key = ?", [key]);
      return row ? row.value : defaultValue;
    } catch (e) {
      console.error(`[systemConfigRepo] getSetting for ${key} failed:`, e);
      return defaultValue;
    }
  },

  setSetting: async (key, value) => {
    try {
      await dbRun("INSERT INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP", [
        key,
        value !== null && value !== undefined ? String(value) : null,
      ]);
    } catch (e) {
      console.error(`[systemConfigRepo] setSetting for ${key} failed:`, e);
      throw e;
    }
  },

  deleteSetting: async (key) => {
    const result = await dbRun("DELETE FROM settings WHERE key = ?", [key]);
    return Number(result?.rowCount ?? result?.changes ?? 0) > 0;
  },
};
