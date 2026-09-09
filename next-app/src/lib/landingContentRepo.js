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

const WORKFLOW_SETTINGS_KEY = "landing_workflow_content";

export const DEFAULT_WORKFLOW_CONTENT = {
  eyebrow: "",
  headingLine1: "How to Request",
  headingLine2: "Your Documents.",
  description:
    "A straightforward guide for students and alumni. See how your document request is submitted online, authenticated from our digital records, and prepared for pick-up at the Registrar counter.",
  primaryButtonText: "Request Document",
  primaryButtonLink: "/login",
  primaryButtonEnabled: true,
  secondaryButtonText: "Explore Services (8)",
  secondaryButtonTarget: "catalog",
  secondaryButtonEnabled: true,
  autoCurve: true,
  curveStyle: "gentle", // 'none' | 'gentle' | 'pronounced'
  steps: [
    {
      num: "01",
      title: "Sign In to Portal",
      summary: "Log in with your official Student Number",
      desc: "Log in to the eManage portal using your official Student Number (format: YYYY-XXXXX-SJ-0). Both currently enrolled students and alumni can access the request system directly.",
      tags: ["Student Portal", "Student Number Login", "Current & Alumni"],
      actionLabel: "Open Portal",
      actionType: "link",
      actionTarget: "/login",
      actionIcon: "ph-arrow-right",
    },
    {
      num: "02",
      title: "Select Your Document",
      summary: "Choose from official academic credentials",
      desc: "Browse the available documents and select what you need—such as a Transcript of Records (TOR), Certificate of Grades, Certificate of Registration, or Diploma.",
      tags: ["8 Document Types", "Official Records", "Clear Requirements"],
      actionLabel: "View Catalog",
      actionType: "scroll",
      actionTarget: "catalog",
      actionIcon: "ph-arrow-down",
    },
    {
      num: "03",
      title: "Submit Your Request",
      summary: "State your purpose and submit online",
      desc: "Indicate why you need the document (for employment, scholarship, transfer, or board exams) and submit your request form right from your phone or computer.",
      tags: ["Online Submission", "Purpose of Request", "No Paper Forms"],
      actionLabel: "",
      actionType: "none",
      actionTarget: "",
      actionIcon: "",
    },
    {
      num: "04",
      title: "Digital Record Retrieval",
      summary: "Staff pull your records from the system",
      desc: "Registrar personnel retrieve your digitized student files directly from the system. Your grades, earned units, and credentials are authenticated without having to search physical folders.",
      tags: ["Digitized Database", "Fast System Pull", "Staff Authentication"],
      actionLabel: "",
      actionType: "none",
      actionTarget: "",
      actionIcon: "",
    },
    {
      num: "05",
      title: "Pick Up at Registrar Counter",
      summary: "Claim your official stamped document",
      desc: "Once your document is printed and stamped with the university's official dry seal, you'll be notified that it's ready for pick-up at the Ground Floor Registrar counter.",
      tags: ["Official Dry Seal", "Registrar Counter", "Campus Pick-Up"],
      actionLabel: "",
      actionType: "none",
      actionTarget: "",
      actionIcon: "",
    },
  ],
};

export const MAX_WORKFLOW_STEPS = 7;
export const MIN_WORKFLOW_STEPS = 2;

