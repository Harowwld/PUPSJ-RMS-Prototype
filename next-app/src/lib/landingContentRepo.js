import { systemConfigRepo } from "./systemConfigRepo.js";

export const DEFAULT_HERO_CONTENT = {
  headlineLine1: "Tanglaw ng Bayan,",
  headlineLine2: "Dambana ng Kagitingan.",
  description:
    "Official institutional records keeping, archive retrieval, and document verification system for Polytechnic University of the Philippines San Juan Campus.",
  ctaText: "Request Document",
  ctaLink: "/login",
  campusAddress:
    "223 Ortega St. cor. A. Mabini St., Addition Hills, San Juan City",
  registrarHours: "REGISTRAR: 8:00 AM – 5:00 PM",
  operatingDays: "MON – FRI",
  autoRotateInterval: 5500,
  slides: [
    {
      src: "/assets/pup/landing-1.jpg",
      alt: "PUP San Juan Campus Building Entrance",
      label: "Main Campus Entrance",
    },
    {
      src: "/assets/pup/landing-2.jpg",
      alt: "PUP San Juan Academic Hall & Records Center",
      label: "Academic & Records Hall",
    },
    {
      src: "/assets/pup/landing-3.jpg",
      alt: "PUP San Juan Campus Grounds & Facade",
      label: "Campus Grounds & Courtyard",
    },
  ],
};

const SETTINGS_KEY = "landing_hero_content";

/**
 * Merges persisted content with default content to ensure all required fields exist.
 */
function sanitizeHeroContent(raw) {
  if (!raw || typeof raw !== "object") {
    return { ...DEFAULT_HERO_CONTENT };
  }

  const slides = Array.isArray(raw.slides) && raw.slides.length > 0
    ? raw.slides
        .filter((s) => s && typeof s.src === "string" && s.src.trim() !== "")
        .map((s, idx) => ({
          src: String(s.src).trim(),
          alt: String(s.alt || `Campus Photo ${idx + 1}`).trim(),
          label: String(s.label || `Campus View ${idx + 1}`).trim(),
        }))
    : DEFAULT_HERO_CONTENT.slides;

  const autoRotateInterval = Number(raw.autoRotateInterval);

  return {
    headlineLine1: typeof raw.headlineLine1 === "string" && raw.headlineLine1.trim() !== ""
      ? raw.headlineLine1.trim()
      : DEFAULT_HERO_CONTENT.headlineLine1,
    headlineLine2: typeof raw.headlineLine2 === "string" && raw.headlineLine2.trim() !== ""
      ? raw.headlineLine2.trim()
      : DEFAULT_HERO_CONTENT.headlineLine2,
    description: typeof raw.description === "string" && raw.description.trim() !== ""
      ? raw.description.trim()
      : DEFAULT_HERO_CONTENT.description,
    ctaText: typeof raw.ctaText === "string" && raw.ctaText.trim() !== ""
      ? raw.ctaText.trim()
      : DEFAULT_HERO_CONTENT.ctaText,
    ctaLink: typeof raw.ctaLink === "string" && raw.ctaLink.trim() !== ""
      ? raw.ctaLink.trim()
      : DEFAULT_HERO_CONTENT.ctaLink,
    campusAddress: typeof raw.campusAddress === "string" && raw.campusAddress.trim() !== ""
      ? raw.campusAddress.trim()
      : DEFAULT_HERO_CONTENT.campusAddress,
    registrarHours: typeof raw.registrarHours === "string" && raw.registrarHours.trim() !== ""
      ? raw.registrarHours.trim()
      : DEFAULT_HERO_CONTENT.registrarHours,
    operatingDays: typeof raw.operatingDays === "string" && raw.operatingDays.trim() !== ""
      ? raw.operatingDays.trim()
      : DEFAULT_HERO_CONTENT.operatingDays,
    autoRotateInterval: !isNaN(autoRotateInterval) && autoRotateInterval >= 2000 && autoRotateInterval <= 30000
      ? autoRotateInterval
      : DEFAULT_HERO_CONTENT.autoRotateInterval,
    slides: slides.length > 0 ? slides : DEFAULT_HERO_CONTENT.slides,
  };
}

const BENTO_SETTINGS_KEY = "landing_bento_content";

