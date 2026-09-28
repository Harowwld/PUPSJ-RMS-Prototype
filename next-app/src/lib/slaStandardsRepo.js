import { systemConfigRepo } from "./systemConfigRepo.js";
import { DEFAULT_SLA_STANDARDS } from "./citizenCharter.js";

export const SLA_SETTINGS_KEY = "sla_turnaround_standards";

export const slaStandardsRepo = {
  getStandards: async () => {
    try {
      const raw = await systemConfigRepo.getSetting(SLA_SETTINGS_KEY);
      if (!raw) return DEFAULT_SLA_STANDARDS;
      const parsed = JSON.parse(raw);
      return {
        frameworkName: String(parsed.frameworkName || DEFAULT_SLA_STANDARDS.frameworkName).trim(),
        frameworkType: String(parsed.frameworkType || DEFAULT_SLA_STANDARDS.frameworkType).trim(),
        simpleDays: Math.max(1, parseInt(parsed.simpleDays, 10) || DEFAULT_SLA_STANDARDS.simpleDays),
        complexDays: Math.max(1, parseInt(parsed.complexDays, 10) || DEFAULT_SLA_STANDARDS.complexDays),
        highlyTechnicalDays: Math.max(1, parseInt(parsed.highlyTechnicalDays, 10) || DEFAULT_SLA_STANDARDS.highlyTechnicalDays),
        workingDaysOnly: parsed.workingDaysOnly !== false,
      };
    } catch (e) {
      console.error("[slaStandardsRepo] getStandards failed, using default:", e);
      return DEFAULT_SLA_STANDARDS;
    }
  },

  setStandards: async (standards) => {
    const validated = {
      frameworkName: String(standards.frameworkName || DEFAULT_SLA_STANDARDS.frameworkName).trim(),
      frameworkType: String(standards.frameworkType || "CUSTOM").trim(),
      simpleDays: Math.max(1, parseInt(standards.simpleDays, 10) || 3),
      complexDays: Math.max(1, parseInt(standards.complexDays, 10) || 7),
      highlyTechnicalDays: Math.max(1, parseInt(standards.highlyTechnicalDays, 10) || 20),
      workingDaysOnly: standards.workingDaysOnly !== false,
    };
    await systemConfigRepo.setSetting(SLA_SETTINGS_KEY, JSON.stringify(validated));
    return validated;
  },

  resetToDefault: async () => {
    await systemConfigRepo.setSetting(SLA_SETTINGS_KEY, JSON.stringify(DEFAULT_SLA_STANDARDS));
    return DEFAULT_SLA_STANDARDS;
  },
};