function sanitizeWorkflowContent(raw) {
  if (!raw || typeof raw !== "object") {
    return { ...DEFAULT_WORKFLOW_CONTENT };
  }

  const def = DEFAULT_WORKFLOW_CONTENT;

  const eyebrow = typeof raw.eyebrow === "string" && raw.eyebrow.trim() !== "" ? raw.eyebrow.trim() : def.eyebrow;
  const headingLine1 = typeof raw.headingLine1 === "string" && raw.headingLine1.trim() !== "" ? raw.headingLine1.trim() : def.headingLine1;
  const headingLine2 = typeof raw.headingLine2 === "string" && raw.headingLine2.trim() !== "" ? raw.headingLine2.trim() : def.headingLine2;
  const description = typeof raw.description === "string" && raw.description.trim() !== "" ? raw.description.trim() : def.description;

  const primaryButtonText = typeof raw.primaryButtonText === "string" && raw.primaryButtonText.trim() !== "" ? raw.primaryButtonText.trim() : def.primaryButtonText;
  const primaryButtonLink = typeof raw.primaryButtonLink === "string" && raw.primaryButtonLink.trim() !== "" ? raw.primaryButtonLink.trim() : def.primaryButtonLink;
  const primaryButtonEnabled = raw.primaryButtonEnabled !== false;

  const secondaryButtonText = typeof raw.secondaryButtonText === "string" && raw.secondaryButtonText.trim() !== "" ? raw.secondaryButtonText.trim() : def.secondaryButtonText;
  const secondaryButtonTarget = typeof raw.secondaryButtonTarget === "string" && raw.secondaryButtonTarget.trim() !== "" ? raw.secondaryButtonTarget.trim() : def.secondaryButtonTarget;
  const secondaryButtonEnabled = raw.secondaryButtonEnabled !== false;

  const autoCurve = raw.autoCurve !== false;
  const curveStyle = ["none", "gentle", "pronounced"].includes(raw.curveStyle) ? raw.curveStyle : def.curveStyle;

  const rawStepsArray = Array.isArray(raw.steps) ? raw.steps.slice(0, MAX_WORKFLOW_STEPS) : [];

  const steps = rawStepsArray.length >= MIN_WORKFLOW_STEPS
    ? rawStepsArray.map((s, idx) => {
        const defaultStep = def.steps[idx] || {};
        const stepNum = typeof s?.num === "string" && s.num.trim() !== ""
          ? s.num.trim()
          : String(idx + 1).padStart(2, "0");
        const title = typeof s?.title === "string" && s.title.trim() !== ""
          ? s.title.trim()
          : defaultStep.title || `Step ${idx + 1}`;
        const summary = typeof s?.summary === "string" ? s.summary.trim() : (defaultStep.summary || "");
        const desc = typeof s?.desc === "string" ? s.desc.trim() : (defaultStep.desc || "");
        
        let tags = [];
        if (Array.isArray(s?.tags)) {
          tags = s.tags
            .map((t) => (typeof t === "string" ? t.trim() : ""))
            .filter((t) => t.length > 0);
        } else if (typeof s?.tags === "string") {
          tags = s.tags.split(",").map((t) => t.trim()).filter((t) => t.length > 0);
        } else if (Array.isArray(defaultStep.tags)) {
          tags = defaultStep.tags;
        }

        const actionLabel = typeof s?.actionLabel === "string" ? s.actionLabel.trim() : (defaultStep.actionLabel || "");
        const actionType = ["none", "link", "scroll"].includes(s?.actionType) ? s.actionType : (defaultStep.actionType || "none");
        const actionTarget = typeof s?.actionTarget === "string" ? s.actionTarget.trim() : (defaultStep.actionTarget || "");
        const actionIcon = typeof s?.actionIcon === "string" ? s.actionIcon.trim() : (defaultStep.actionIcon || "");

        return {
          num: stepNum,
          title,
          summary,
          desc,
          tags,
          actionLabel,
          actionType,
          actionTarget,
          actionIcon,
        };
      })
    : def.steps;

  return {
    eyebrow,
    headingLine1,
    headingLine2,
    description,
    primaryButtonText,
    primaryButtonLink,
    primaryButtonEnabled,
    secondaryButtonText,
    secondaryButtonTarget,
    secondaryButtonEnabled,
    autoCurve,
    curveStyle,
    steps,
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

  getWorkflowContent: async () => {
    try {
      const raw = await systemConfigRepo.getSetting(WORKFLOW_SETTINGS_KEY);
      if (!raw) {
        return { ...DEFAULT_WORKFLOW_CONTENT };
      }
      const parsed = JSON.parse(raw);
      return sanitizeWorkflowContent(parsed);
    } catch (err) {
      console.error("[landingContentRepo] getWorkflowContent error:", err);
      return { ...DEFAULT_WORKFLOW_CONTENT };
    }
  },

  updateWorkflowContent: async (content) => {
    const sanitized = sanitizeWorkflowContent(content);
    await systemConfigRepo.setSetting(WORKFLOW_SETTINGS_KEY, JSON.stringify(sanitized));
    return sanitized;
  },

  resetWorkflowContent: async () => {
    await systemConfigRepo.setSetting(WORKFLOW_SETTINGS_KEY, JSON.stringify(DEFAULT_WORKFLOW_CONTENT));
    return { ...DEFAULT_WORKFLOW_CONTENT };
  },

  getCatalogContent: async () => {
    try {
      const raw = await systemConfigRepo.getSetting(CATALOG_SETTINGS_KEY);
      if (!raw) {
        return { ...DEFAULT_CATALOG_CONTENT };
      }
      const parsed = JSON.parse(raw);
      return sanitizeCatalogContent(parsed);
    } catch (err) {
      console.error("[landingContentRepo] getCatalogContent error:", err);
      return { ...DEFAULT_CATALOG_CONTENT };
    }
  },

  updateCatalogContent: async (content) => {
    const sanitized = sanitizeCatalogContent(content);
    await systemConfigRepo.setSetting(CATALOG_SETTINGS_KEY, JSON.stringify(sanitized));
    return sanitized;
  },

  resetCatalogContent: async () => {
    await systemConfigRepo.setSetting(CATALOG_SETTINGS_KEY, JSON.stringify(DEFAULT_CATALOG_CONTENT));
    return { ...DEFAULT_CATALOG_CONTENT };
  },

  getFaqContent: async () => {
    try {
      const raw = await systemConfigRepo.getSetting(FAQ_SETTINGS_KEY);
      if (!raw) {
        return { ...DEFAULT_FAQ_CONTENT };
      }
      const parsed = JSON.parse(raw);
      return sanitizeFaqContent(parsed);
    } catch (err) {
      console.error("[landingContentRepo] getFaqContent error:", err);
      return { ...DEFAULT_FAQ_CONTENT };
    }
  },

  updateFaqContent: async (content) => {
    const sanitized = sanitizeFaqContent(content);
    await systemConfigRepo.setSetting(FAQ_SETTINGS_KEY, JSON.stringify(sanitized));
    return sanitized;
  },

  resetFaqContent: async () => {
    await systemConfigRepo.setSetting(FAQ_SETTINGS_KEY, JSON.stringify(DEFAULT_FAQ_CONTENT));
    return { ...DEFAULT_FAQ_CONTENT };
  },
};

const CATALOG_SETTINGS_KEY = "landing_catalog_content";

export const DEFAULT_CATALOG_CONTENT = {
  eyebrow: "Official University Credentials",
  heading: "Academic Document Catalog",
  description:
    "Explore authentic credentials, university clearance protocols, and official registrar records issued by the University.",
  badgeText: "Official Credential",
  primaryButtonText: "Request Credential",
  primaryButtonLink: "/login",
  primaryButtonEnabled: true,
  dragHint: "Drag or click document to inspect",
  items: [
    {
      id: "tor",
      code: "TOR",
      title: "Transcript of Records",
      category: "transcripts",
      client: "Student & Alumni",
      description:
        "Official comprehensive academic transcript for employment, PRC board examinations, and graduate studies.",
      requirements: [
        "2x2 Formal Photo (White Background, Nametag)",
        "University Clearance Form (Fully Signed)",
        "Documentary Stamp (BIR Compliant)",
      ],
      previewStyle: "tor",
      sealTag: "REGISTRAR SEAL VERIFIED",
    },
    {
      id: "cog",
      code: "COG",
      title: "Certificate of Grades",
      category: "transcripts",
      client: "Enrolled Students",
      description:
        "Certified summary of semester grades requested for scholarships, employer tuition subsidies, and academic evaluation.",
      requirements: [
        "Current Student ID or SIS Portal Profile Printout",
        "Specific Academic Year & Semester Identification",
      ],
      previewStyle: "cog",
      sealTag: "Registrar Certified",
    },
    {
      id: "cor",
      code: "COR",
      title: "Certificate of Registration",
      category: "certs",
      client: "Enrolled Students",
      description:
        "Official certification of enrollment status for student discounts, government aid, and passport/visa requirements.",
      requirements: [
        "Validated Assessment Form / Enrollment Proof",
        "Current Semester Course Load Details",
      ],
      previewStyle: "cor",
      sealTag: "Assessed & Cleared",
    },
    {
      id: "ctc",
      code: "HD",
      title: "Honorable Dismissal",
      category: "clearances",
      client: "Transferees",
      description:
        "Formal Certificate of Transfer Credential certifying official release from PUP to transfer to another institution.",
      requirements: [
        "Comprehensive Campus University Clearance",
        "Surrender of PUP Student ID Card",
        "Parent / Guardian Consent Form (If Minor)",
      ],
      previewStyle: "ctc",
      sealTag: "Release Approved",
    },
    {
      id: "moral",
      code: "GMC",
      title: "Good Moral Character",
      category: "certs",
      client: "Student & Alumni",
      description:
        "Issued in coordination with OSAS certifying zero pending disciplinary infractions during university residency.",
      requirements: [
        "OSAS Disciplinary Clearance Slip",
        "Valid Student ID or Government ID Card",
      ],
      previewStyle: "moral",
      sealTag: "Cleared",
    },
    {
      id: "diploma",
      code: "DIP-2",
      title: "Second Copy of Diploma",
      category: "clearances",
      client: "Alumni Only",
      description:
        "Official replacement graduation diploma reissued after verified destruction or loss of the original parchment.",
      requirements: [
        "Notarized Affidavit of Loss / Damage",
        "Copy of Official Certificate of Graduation",
        "Board of Regents Formal Verification",
      ],
      previewStyle: "diploma",
      sealTag: "Gold Seal Certified",
    },
    {
      id: "cav",
      code: "CAV",
      title: "CAV (DFA Apostille / Abroad)",
      category: "certs",
      client: "Graduates & Alumni",
      description:
        "Certification, Authentication, and Verification endorsed directly to DFA and CHED for international credential recognition.",
      requirements: [
        "Certified True Copies of TOR and Diploma",
        "Passport Identification Copy (Full Legal Name)",
        "CHED / Red Ribbon Endorsement Checklist",
      ],
      previewStyle: "cav",
      sealTag: "Apostille Cleared",
    },
    {
      id: "certified_copy",
      code: "CTC",
      title: "Certified True Copy",
      category: "transcripts",
      client: "Student & Alumni",
      description:
        "Official Registrar dry seal and verification stamp placed on original photocopies of university academic records.",
      requirements: [
        "Original Document for Verification Presentation",
        "Clear Photocopy for Dry Seal Stamping",
      ],
      previewStyle: "certified_copy",
      sealTag: "CERTIFIED TRUE COPY",
    },
  ],
};

export const MAX_CATALOG_ITEMS = 8;
export const MIN_CATALOG_ITEMS = 2;

function sanitizeCatalogContent(raw) {
  if (!raw || typeof raw !== "object") {
    return { ...DEFAULT_CATALOG_CONTENT };
  }

  const def = DEFAULT_CATALOG_CONTENT;

  const eyebrow = typeof raw.eyebrow === "string" ? raw.eyebrow.trim() : def.eyebrow;
  const heading = typeof raw.heading === "string" && raw.heading.trim() !== "" ? raw.heading.trim() : def.heading;
  const description = typeof raw.description === "string" && raw.description.trim() !== "" ? raw.description.trim() : def.description;
  const badgeText = typeof raw.badgeText === "string" && raw.badgeText.trim() !== "" ? raw.badgeText.trim() : def.badgeText;

  const primaryButtonText = typeof raw.primaryButtonText === "string" && raw.primaryButtonText.trim() !== "" ? raw.primaryButtonText.trim() : def.primaryButtonText;
  const primaryButtonLink = typeof raw.primaryButtonLink === "string" && raw.primaryButtonLink.trim() !== "" ? raw.primaryButtonLink.trim() : def.primaryButtonLink;
  const primaryButtonEnabled = raw.primaryButtonEnabled !== false;
  const dragHint = typeof raw.dragHint === "string" && raw.dragHint.trim() !== "" ? raw.dragHint.trim() : def.dragHint;

  const rawItemsArray = Array.isArray(raw.items) ? raw.items.slice(0, MAX_CATALOG_ITEMS) : [];

  const items = rawItemsArray.length >= MIN_CATALOG_ITEMS
    ? rawItemsArray.map((item, idx) => {
        const defaultItem = def.items[idx] || {};
        const id = typeof item?.id === "string" && item.id.trim() !== ""
          ? item.id.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "_")
          : defaultItem.id || `doc_${idx + 1}`;
        const code = typeof item?.code === "string" && item.code.trim() !== ""
          ? item.code.trim().toUpperCase()
          : defaultItem.code || `DOC-${idx + 1}`;
        const title = typeof item?.title === "string" && item.title.trim() !== ""
          ? item.title.trim()
          : defaultItem.title || `Document ${idx + 1}`;
        const category = typeof item?.category === "string" && item.category.trim() !== ""
          ? item.category.trim()
          : defaultItem.category || "transcripts";
        const client = typeof item?.client === "string" && item.client.trim() !== ""
          ? item.client.trim()
          : defaultItem.client || "Student & Alumni";
        const desc = typeof item?.description === "string" && item.description.trim() !== ""
          ? item.description.trim()
          : defaultItem.description || "Official university academic record.";

        let requirements = [];
        if (Array.isArray(item?.requirements)) {
          requirements = item.requirements
            .map((r) => (typeof r === "string" ? r.trim() : ""))
            .filter((r) => r.length > 0);
        } else if (typeof item?.requirements === "string") {
          requirements = item.requirements.split("\n").map((r) => r.trim()).filter((r) => r.length > 0);
        } else if (Array.isArray(defaultItem.requirements)) {
          requirements = defaultItem.requirements;
        }
        if (requirements.length === 0) {
          requirements = ["Valid Student ID or Government Issued ID"];
        }

        const previewStyle = typeof item?.previewStyle === "string" && item.previewStyle.trim() !== ""
          ? item.previewStyle.trim()
          : defaultItem.previewStyle || id;
        const sealTag = typeof item?.sealTag === "string" && item.sealTag.trim() !== ""
          ? item.sealTag.trim()
          : defaultItem.sealTag || "REGISTRAR SEAL VERIFIED";

        return {
          id,
          code,
          title,
          category,
          client,
          description: desc,
          requirements,
          previewStyle,
          sealTag,
        };
      })
    : def.items;

  return {
    eyebrow,
    heading,
    description,
    badgeText,
    primaryButtonText,
    primaryButtonLink,
    primaryButtonEnabled,
    dragHint,
    items,
  };
}