export const DEFAULT_BENTO_CONTENT = {
  // Section Header
  eyebrow: "Student & Alumni Services",
  headingLine1: "Request, track, and",
  headingLine2: "claim your documents",
  description:
    "Submit your request online, track its progress in real time, and pick up your official stamped documents at the Registrar counter without waiting in long lines.",

  // Card 1: Request Online in Minutes
  card1: {
    title: "Request Online in Minutes",
    description:
      "Select the document you need, specify your purpose, and submit your request straight from your phone or computer.",
    portalTag: "Online Request Portal",
    campusLabel: "PUP San Juan Campus",
    accordionTitle: "Choose Document & Purpose",
    documents: [
      {
        name: "Transcript of Records (TOR)",
        purpose: "Employment / Job Application",
        tag: "Selected",
      },
      {
        name: "Certificate of Grades (COG)",
        purpose: "Scholarship & Honor Evaluation",
        tag: "Selected",
      },
      {
        name: "Certificate of Registration",
        purpose: "PRC Licensure Exam Filing",
        tag: "Selected",
      },
      {
        name: "Certified True Copy (CTC)",
        purpose: "Government & Embassy Clearance",
        tag: "Selected",
      },
    ],
    studentStub: "Student: 2022-04912-SJ-0",
    verifiedBadge: "Verified Student",
  },

  // Card 2: Pick-Up Schedule & SLAs
  card2: {
    title: "Know Exactly When It's Ready",
    description:
      "Every document follows a clear schedule so you know exactly when to visit the Registrar counter.",
    headerText: "Clear Pick-Up Schedule",
    subtitleHint: "Counted in working days once cleared",
    instructionsText: "Processing times depend on the type of document you requested:",
    trackingSample: "Tracking #2026-SJ · Clearance Verified",
    slaChips: [
      { days: "3 Days", label: "Grades & Reg." },
      { days: "7 Days", label: "Clearances" },
      { days: "20 Days", label: "Transcripts" },
    ],
    sealFooter: "Stamped with the official university dry seal",
  },

  // Card 3: Campus Archives
  card3: {
    title: "Direct from Campus Archives",
    description:
      "Your online request connects directly to Room 1 archive cabinets, so staff can retrieve your folder faster.",
    roomCode: "R1",
    cabinetCode: "C-A",
    drawerCode: "D-2",
  },

  // Card 4: Preparation Checklist
  card4: {
    title: "What You Need to Prepare",
    description:
      "Have your student number, email, and signed clearance ready so your request is evaluated right away.",
    checklistHeader: "Checklist",
    primaryItemTitle: "Student Number & Email",
    primaryItemDesc: "Your official student number and an active email for notifications.",
    secondaryItemTitle: "Campus Clearance Stub",
    secondaryItemBadge: "Required for TOR",
    footerNote: "Bring a valid ID when picking up",
  },

  // Card 5: Legal Safeguards (RA 11032)
  card5: {
    title: "Protected by Law (RA 11032)",
    description:
      "Backed by the Ease of Doing Business Act. Transparent tracking with zero hidden delays.",
    tab1Label: "Promise",
    tab2Label: "RA 11032",
    tab3Label: "Tracking",
    charterItems: [
      { icon: "ph-shield-check", title: "No Unrecorded Delays", desc: "Timestamped upon receipt" },
      { icon: "ph-clock", title: "Clear Deadlines", desc: "Always on schedule" },
    ],
    artaItems: [
      { icon: "ph-scales", title: "Zero Red Tape", desc: "Strict RA 11032 compliance" },
      { icon: "ph-file-text", title: "Citizen's Charter", desc: "Published university SLA standards" },
    ],
    auditItems: [
      { icon: "ph-fingerprint", title: "Tamper-Proof Audit Trail", desc: "Every personnel action logged" },
      { icon: "ph-check-circle", title: "Live Tracking Updates", desc: "Real-time ticket progression" },
    ],
    footerNote: "Fair, transparent university service",
  },
};

