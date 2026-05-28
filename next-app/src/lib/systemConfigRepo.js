import { getDb } from "./sqlite";

export const systemConfigRepo = {
  getSettings: async () => {
    const db = await getDb();
    const rows = db.exec("SELECT key, value FROM settings");
    if (!rows || rows.length === 0) return {};
    
    const settings = {};
    const data = rows[0].values;
    data.forEach(([key, value]) => {
      settings[key] = value;
    });
    return settings;
  },

  getSetting: async (key, defaultValue = null) => {
    const db = await getDb();
    const rows = db.exec("SELECT value FROM settings WHERE key = ?", [key]);
    if (!rows || rows.length === 0 || rows[0].values.length === 0) {
      return defaultValue;
    }
    return rows[0].values[0][0];
  },

  setSetting: async (key, value) => {
    const db = await getDb();
    db.exec("INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))", [
      key,
      String(value),
    ]);
  },
};
