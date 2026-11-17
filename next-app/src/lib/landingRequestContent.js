export const DEFAULT_WORKFLOW_CONTENT = {
  eyebrow: "",
  headingLine1: "How to Request",
  headingLine2: "Your Documents",
  description: "Request official documents through eManage, follow updates from the Registrar, and see when your documents are ready to claim.",
  primaryButtonText: "Request a Document",
  primaryButtonLink: "/login",
  primaryButtonEnabled: true,
  secondaryButtonText: "Browse Documents",
  secondaryButtonTarget: "catalog",
  secondaryButtonEnabled: true,
  autoCurve: true,
  curveStyle: "gentle",
  steps: [
    {
      num: "01",
      title: "Find your document",
      desc: "Browse the catalog to find the document you need and check what to prepare before submitting a request.",
      actionLabel: "View Catalog",
      actionType: "scroll",
      actionTarget: "catalog",
    },
    {
      num: "02",
      title: "Sign in to eManage",
      desc: "Sign in with your eManage email and password. Have your student number ready. Alumni who don’t know theirs can enter their academic program.",
    },
    {
      num: "03",
      title: "Submit your request",
      desc: "In Document Requests, choose the document you need, explain what it’s for, and attach any required files before submitting.",
    },
    {
      num: "04",
      title: "Track your request",
      desc: "Open your request to check its status and read the Registrar’s notes. If you see Pending Payment, upload your receipt or payment slip there.",
    },
    {
      num: "05",
      title: "Claim your document",
      desc: "When your request shows Ready for Pickup, open the request details for the location and instructions before visiting the Registrar.",
    },
  ].map((step) => ({
    tags: [],
    actionLabel: "",
    actionType: "none",
    actionTarget: "",
    actionIcon: "",
    ...step,
  })),
};

export const DEFAULT_FAQ_CONTENT = {
  heading: "Frequently Asked Questions",
  description:
    "Quick answers on requesting, tracking, and claiming your official school records.",
  faqs: [
    {
      id: "scanned-records",
      q: "Can I view my scanned student records online?",
      a: "ODRS shows your requests, their status, Registrar instructions, and attachments submitted with the request. Staff-scanned records are stored locally and can only be accessed by authorized staff.",
      category: "Requests",
    },
    {
      id: "parent-request",
      q: "What do parents or guardians need to submit a request?",
      a: "Prepare the student’s number, your full name and relationship to the student, a valid government-issued ID, and an authorization letter or Special Power of Attorney (SPA).",
      category: "Requests",
    },
    {
      id: "how-to-request",
      q: "How do I request my school records?",
      a: "Sign in with your eManage email and password. In Document Requests, choose a document, enter your purpose, and attach any supporting files you need.",
      category: "Requests",
    },
    {
      id: "forgot-student-number",
      q: "I forgot my student number. Can I still request?",
      a: "Alumni can provide their academic program if they no longer know their student number. Current students and parents or guardians need the student number for the record they are requesting.",
      category: "Requests",
    },
    {
      id: "processing-time",
      q: "How long does it take to process my request?",
      a: "Processing depends on the document and whether the Registrar needs additional requirements or payment verification. Check your request details for updates.",
      category: "Processing",
    },
  ],
};