function sanitizeBentoContent(raw) {
  if (!raw || typeof raw !== "object") {
    return { ...DEFAULT_BENTO_CONTENT };
  }

  const def = DEFAULT_BENTO_CONTENT;

  // Header
  const eyebrow = typeof raw.eyebrow === "string" && raw.eyebrow.trim() !== "" ? raw.eyebrow.trim() : def.eyebrow;
  const headingLine1 = typeof raw.headingLine1 === "string" && raw.headingLine1.trim() !== "" ? raw.headingLine1.trim() : def.headingLine1;
  const headingLine2 = typeof raw.headingLine2 === "string" && raw.headingLine2.trim() !== "" ? raw.headingLine2.trim() : def.headingLine2;
  const description = typeof raw.description === "string" && raw.description.trim() !== "" ? raw.description.trim() : def.description;

  // Card 1
  const rawC1 = raw.card1 || {};
  const c1Docs = Array.isArray(rawC1.documents) && rawC1.documents.length > 0
    ? rawC1.documents.map((d, i) => ({
        name: String(d?.name || def.card1.documents[i]?.name || "Official Document").trim(),
        purpose: String(d?.purpose || def.card1.documents[i]?.purpose || "General Purpose").trim(),
        tag: String(d?.tag || "Selected").trim(),
      }))
    : def.card1.documents;

  const card1 = {
    title: typeof rawC1.title === "string" && rawC1.title.trim() !== "" ? rawC1.title.trim() : def.card1.title,
    description: typeof rawC1.description === "string" && rawC1.description.trim() !== "" ? rawC1.description.trim() : def.card1.description,
    portalTag: typeof rawC1.portalTag === "string" && rawC1.portalTag.trim() !== "" ? rawC1.portalTag.trim() : def.card1.portalTag,
    campusLabel: typeof rawC1.campusLabel === "string" && rawC1.campusLabel.trim() !== "" ? rawC1.campusLabel.trim() : def.card1.campusLabel,
    accordionTitle: typeof rawC1.accordionTitle === "string" && rawC1.accordionTitle.trim() !== "" ? rawC1.accordionTitle.trim() : def.card1.accordionTitle,
    documents: c1Docs,
    studentStub: typeof rawC1.studentStub === "string" && rawC1.studentStub.trim() !== "" ? rawC1.studentStub.trim() : def.card1.studentStub,
    verifiedBadge: typeof rawC1.verifiedBadge === "string" && rawC1.verifiedBadge.trim() !== "" ? rawC1.verifiedBadge.trim() : def.card1.verifiedBadge,
  };

  // Card 2
  const rawC2 = raw.card2 || {};
  const c2Sla = Array.isArray(rawC2.slaChips) && rawC2.slaChips.length > 0
    ? rawC2.slaChips.map((s, i) => ({
        days: String(s?.days || def.card2.slaChips[i]?.days || "3 Days").trim(),
        label: String(s?.label || def.card2.slaChips[i]?.label || "General").trim(),
      }))
    : def.card2.slaChips;

  const card2 = {
    title: typeof rawC2.title === "string" && rawC2.title.trim() !== "" ? rawC2.title.trim() : def.card2.title,
    description: typeof rawC2.description === "string" && rawC2.description.trim() !== "" ? rawC2.description.trim() : def.card2.description,
    headerText: typeof rawC2.headerText === "string" && rawC2.headerText.trim() !== "" ? rawC2.headerText.trim() : def.card2.headerText,
    subtitleHint: typeof rawC2.subtitleHint === "string" && rawC2.subtitleHint.trim() !== "" ? rawC2.subtitleHint.trim() : def.card2.subtitleHint,
    instructionsText: typeof rawC2.instructionsText === "string" && rawC2.instructionsText.trim() !== "" ? rawC2.instructionsText.trim() : def.card2.instructionsText,
    trackingSample: typeof rawC2.trackingSample === "string" && rawC2.trackingSample.trim() !== "" ? rawC2.trackingSample.trim() : def.card2.trackingSample,
    slaChips: c2Sla,
    sealFooter: typeof rawC2.sealFooter === "string" && rawC2.sealFooter.trim() !== "" ? rawC2.sealFooter.trim() : def.card2.sealFooter,
  };

  // Card 3
  const rawC3 = raw.card3 || {};
  const card3 = {
    title: typeof rawC3.title === "string" && rawC3.title.trim() !== "" ? rawC3.title.trim() : def.card3.title,
    description: typeof rawC3.description === "string" && rawC3.description.trim() !== "" ? rawC3.description.trim() : def.card3.description,
    roomCode: typeof rawC3.roomCode === "string" && rawC3.roomCode.trim() !== "" ? rawC3.roomCode.trim() : def.card3.roomCode,
    cabinetCode: typeof rawC3.cabinetCode === "string" && rawC3.cabinetCode.trim() !== "" ? rawC3.cabinetCode.trim() : def.card3.cabinetCode,
    drawerCode: typeof rawC3.drawerCode === "string" && rawC3.drawerCode.trim() !== "" ? rawC3.drawerCode.trim() : def.card3.drawerCode,
  };

  // Card 4
  const rawC4 = raw.card4 || {};
  const card4 = {
    title: typeof rawC4.title === "string" && rawC4.title.trim() !== "" ? rawC4.title.trim() : def.card4.title,
    description: typeof rawC4.description === "string" && rawC4.description.trim() !== "" ? rawC4.description.trim() : def.card4.description,
    checklistHeader: typeof rawC4.checklistHeader === "string" && rawC4.checklistHeader.trim() !== "" ? rawC4.checklistHeader.trim() : def.card4.checklistHeader,
    primaryItemTitle: typeof rawC4.primaryItemTitle === "string" && rawC4.primaryItemTitle.trim() !== "" ? rawC4.primaryItemTitle.trim() : def.card4.primaryItemTitle,
    primaryItemDesc: typeof rawC4.primaryItemDesc === "string" && rawC4.primaryItemDesc.trim() !== "" ? rawC4.primaryItemDesc.trim() : def.card4.primaryItemDesc,
    secondaryItemTitle: typeof rawC4.secondaryItemTitle === "string" && rawC4.secondaryItemTitle.trim() !== "" ? rawC4.secondaryItemTitle.trim() : def.card4.secondaryItemTitle,
    secondaryItemBadge: typeof rawC4.secondaryItemBadge === "string" && rawC4.secondaryItemBadge.trim() !== "" ? rawC4.secondaryItemBadge.trim() : def.card4.secondaryItemBadge,
    footerNote: typeof rawC4.footerNote === "string" && rawC4.footerNote.trim() !== "" ? rawC4.footerNote.trim() : def.card4.footerNote,
  };

  // Card 5
  const rawC5 = raw.card5 || {};
  const card5 = {
    title: typeof rawC5.title === "string" && rawC5.title.trim() !== "" ? rawC5.title.trim() : def.card5.title,
    description: typeof rawC5.description === "string" && rawC5.description.trim() !== "" ? rawC5.description.trim() : def.card5.description,
    tab1Label: typeof rawC5.tab1Label === "string" && rawC5.tab1Label.trim() !== "" ? rawC5.tab1Label.trim() : def.card5.tab1Label,
    tab2Label: typeof rawC5.tab2Label === "string" && rawC5.tab2Label.trim() !== "" ? rawC5.tab2Label.trim() : def.card5.tab2Label,
    tab3Label: typeof rawC5.tab3Label === "string" && rawC5.tab3Label.trim() !== "" ? rawC5.tab3Label.trim() : def.card5.tab3Label,
    charterItems: Array.isArray(rawC5.charterItems) && rawC5.charterItems.length > 0 ? rawC5.charterItems : def.card5.charterItems,
    artaItems: Array.isArray(rawC5.artaItems) && rawC5.artaItems.length > 0 ? rawC5.artaItems : def.card5.artaItems,
    auditItems: Array.isArray(rawC5.auditItems) && rawC5.auditItems.length > 0 ? rawC5.auditItems : def.card5.auditItems,
    footerNote: typeof rawC5.footerNote === "string" && rawC5.footerNote.trim() !== "" ? rawC5.footerNote.trim() : def.card5.footerNote,
  };

  return {
    eyebrow,
    headingLine1,
    headingLine2,
    description,
    card1,
    card2,
    card3,
    card4,
    card5,
  };
}