export const FAQ_SETTINGS_KEY = "landing_faq_content";

export const DEFAULT_FAQ_CONTENT = {
  eyebrow: "Clear & Direct University Guidelines",
  heading: "Frequently Asked Questions",
  description:
    "Quick answers on requesting, tracking, and claiming your official school records.",
  supportCardEnabled: false,
  supportTitle: "",
  supportDescription: "",
  supportButtonText: "",
  supportButtonLink: "#",
  supportLocation: "",
  faqs: [
    {
      id: "how-to-request",
      q: "How do I request my school records?",
      a: "Log in with your Student Number, choose the document you need (like your TOR, grades, or diploma), and submit your request online. No paper forms needed.",
      category: "Requests",
    },
    {
      id: "forgot-student-number",
      q: "I forgot my student number. Can I still request?",
      a: "Yes! You can skip the student number and enter your full name, course, and years attended. Our staff will find your file in the records archive.",
      category: "Requests",
    },
    {
      id: "processing-time",
      q: "How long does it take to process my request?",
      a: "Regular certificates take 3 working days. Clearances take 7 days, and full transcripts (TOR) take up to 20 days. You will be notified when it is ready for pickup.",
      category: "Processing",
    },
    {
      id: "representative-pickup",
      q: "Can someone else pick up my document for me?",
      a: "Yes. They just need to bring: (1) an authorization letter signed by you, (2) a copy of your valid ID, and (3) their own valid ID.",
      category: "Pickup",
    },
    {
      id: "cutoff-time",
      q: "What time does daily evaluation cut off?",
      a: "Cut-off is 3:00 PM on weekdays (Monday to Friday). Requests submitted after 3:00 PM are evaluated the next working morning.",
      category: "Processing",
    },
    {
      id: "claiming-deadline",
      q: "How long do I have to claim my document?",
      a: "Please claim your document within 90 days after notification. Unclaimed documents are safely disposed of after 90 days to protect your privacy.",
      category: "Pickup",
    },
  ],
};

export const MAX_FAQ_ITEMS = 16;
export const MIN_FAQ_ITEMS = 2;

function sanitizeFaqContent(raw) {
  if (!raw || typeof raw !== "object") {
    return { ...DEFAULT_FAQ_CONTENT };
  }

  const def = DEFAULT_FAQ_CONTENT;

  const eyebrow = typeof raw.eyebrow === "string" ? raw.eyebrow.trim() : def.eyebrow;
  const heading =
    typeof raw.heading === "string" && raw.heading.trim() !== ""
      ? raw.heading.trim()
      : def.heading;
  const description =
    typeof raw.description === "string" && raw.description.trim() !== ""
      ? raw.description.trim()
      : def.description;

  const supportCardEnabled = false;
  const supportTitle =
    typeof raw.supportTitle === "string" && raw.supportTitle.trim() !== ""
      ? raw.supportTitle.trim()
      : def.supportTitle;
  const supportDescription =
    typeof raw.supportDescription === "string" && raw.supportDescription.trim() !== ""
      ? raw.supportDescription.trim()
      : def.supportDescription;
  const supportButtonText =
    typeof raw.supportButtonText === "string" && raw.supportButtonText.trim() !== ""
      ? raw.supportButtonText.trim()
      : def.supportButtonText;
  const supportButtonLink =
    typeof raw.supportButtonLink === "string" && raw.supportButtonLink.trim() !== ""
      ? raw.supportButtonLink.trim()
      : def.supportButtonLink;
  const supportLocation =
    typeof raw.supportLocation === "string" && raw.supportLocation.trim() !== ""
      ? raw.supportLocation.trim()
      : def.supportLocation;

  const rawFaqsArray = Array.isArray(raw.faqs) ? raw.faqs.slice(0, MAX_FAQ_ITEMS) : [];

  const faqs =
    rawFaqsArray.length >= MIN_FAQ_ITEMS
      ? rawFaqsArray.map((item, idx) => {
          const defaultItem = def.faqs[idx] || {};
          const id =
            typeof item?.id === "string" && item.id.trim() !== ""
              ? item.id.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "_")
              : defaultItem.id || `faq_${idx + 1}`;
          const q =
            typeof item?.q === "string" && item.q.trim() !== ""
              ? item.q.trim()
              : defaultItem.q || `Question ${idx + 1}?`;
          const a =
            typeof item?.a === "string" && item.a.trim() !== ""
              ? item.a.trim()
              : defaultItem.a || "Official response from the Registrar's Office.";
          const category =
            typeof item?.category === "string" && item.category.trim() !== ""
              ? item.category.trim()
              : defaultItem.category || "General";

          return {
            id,
            q,
            a,
            category,
          };
        })
      : def.faqs;

  return {
    eyebrow,
    heading,
    description,
    supportCardEnabled,
    supportTitle,
    supportDescription,
    supportButtonText,
    supportButtonLink,
    supportLocation,
    faqs,
  };
}