export const landingContentRepo = {
  getHeroContent: async () => {
    try {
      const raw = await systemConfigRepo.getSetting(SETTINGS_KEY);
      if (!raw) {
        return { ...DEFAULT_HERO_CONTENT };
      }
      const parsed = JSON.parse(raw);
      return sanitizeHeroContent(parsed);
    } catch (err) {
      console.error("[landingContentRepo] getHeroContent error:", err);
      return { ...DEFAULT_HERO_CONTENT };
    }
  },

  updateHeroContent: async (content) => {
    const sanitized = sanitizeHeroContent(content);
    await systemConfigRepo.setSetting(SETTINGS_KEY, JSON.stringify(sanitized));
    return sanitized;
  },

  resetHeroContent: async () => {
    await systemConfigRepo.setSetting(SETTINGS_KEY, JSON.stringify(DEFAULT_HERO_CONTENT));
    return { ...DEFAULT_HERO_CONTENT };
  },

  getBentoContent: async () => {
    try {
      const raw = await systemConfigRepo.getSetting(BENTO_SETTINGS_KEY);
      if (!raw) {
        return { ...DEFAULT_BENTO_CONTENT };
      }
      const parsed = JSON.parse(raw);
      return sanitizeBentoContent(parsed);
    } catch (err) {
      console.error("[landingContentRepo] getBentoContent error:", err);
      return { ...DEFAULT_BENTO_CONTENT };
    }
  },

  updateBentoContent: async (content) => {
    const sanitized = sanitizeBentoContent(content);
    await systemConfigRepo.setSetting(BENTO_SETTINGS_KEY, JSON.stringify(sanitized));
    return sanitized;
  },

  resetBentoContent: async () => {
    await systemConfigRepo.setSetting(BENTO_SETTINGS_KEY, JSON.stringify(DEFAULT_BENTO_CONTENT));
    return { ...DEFAULT_BENTO_CONTENT };
  },
};

