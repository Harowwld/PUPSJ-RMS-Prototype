"use client";

import StudentNotifications from "@/components/student/StudentNotifications";
import { MISSING_DOCUMENTS_INQUIRY } from "@/lib/missingDocumentsInquiry";

import { orderRowsByGroup } from "@/lib/groupRows";
import InitialDashboardLoader from "@/components/shared/InitialDashboardLoader";
import useWorkspaceViewPreference from "@/hooks/useWorkspaceViewPreference";
import TablePagination from "@/components/shared/TablePagination";
import CopyButton from "@/components/shared/CopyButton";
import DocumentRequestTimeline from "@/components/shared/DocumentRequestTimeline";
import SheetEvaluationTimeline from "@/components/shared/SheetEvaluationTimeline";
import SheetSectionHeading from "@/components/shared/SheetSectionHeading";
import SheetPagination from "@/components/shared/SheetPagination";
import { PDF_ACTION_LABELS } from "@/lib/pdfPreview";
import { Textarea } from "@/components/ui/textarea";


import useUrlPage from "@/hooks/useUrlPage";
import { useCallback, useEffect, useState, useMemo, useRef, Suspense, Fragment } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion, useIsPresent } from "framer-motion";
import { EASE_OUT, useAppReducedMotion } from "@/lib/motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import OsasOrganizationSwitcher, { OrganizationAvatar, organizationName } from "@/components/student/OsasOrganizationSwitcher";
import { toast } from "sonner";
import { formatErrorMessage } from "@/lib/errorUtils";
import Sidebar from "@/components/shared/Sidebar";
import MyActivityPanel from "@/components/shared/MyActivityPanel";
import AccountSettingsPanel from "@/components/shared/AccountSettingsPanel";
import { useLayoutZoom } from "@/hooks/useLayoutZoom";
import { formatManilaCalendarDate, formatPHDateTime, formatRelativeTime, isFutureManilaCalendarDate, isInManilaDateRange } from "@/lib/timeFormat";
import { Card } from "@/components/ui/card";
import PageHeader from "@/components/shared/PageHeader";
import { RefreshButton } from "@/components/shared/RefreshButton";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { Select } from "@/components/ui/select";
import { SegmentedControl } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { COMPACT_BADGE_BASE, BADGE_BASE, BADGE_PALETTES, SETTINGS_DOT_CHECK, SETTINGS_STATUS_PILL_SM } from "@/lib/badgeStyles";
import { authFetch, getClientSession, invalidateClientSession } from "@/lib/clientAuth";
import { canAccessPage } from "@/lib/roleUtils";
import { PhoneSchema, StudentNoSchema } from "@/lib/validationSchemas";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyMedia,
  EmptyState,
  EmptyContent,
} from "@/components/ui/empty";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import PDFPreviewModal from "@/components/shared/PDFPreviewModal";
import {
  StudentDashboardSkeleton,
  StudentRequestsTableRowsSkeleton,
  StudentRequestsPaginationSkeleton,
  StudentOsasProposalsListSkeleton,
} from "@/components/student/skeletons";
import MissingDocumentsInquiryDialog from "@/components/student/MissingDocumentsInquiryDialog";
import PortalAccountSetupDialog from "@/components/student/PortalAccountSetupDialog";
import StudentComplianceTab from "@/components/student/StudentComplianceTab";
import StudentOverviewTab from "@/components/student/StudentOverviewTab";
import RequestFeedbackCard from "@/components/student/RequestFeedbackCard";
import CampusStatusNotice from "@/components/student/CampusStatusNotice";
import DataGroupHeader from "@/components/shared/DataGroupHeader";
import StudentFeedbackModal from "@/components/student/StudentFeedbackModal";
import StudentSidebarFeedbackCard from "@/components/student/StudentSidebarFeedbackCard";
import NarrativeText, { NarrativePersonBadge, resolveUserDisplayName } from "@/components/shared/NarrativeText";
import { Skeleton } from "@/components/ui/skeleton";
import DashboardSearch from "@/components/shared/DashboardSearch";
import {
  FilterPopover,
  SortPopover,
  GroupPopover,
} from "@/components/systemadmin/OfficeTableControls";
import { DateRangeFilterButton } from "@/components/shared/DateRangePickerModal";
import { formatDateIso, parseDateLocal } from "@/lib/dateRangeUtils";
import { format } from "date-fns";
import MultiCriteriaFilter from "@/components/shared/MultiCriteriaFilter";
import ActiveFilterChips from "@/components/shared/ActiveFilterChips";
import { ContentSwap } from "@/components/ui/motion";
import { postEventFileLabels, validatePostEventRevision } from "@/lib/osasPostEventWorkflow";
import SheetAttachmentRow from "@/components/shared/SheetAttachmentRow";
import RequestCorrectionsSection from "@/components/student/RequestCorrectionsSection";
import FileAttachmentDropzone, { AttachmentViews } from "@/components/shared/FileAttachmentDropzone";
import DataViewToolbar from "@/components/shared/DataViewToolbar";
import { useTablePreferences } from "@/components/shared/TablePreferences";
import { getListDensityClasses } from "@/lib/tablePresentation";
import { BookOpen01Icon as EmptyBookOpen01Icon, ClipboardIcon as EmptyClipboardIcon, File02Icon as EmptyFile02Icon, InboxIcon as EmptyInboxIcon, Search01Icon as EmptySearch01Icon, AddCircleIcon, Alert01Icon, ArrowDown01Icon, ArrowUpRight01Icon, Attachment01Icon, BookBookmark01Icon, Building01Icon, Calendar01Icon, CalendarCheckIn01Icon, Cancel01Icon, Clock01Icon, Loading01Icon, StarIcon, Tick01Icon, Time01Icon, ViewIcon, Search01Icon, ClipboardIcon, File02Icon, BookOpen01Icon } from "hugeicons-react";
import { getRequestAffiliation, STUDENT_AFFILIATIONS } from "@/lib/studentAffiliation";
import AppIcon from "@/components/ui/app-icon";
const RATING_LABELS = {
  1: "Poor",
  2: "Fair",
  3: "Satisfactory",
  4: "Very Good",
  5: "Excellent",
};

const STUDENT_VIEWS = ["overview", "odrs", "osas", "compliance", "activity", "settings", "notifications"];

function normalizeStudentTab(rawView) {
  if (rawView === "default") return "overview";
  if (rawView === "requests") return "odrs";
  return STUDENT_VIEWS.includes(rawView) ? rawView : null;
}

export function normalizeProposalStatus(status) {
  const s = String(status || "").toLowerCase().trim();
  if (s === "submitted" || s === "pending") return "Submitted";
  if (s === "under review" || s === "underreview" || s === "inprogress" || s === "processing") return "Under Review";
  if (s === "needs revision" || s === "revisionsrequested" || s === "revision") return "Needs Revision";
  if (s === "approved" || s === "completed" || s === "ready") return "Approved";
  if (s === "declined" || s === "rejected" || s === "cancelled") return "Declined";
  if (s === "archived") return "Archived";
  return status || "";
}

function formatProposalEventDate(value) {
  const date = parseDateLocal(String(value || "").slice(0, 10));
  return date ? format(date, "MMM d, yyyy") : "To Be Announced";
}

function StatusBadge({ status, compact = false }) {
  const s = String(status || "").toLowerCase().trim();
  let palette = BADGE_PALETTES.gray;
  let label = status;

  if (s === "approved") {
    palette = BADGE_PALETTES.emerald;
    label = "Approved";
  } else if (s === "cleared") {
    palette = BADGE_PALETTES.emerald;
    label = "Cleared";
  } else if (s === "completed") {
    palette = BADGE_PALETTES.emerald;
    label = "Completed";
  } else if (s === "ready") {
    palette = BADGE_PALETTES.sky;
    label = "Ready";
  } else if (s === "under review") {
    palette = BADGE_PALETTES.blue;
    label = "Under Review";
  } else if (s === "inprogress" || s === "in progress") {
    palette = BADGE_PALETTES.blue;
    label = "In Progress";
  } else if (s === "processing") {
    palette = BADGE_PALETTES.blue;
    label = "Processing";
  } else if (s === "deficient") {
    palette = BADGE_PALETTES.amber;
    label = "Action Required";
  } else if (s === "pendingpayment") {
    palette = BADGE_PALETTES.amber;
    label = "Pending Payment";
  } else if (s === "needs revision" || s === "revision") {
    palette = BADGE_PALETTES.orange;
    label = "Needs Revision";
  } else if (s === "submitted") {
    palette = BADGE_PALETTES.amber;
    label = "Submitted";
  } else if (s === "pending") {
    palette = BADGE_PALETTES.amber;
    label = "Pending";
  } else if (s === "declined") {
    palette = BADGE_PALETTES.rose;
    label = "Declined";
  } else if (s === "cancelled") {
    palette = BADGE_PALETTES.zinc;
    label = "Cancelled";
  } else if (s === "rejected") {
    palette = BADGE_PALETTES.rose;
    label = "Rejected";
  } else if (s === "superseded") {
    palette = BADGE_PALETTES.zinc;
    label = "Superseded";
  }

  return (
    <span className={cn(compact ? COMPACT_BADGE_BASE : BADGE_BASE, palette)}>
      {label}
    </span>
  );
}

/**
 * Standard Information Row (label : value)
 * Clean unboxed metadata layout aligned with colons and icons.
 */
function InfoRow({ icon, label, value, children, className }) {
  return (
    <div
      className={cn(
        "grid grid-cols-[135px_12px_1fr] sm:grid-cols-[150px_14px_1fr] items-start gap-1 text-xs py-1.5 border-b border-gray-100/70 dark:border-zinc-800/50 last:border-0",
        className
      )}
    >
      <div className="text-gray-500 dark:text-zinc-400 font-medium flex items-center gap-2 truncate">
        {icon && (
          <AppIcon icon={icon} aria-hidden="true" className="text-gray-400 dark:text-zinc-500 text-sm shrink-0" />
        )}
        <span className="truncate">{label}</span>
      </div>
      <span className="text-gray-300 dark:text-zinc-600 select-none">:</span>
      <div className="text-gray-900 dark:text-zinc-100 font-semibold break-words min-w-0">
        {children ?? (value || <span className="text-gray-400 font-normal italic">None</span>)}
      </div>
    </div>
  );
}

function formatRequestReference(id) {
  return id == null ? "" : `REQ-${id}`;
}

function SheetReferenceRow({ label, reference, icon = "IdIcon" }) {
  return (
    <InfoRow icon={icon} label={label}>
      {reference && (
        <div className="flex items-center gap-2">
          <span className="tabular-nums">{reference}</span>
          <CopyButton iconOnly variant="ghost" entityName={label} textToCopy={reference} />
        </div>
      )}
    </InfoRow>
  );
}

function SheetUpdateCount({ count }) {
  return (
    <Badge variant="gray" size="compact" className="tabular-nums">
      <Time01Icon size={12} aria-hidden="true" />
      {count} {count === 1 ? "update" : "updates"}
    </Badge>
  );
}

const REQUEST_STATUS_NOTICES = {
  pending: { tone: "info", title: "Under Review", message: "Your request is queued for verification by the Office of the Campus Registrar." },
  underreview: { tone: "info", title: "Under Review", message: "The Office of the Campus Registrar is reviewing your request." },
  pendingpayment: { tone: "warning", title: "Payment Slip Required", message: "Upload your official receipt or payment slip below so the Registrar can prepare your document." },
  deficient: { tone: "warning", title: "Action Required", message: "Review the Registrar’s feedback for the missing or incomplete requirements." },
  inprogress: { tone: "info", title: "Processing In Progress", message: "Registrar staff are preparing and authenticating your document." },
  ready: { tone: "success", title: "Ready for Claiming", message: "Check your pickup instructions before visiting the Registrar." },
  completed: { tone: "success", title: "Request Completed", message: "Your document was claimed and recorded in the University Archives." },
  cancelled: { tone: "danger", title: "Request Cancelled", message: "This request is closed. Check the processing timeline for details." },
  declined: { tone: "danger", title: "Request Declined", message: "Check the processing timeline for the Registrar’s decision." },
  rejected: { tone: "danger", title: "Request Rejected", message: "Check the processing timeline for the Registrar’s decision." },
  shredded: { tone: "info", title: "Document Disposed", message: "The unclaimed document is no longer available for pickup." },
};

const PROPOSAL_SUBMISSION_UPDATE = /^((?:Event proposal|Revised proposal \(Revision \d+\)) submitted by) (.+?) \(([^()]+)\)\.?$/i;

function ProposalSubmissionNarrative({ submission, name, user }) {
  const [, introduction, position, submitter] = submission;
  const isCurrentUser = submitter.toLowerCase() === user?.email?.toLowerCase();
  const displayName = resolveUserDisplayName(name || (isCurrentUser ? user?.name : "") || submitter);

  return (
    <>
      {introduction} <strong className="font-bold">{position}</strong>{" "}
      <NarrativePersonBadge
        name={displayName}
        avatarId={isCurrentUser ? user.student_no || user.id : submitter}
        avatarFilename={isCurrentUser ? user.avatar_filename : undefined}
      />.
    </>
  );
}

const PROPOSAL_STATUS_NOTICES = {
  Approved: { tone: "success", title: "Proposal Approved", message: "OSAS has cleared your event proposal." },
  "Needs Revision": { tone: "warning", title: "Revision Required", message: "Review the evaluator notes and upload a revised proposal." },
  Declined: { tone: "danger", title: "Proposal Declined", message: "OSAS did not approve this event proposal." },
};

const POST_EVENT_STATUS_NOTICES = {
  Submitted: { tone: "info", title: "Post-Event Report Submitted", message: "Your report is awaiting OSAS review." },
  "Under Review": { tone: "info", title: "Under OSAS Review", message: "OSAS is reviewing your report and liquidation documents." },
  "Needs Revision": { tone: "warning", title: "Revision Required", message: "Review the evaluator notes and resubmit your post-event report." },
  Cleared: { tone: "success", title: "Post-Event Report Cleared", message: "OSAS cleared the narrative and liquidation report." },
  Declined: { tone: "danger", title: "Post-Event Report Declined", message: "OSAS declined this post-event report." },
};

const CBL_STATUS_NOTICES = {
  Pending: { tone: "info", title: "Pending OSAS Review", message: "This charter submission is awaiting review." },
  Approved: { tone: "success", title: "Charter Approved", message: "OSAS approved this Constitution & By-Laws version." },
  "Needs Revision": { tone: "warning", title: "Revision Required", message: "Review the evaluator notes and upload a revised charter." },
  Declined: { tone: "danger", title: "Charter Declined", message: "OSAS declined this charter version." },
  Superseded: { tone: "info", title: "Charter Superseded", message: "A newer approved charter version has replaced this submission." },
};

function ExpandablePanel({ children, id, reduceMotion, contentClassName = "border-b border-border" }) {
  const isPresent = useIsPresent();

  return (
    <motion.div
      inert={!isPresent}
      initial={reduceMotion ? false : { height: 0, opacity: 0, overflow: "hidden" }}
      animate={{ height: "auto", opacity: 1, transitionEnd: { overflow: "visible" } }}
      exit={{ height: 0, opacity: 0, overflow: "hidden" }}
      transition={{ duration: reduceMotion ? 0 : 0.22, ease: EASE_OUT }}
      className="bg-gray-50/40 dark:bg-zinc-900/20"
    >
      <div id={id} className={contentClassName}>{children}</div>
    </motion.div>
  );
}

function StudentHistoryLoadError({ title, onRetry, loading }) {
  return (
    <EmptyState
      icon={Alert01Icon}
      title={title}
      description="Try loading the history again."
    >
      <Button variant="outline" size="sm" onClick={onRetry} disabled={loading}>
        Try Again
      </Button>
    </EmptyState>
  );
}

function StudentDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [me, setMe] = useState(null);
  const reduceMotion = useAppReducedMotion(me?.id);
  const authUser = me;

  useEffect(() => {
    const handlePreferencesChanged = (e) => {
      if (e?.detail?.preferences) {
        setMe((prev) =>
          prev ? { ...prev, preferences: { ...(prev.preferences || {}), ...e.detail.preferences } } : prev
        );
      }
    };
    const handleAvatarChanged = (e) => {
      if (e?.detail && "avatar_filename" in e.detail) {
        setMe((prev) => (prev ? { ...prev, avatar_filename: e.detail.avatar_filename } : prev));
      }
    };
    window.addEventListener("user-preferences-changed", handlePreferencesChanged);
    window.addEventListener("avatar-changed", handleAvatarChanged);
    return () => {
      window.removeEventListener("user-preferences-changed", handlePreferencesChanged);
      window.removeEventListener("avatar-changed", handleAvatarChanged);
    };
  }, []);
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [requestLoadFailed, setRequestLoadFailed] = useState(false);
  const [proposalLoadFailed, setProposalLoadFailed] = useState(false);
  const [postEventLoadFailed, setPostEventLoadFailed] = useState(false);
  const [data, setData] = useState({ requests: [], proposals: [] });
  const [docTypes, setDocTypes] = useState([]);
  const [courses, setCourses] = useState([]);
  const [requestAttempted, setRequestAttempted] = useState(false);
  const [requestForm, setRequestForm] = useState({
    studentNo: "",
    docType: "",
    notes: "",
    clientType: "Student",
    courseCode: "",
    requesterName: "",
    requesterRelationship: "",
    requesterContact: "",
    attachments: [],
  });
  const [proposalAttempted, setProposalAttempted] = useState(false);
  const [postEventAttempted, setPostEventAttempted] = useState(false);
  const [cblAttempted, setCblAttempted] = useState(false);
  const [proposalForm, setProposalForm] = useState({ title: "", eventDate: "", file: null });
  const [eventDatePickerOpen, setEventDatePickerOpen] = useState(false);
  const proposalToday = formatManilaCalendarDate(new Date());
  const proposalDateInvalid = Boolean(proposalForm.eventDate) && proposalForm.eventDate <= proposalToday;
  const osasRevisionFormTarget = useRef(null);
  const [revisionTargetProposal, setRevisionTargetProposal] = useState(null);
  const [myOrganizations, setMyOrganizations] = useState([]);
  const [selectedOsasOrgId, setSelectedOsasOrgId] = useState("");
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [requestedView, setView] = useState(() => normalizeStudentTab(searchParams?.get("view")) || "overview");
  const isParentAccount = me?.client_type === "Parent";
  const [inquiryOpen, setInquiryOpen] = useState(false);
  const canUseStudentModules = me?.client_type === "Student" && me.portal_setup_complete !== false;
  const view = me && !canUseStudentModules && ["compliance", "osas"].includes(requestedView) ? "odrs" : requestedView;
  const [complianceData, setComplianceData] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [requestSubmitting, setRequestSubmitting] = useState(false);
  const [paymentUploadRequestId, setPaymentUploadRequestId] = useState(null);
  const [pendingPaymentProof, setPendingPaymentProof] = useState(null);
  const [removingAttachmentId, setRemovingAttachmentId] = useState(null);
  const [proposalSubmitting, setProposalSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const attachmentInputRef = useRef(null);

  // Request history list state
  const [requestSearch, setRequestSearch] = useState("");
  const [requestFilters, setRequestFilters] = useState({
    status: [],
    doc_type: [],
  });
  const [requestFilterRules, setRequestFilterRules] = useWorkspaceViewPreference("student_requests", "filterRules", [], { user: me });
  const [requestGroupBy, setRequestGroupBy] = useWorkspaceViewPreference("student_requests", "groupBy", "none", { user: me });
  const { density } = useTablePreferences();
  const requestListDensity = getListDensityClasses(density);
  const [collapsedRequestGroups, setCollapsedRequestGroups] = useState({});
  const toggleRequestGroup = (key) => {
    setCollapsedRequestGroups((previous) => ({ ...previous, [key]: !previous[key] }));
  };
  const [requestStartDate, setRequestStartDate] = useState("");
  const [requestEndDate, setRequestEndDate] = useState("");
  const [sortBy, setSortBy] = useWorkspaceViewPreference("student_requests", "sortBy", "created_at", { user: me });
  const [sortOrder, setSortOrder] = useWorkspaceViewPreference("student_requests", "sortOrder", "DESC", { user: me });
  const [currentPage, setCurrentPage] = useUrlPage({ enabled: view === "odrs" });
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedRequestForDetail, setSelectedRequestForDetail] = useState(null);
  const [correctionUploading, setCorrectionUploading] = useState(false);
  const correctionUploadLock = useRef(false);
  const [selectedProposalForDetail, setSelectedProposalForDetail] = useState(null);
  const [selectedPostEventReportForDetail, setSelectedPostEventReportForDetail] = useState(null);
  const [postEventTimeline, setPostEventTimeline] = useState(null);
  const selectedPostEventReportId = selectedPostEventReportForDetail?.id;
  const reportTimeline = postEventTimeline?.reportId === selectedPostEventReportId ? postEventTimeline : null;

  useEffect(() => {
    if (!selectedPostEventReportId) return;
    const controller = new AbortController();

    async function loadTimeline() {
      try {
        const res = await fetch(`/api/student/post-event-reports/${selectedPostEventReportId}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const json = await res.json();
        if (!res.ok || !json.ok) throw new Error("Could not load the post-event timeline.");
        if (!controller.signal.aborted) {
          setPostEventTimeline({ reportId: selectedPostEventReportId, updates: json.data.updates });
        }
      } catch {
        if (!controller.signal.aborted) {
          setPostEventTimeline({ reportId: selectedPostEventReportId, failed: true });
        }
      }
    }

    void loadTimeline();
    return () => controller.abort();
  }, [selectedPostEventReportId]);

  const [selectedCblVersionForDetail, setSelectedCblVersionForDetail] = useState(null);

  // Proposals Table & Filter state
  const [proposalFilterRules, setProposalFilterRules] = useWorkspaceViewPreference("student_proposals", "filterRules", [], { user: me });
  const [proposalSortBy, setProposalSortBy] = useWorkspaceViewPreference("student_proposals", "sortBy", "created_at", { user: me });
  const [proposalSortOrder, setProposalSortOrder] = useWorkspaceViewPreference("student_proposals", "sortOrder", "DESC", { user: me });
  const [proposalGroupBy, setProposalGroupBy] = useWorkspaceViewPreference("student_proposals", "groupBy", "none", { user: me });
  const [proposalStartDate, setProposalStartDate] = useState("");
  const [proposalEndDate, setProposalEndDate] = useState("");

  // Post-Event Reports Table & Filter state
  const [postEventSearch, setPostEventSearch] = useState("");
  const [postEventFilterRules, setPostEventFilterRules] = useWorkspaceViewPreference("student_post_events", "filterRules", [], { user: me });
  const [postEventSortBy, setPostEventSortBy] = useWorkspaceViewPreference("student_post_events", "sortBy", "created_at", { user: me });
  const [postEventSortOrder, setPostEventSortOrder] = useWorkspaceViewPreference("student_post_events", "sortOrder", "DESC", { user: me });
  const [postEventGroupBy, setPostEventGroupBy] = useWorkspaceViewPreference("student_post_events", "groupBy", "none", { user: me });
  const [postEventStartDate, setPostEventStartDate] = useState("");
  const [postEventEndDate, setPostEventEndDate] = useState("");

  // CBL Versions Table & Filter state
  const [cblSearch, setCblSearch] = useState("");
  const [cblFilterRules, setCblFilterRules] = useWorkspaceViewPreference("student_cbl", "filterRules", [], { user: me });
  const [cblSortBy, setCblSortBy] = useWorkspaceViewPreference("student_cbl", "sortBy", "created_at", { user: me });
  const [cblSortOrder, setCblSortOrder] = useWorkspaceViewPreference("student_cbl", "sortOrder", "DESC", { user: me });
  const [cblGroupBy, setCblGroupBy] = useWorkspaceViewPreference("student_cbl", "groupBy", "none", { user: me });
  const [cblStartDate, setCblStartDate] = useState("");
  const [cblEndDate, setCblEndDate] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(true);
  const [isDuplicateAlertDismissed, setIsDuplicateAlertDismissed] = useState(() => {
    if (typeof window !== "undefined") {
      return sessionStorage.getItem("pupsj_student_duplicate_ticket_alert_dismissed") === "true";
    }
    return false;
  });

  const handleDismissDuplicateAlert = () => {
    setIsDuplicateAlertDismissed(true);
    try {
      sessionStorage.setItem("pupsj_student_duplicate_ticket_alert_dismissed", "true");
    } catch {}
  };

  const [isPostEventAlertDismissed, setIsPostEventAlertDismissed] = useState(() => {
    if (typeof window !== "undefined") {
      return sessionStorage.getItem("pupsj_student_post_event_alert_dismissed") === "true";
    }
    return false;
  });

  const handleDismissPostEventAlert = () => {
    setIsPostEventAlertDismissed(true);
    try {
      sessionStorage.setItem("pupsj_student_post_event_alert_dismissed", "true");
    } catch {}
  };
  const [pdfPreviewOpen, setPdfPreviewOpen] = useState(false);
  const [pdfPreviewData, setPdfPreviewData] = useState(null);
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [feedbackRequest, setFeedbackRequest] = useState(null);
  const [feedbackInitialRating, setFeedbackInitialRating] = useState(0);
  const [feedbackMinimized, setFeedbackMinimized] = useWorkspaceViewPreference("student_requests", "feedbackMinimized", false, { user: me });
  const canRateSelectedRequest = Boolean(selectedRequestForDetail && !selectedRequestForDetail.feedback);

  function rateSelectedRequest() {
    setFeedbackRequest(selectedRequestForDetail);
    setFeedbackInitialRating(0);
    setFeedbackModalOpen(true);
  }

  // OSAS Multi-Stream Governance States
  const [osasSubView, setOsasSubView] = useWorkspaceViewPreference("student_osas", "activeStream", "proposals", { user: me });
  const [postEventReports, setPostEventReports] = useState([]);
  const [pendingPostEvents, setPendingPostEvents] = useState([]);
  const [postEventForm, setPostEventForm] = useState({
    eventProposalId: "",
    actualAttendance: "",
    totalExpenses: "",
    narrativeFile: null,
    liquidationFile: null,
  });
  const [revisionTargetReport, setRevisionTargetReport] = useState(null);
  const [postEventSubmitting, setPostEventSubmitting] = useState(false);

  // Constitution & By-Laws (CBL) Governance States
  const [cblVersions, setCblVersions] = useState([]);
  const [cblOrgData, setCblOrgData] = useState(null);
  const [cblLoading, setCblLoading] = useState(false);
  const [cblLoadFailed, setCblLoadFailed] = useState(false);
  const cblLoadRequest = useRef(0);
  const [cblForm, setCblForm] = useState({
    versionTag: "",
    amendmentSummary: "",
    file: null,
  });
  const [cblSubmitting, setCblSubmitting] = useState(false);

  const selectedOsasOrganization = myOrganizations.find(
    (org) => String(org.organization_id) === String(selectedOsasOrgId)
  ) || null;
  const organizationProposals = useMemo(
    () => selectedOsasOrgId
      ? (data.proposals || []).filter((proposal) => String(proposal.organization_id) === String(selectedOsasOrgId))
      : [],
    [data.proposals, selectedOsasOrgId]
  );
  const approvedPostEventProposals = organizationProposals.filter((proposal) => proposal.status === "Approved");
  const hasApprovedPostEventProposals = approvedPostEventProposals.length > 0;
  const hasSelectedApprovedProposal = approvedPostEventProposals.some(
    ({ id }) => String(id) === String(postEventForm.eventProposalId)
  );
  const organizationPostEventReports = useMemo(
    () => selectedOsasOrgId
      ? postEventReports.filter((report) => String(report.organization_id) === String(selectedOsasOrgId))
      : [],
    [postEventReports, selectedOsasOrgId]
  );
  const organizationPendingPostEvents = useMemo(
    () => selectedOsasOrgId
      ? pendingPostEvents.filter((event) => String(event.organization_id) === String(selectedOsasOrgId))
      : [],
    [pendingPostEvents, selectedOsasOrgId]
  );
  const selectedProposalStatus = normalizeProposalStatus(selectedProposalForDetail?.status);
  const postEventNotice = POST_EVENT_STATUS_NOTICES[selectedPostEventReportForDetail?.status] ?? POST_EVENT_STATUS_NOTICES.Submitted;
  const cblNotice = CBL_STATUS_NOTICES[selectedCblVersionForDetail?.status] ?? CBL_STATUS_NOTICES.Pending;
  const proposalNotice = PROPOSAL_STATUS_NOTICES[selectedProposalStatus] ?? {
    title: "Under OSAS Evaluation",
    message: "OSAS is reviewing your proposal.",
  };

  // Filter state for OSAS Event Proposals
  const [proposalSearch, setProposalSearch] = useState("");
  const [proposalFilters, setProposalFilters] = useState({
    status: [],
    organization: [],
  });

  const handleOsasOrganizationChange = (organizationId) => {
    setSelectedOsasOrgId(organizationId);
    fetch("/api/auth/preferences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ preferences: { selected_osas_org_id: String(organizationId || "") } }),
    }).then((response) => {
      if (!response.ok) console.error("Failed to save selected OSAS organization preference.");
    }).catch((error) => {
      console.error("Failed to save selected OSAS organization preference:", error);
    });
    setPostEventForm((prev) => ({ ...prev, eventProposalId: "" }));
    setSelectedProposalForDetail(null);
    setProposalFilters((prev) => ({ ...prev, organization: [] }));
    setProposalFilterRules((prev) => prev.filter((rule) => rule.fieldKey !== "organization"));
    setPostEventFilterRules((prev) => prev.filter((rule) => rule.fieldKey !== "organization"));
    setSelectedPostEventReportForDetail(null);
    cblLoadRequest.current += 1;
    setCblLoading(true);
    setCblLoadFailed(false);
    setCblOrgData(null);
    setCblVersions([]);
    setSelectedCblVersionForDetail(null);
  };

  const handleOpenPdfPreview = useCallback((proposal, customOpts = null) => {
    if (customOpts) {
      setPdfPreviewData(customOpts);
      setPdfPreviewOpen(true);
      return;
    }
    if (!proposal?.id) return;
    setPdfPreviewData({
      url: `/api/student/event-proposals/${proposal.id}?file=1`,
      title: proposal.title || proposal.original_filename || "Event Proposal",
      subtitle: `Viewing official event proposal submitted for ${proposal.organization_name || "OSAS"}.`,
      studentName: proposal.student_name || me?.name || "Student",
      docType: "Event Proposal",
      originalFilename: proposal.original_filename || "Proposal.pdf",
    });
    setPdfPreviewOpen(true);
  }, [me, setPdfPreviewData, setPdfPreviewOpen]);

  const { zoomNode, setZoomNode, handleZoomMouseDown, zoomStyle } = useLayoutZoom(me);

  const requestFilterFields = useMemo(() => [
    {
      key: "status",
      label: "Request Status",
      type: "select",
      options: [
        { value: "Pending", label: "Pending" },
        { value: "Deficient", label: "Action Required" },
        { value: "PendingPayment", label: "Pending Payment" },
        { value: "InProgress", label: "In Progress" },
        { value: "Ready", label: "Ready for Pickup" },
        { value: "Completed", label: "Completed" },
        { value: "Cancelled", label: "Cancelled" },
      ],
    },
    {
      key: "doc_type",
      label: "Document Type",
      type: "text",
    },
  ], []);

  const requestSortOptions = useMemo(() => [
    { value: "created_at", label: "Date Requested" },
    { value: "id", label: "Ticket No." },
    { value: "doc_type", label: "Document Type" },
    { value: "status", label: "Status" },
  ], []);

  const requestGroupOptions = useMemo(() => [
    { value: "none", label: "No grouping" },
    { value: "status", label: "Status" },
    { value: "doc_type", label: "Document Type" },
  ], []);

  const proposalFilterFields = useMemo(() => [
    {
      key: "status",
      label: "Review Status",
      type: "select",
      options: [
        { value: "Submitted", label: "Submitted" },
        { value: "Under Review", label: "Under Review" },
        { value: "Needs Revision", label: "Needs Revision" },
        { value: "Approved", label: "Approved" },
        { value: "Declined", label: "Declined" },
      ],
    },
    {
      key: "organization",
      label: "Organization",
      type: "select",
      options: myOrganizations
        .filter((org) => String(org.organization_id) === String(selectedOsasOrgId))
        .map((org) => ({
        value: org.organization_name,
        label: org.organization_name,
      })),
    },
  ], [myOrganizations, selectedOsasOrgId]);

  const proposalSortOptions = useMemo(() => [
    { value: "created_at", label: "Date Submitted" },
    { value: "title", label: "Proposal Title" },
    { value: "event_date", label: "Target Event Date" },
    { value: "status", label: "Status" },
  ], []);

  const proposalGroupOptions = useMemo(() => [
    { value: "status", label: "Status" },
    { value: "organization", label: "Organization" },
    { value: "none", label: "No grouping" },
  ], []);

  const postEventFilterFields = useMemo(() => [
    {
      key: "status",
      label: "Clearance Status",
      type: "select",
      options: [
        { value: "Submitted", label: "Submitted" },
        { value: "Under Review", label: "Under Review" },
        { value: "Needs Revision", label: "Needs Revision" },
        { value: "Cleared", label: "Cleared" },
        { value: "Declined", label: "Declined" },
      ],
    },
    {
      key: "organization",
      label: "Organization",
      type: "select",
      options: myOrganizations
        .filter((org) => String(org.organization_id) === String(selectedOsasOrgId))
        .map((org) => ({
          value: org.organization_name,
          label: org.organization_name,
        })),
    },
  ], [myOrganizations, selectedOsasOrgId]);

  const postEventSortOptions = useMemo(() => [
    { value: "created_at", label: "Date Submitted" },
    { value: "event_title", label: "Event Title" },
    { value: "event_date", label: "Event Date" },
    { value: "actual_attendance", label: "Attendees" },
    { value: "total_expenses", label: "Liquidated Expenses" },
    { value: "status", label: "Status" },
  ], []);

  const postEventGroupOptions = useMemo(() => [
    { value: "status", label: "Status" },
    { value: "organization", label: "Organization" },
    { value: "none", label: "No grouping" },
  ], []);

  const cblFilterFields = useMemo(() => [
    {
      key: "status",
      label: "Review Status",
      type: "select",
      options: [
        { value: "Pending", label: "Pending" },
        { value: "Needs Revision", label: "Needs Revision" },
        { value: "Approved", label: "Approved" },
        { value: "Declined", label: "Declined" },
        { value: "Superseded", label: "Superseded" },
      ],
    },
  ], []);

  const cblSortOptions = useMemo(() => [
    { value: "created_at", label: "Date Submitted" },
    { value: "version_tag", label: "Version Title" },
    { value: "effective_date", label: "Effective Date" },
    { value: "status", label: "Status" },
  ], []);

  const cblGroupOptions = useMemo(() => [
    { value: "status", label: "Status" },
    { value: "none", label: "No grouping" },
  ], []);

  const hasActiveFilters =
    requestSearch.trim() !== "" ||
    (requestFilters.status?.length > 0) ||
    (requestFilters.doc_type?.length > 0) ||
    requestFilterRules.length > 0 ||
    Boolean(requestStartDate) ||
    Boolean(requestEndDate);

  const clearRequestFilters = () => {
    setRequestSearch("");
    setRequestFilters({ status: [], doc_type: [] });
    setRequestFilterRules([]);
    setRequestStartDate("");
    setRequestEndDate("");
    setCurrentPage(1);
  };

  const requestFilterGroups = useMemo(() => {
    const reqs = data.requests || [];

    const statusOptions = [
      { value: "Pending", label: "Pending", dotColor: "bg-amber-500", count: reqs.filter((r) => r.status === "Pending").length },
      { value: "Deficient", label: "Action Required", dotColor: "bg-orange-500", count: reqs.filter((r) => r.status === "Deficient").length },
      { value: "PendingPayment", label: "Pending Payment", dotColor: "bg-amber-600", count: reqs.filter((r) => r.status === "PendingPayment").length },
      { value: "InProgress", label: "In Progress", dotColor: "bg-blue-500", count: reqs.filter((r) => r.status === "InProgress").length },
      { value: "Ready", label: "Ready for Pickup", dotColor: "bg-cyan-500", count: reqs.filter((r) => r.status === "Ready").length },
      { value: "Completed", label: "Completed", dotColor: "bg-emerald-500", count: reqs.filter((r) => r.status === "Completed").length },
      { value: "Cancelled", label: "Cancelled", dotColor: "bg-rose-500", count: reqs.filter((r) => r.status === "Cancelled").length },
    ];

    const typesMap = {};
    reqs.forEach((r) => {
      if (r.doc_type) {
        typesMap[r.doc_type] = (typesMap[r.doc_type] || 0) + 1;
      }
    });

    const docTypeOptions = Object.entries(typesMap).map(([dt, count]) => ({
      value: dt,
      label: dt,
      count,
    }));

    const groups = [
      {
        id: "status",
        label: "Request Status",
        options: statusOptions,
      },
    ];

    if (docTypeOptions.length > 0) {
      groups.push({
        id: "doc_type",
        label: "Document Type",
        options: docTypeOptions,
      });
    }

    return groups;
  }, [data.requests]);


  const proposalFilterGroups = useMemo(() => {
    const props = data.proposals || [];

    const statusOptions = [
      {
        value: "Submitted",
        label: "Submitted",
        dotColor: "bg-blue-500",
        count: props.filter((p) => normalizeProposalStatus(p.status) === "Submitted").length,
      },
      {
        value: "Under Review",
        label: "Under Review",
        dotColor: "bg-amber-500",
        count: props.filter((p) => normalizeProposalStatus(p.status) === "Under Review").length,
      },
      {
        value: "Needs Revision",
        label: "Needs Revision",
        dotColor: "bg-purple-500",
        count: props.filter((p) => normalizeProposalStatus(p.status) === "Needs Revision").length,
      },
      {
        value: "Approved",
        label: "Approved",
        dotColor: "bg-emerald-500",
        count: props.filter((p) => normalizeProposalStatus(p.status) === "Approved").length,
      },
      {
        value: "Declined",
        label: "Declined",
        dotColor: "bg-rose-500",
        count: props.filter((p) => normalizeProposalStatus(p.status) === "Declined").length,
      },
    ];

    const archivedCount = props.filter((p) => normalizeProposalStatus(p.status) === "Archived").length;
    if (archivedCount > 0) {
      statusOptions.push({
        value: "Archived",
        label: "Archived",
        dotColor: "bg-zinc-500",
        count: archivedCount,
      });
    }

    const orgMap = {};
    props.forEach((p) => {
      const org = p.organization_name || "General";
      orgMap[org] = (orgMap[org] || 0) + 1;
    });

    const orgOptions = Object.entries(orgMap).map(([org, count]) => ({
      value: org,
      label: org,
      count,
    }));

    const groups = [
      {
        id: "status",
        label: "Review Status",
        options: statusOptions,
      },
    ];

    if (orgOptions.length > 0) {
      groups.push({
        id: "organization",
        label: "Organization",
        options: orgOptions,
      });
    }

    return groups;
  }, [data.proposals]);


  const handleSort = (column) => {
    if (sortBy === column) {
      if (sortOrder === "ASC") {
        setSortOrder("DESC");
      } else {
        setSortBy("created_at");
        setSortOrder("DESC");
      }
    } else {
      setSortBy(column);
      setSortOrder("ASC");
    }
    setCurrentPage(1);
  };

  const filteredRequests = useMemo(() => {
    const q = (requestSearch || "").trim().toLowerCase();
    const selectedStatuses = requestFilters.status || [];
    const selectedDocTypes = requestFilters.doc_type || [];

    return (data.requests || []).filter((item) => {
      const matchesSearch =
        !q ||
        formatRequestReference(item.id).toLowerCase().includes(q) ||
        (item.doc_type || "").toLowerCase().includes(q) ||
        (item.notes || "").toLowerCase().includes(q) ||
        (item.status || "").toLowerCase().includes(q) ||
        (item.client_type || "").toLowerCase().includes(q) ||
        (item.student_no || "").toLowerCase().includes(q);

      if (!matchesSearch) return false;

      const matchesStatus =
        selectedStatuses.length === 0 || selectedStatuses.includes(item.status);
      if (!matchesStatus) return false;

      const matchesDocType =
        selectedDocTypes.length === 0 || selectedDocTypes.includes(item.doc_type);
      if (!matchesDocType) return false;

      for (const rule of requestFilterRules) {
        if (rule.fieldKey === "status") {
          const match = String(item.status || "").toLowerCase() === String(rule.value || "").toLowerCase();
          if (rule.operator === "is_not" ? match : !match) return false;
        } else if (rule.fieldKey === "doc_type") {
          const match = String(item.doc_type || "").toLowerCase().includes(String(rule.value || "").toLowerCase());
          if (rule.operator === "is_not" ? match : !match) return false;
        }
      }

      return isInManilaDateRange(item.created_at, requestStartDate, requestEndDate);
    });
  }, [data.requests, requestSearch, requestFilters, requestFilterRules, requestStartDate, requestEndDate]);

  const requestActiveChips = useMemo(() => {
    const chips = [];
    requestFilterRules.forEach((rule) => {
      const field = requestFilterFields.find((f) => f.key === rule.fieldKey);
      chips.push({
        id: rule.id,
        label: `${field?.label || rule.fieldKey}: ${rule.operator === "is_not" ? "not " : ""}${rule.value}`,
        onRemove: () => setRequestFilterRules((prev) => prev.filter((r) => r.id !== rule.id)),
      });
    });
    if (requestStartDate || requestEndDate) {
      chips.push({
        id: "date-range",
        label: `Date: ${requestStartDate || "Any"} to ${requestEndDate || "Any"}`,
        onRemove: () => {
          setRequestStartDate("");
          setRequestEndDate("");
        },
      });
    }
    return chips;
  }, [requestFilterRules, requestFilterFields, requestStartDate, requestEndDate, setRequestFilterRules]);

  const filteredProposals = useMemo(() => {
    const q = (proposalSearch || "").trim().toLowerCase();
    const selectedStatuses = proposalFilters.status || [];
    const selectedOrgs = proposalFilters.organization || [];

    return organizationProposals.filter((item) => {
      const matchesSearch =
        !q ||
        (item.title || "").toLowerCase().includes(q) ||
        (item.organization_name || "").toLowerCase().includes(q) ||
        (item.status || "").toLowerCase().includes(q);

      if (!matchesSearch) return false;

      const itemStatusNorm = normalizeProposalStatus(item.status);
      const matchesStatus =
        selectedStatuses.length === 0 ||
        selectedStatuses.some(
          (st) =>
            normalizeProposalStatus(st) === itemStatusNorm ||
            String(st).toLowerCase() === String(item.status || "").toLowerCase()
        );
      if (!matchesStatus) return false;

      const matchesOrg =
        selectedOrgs.length === 0 || selectedOrgs.includes(item.organization_name || "General");
      if (!matchesOrg) return false;

      for (const rule of proposalFilterRules) {
        if (rule.fieldKey === "status") {
          const match = normalizeProposalStatus(item.status) === normalizeProposalStatus(rule.value);
          if (rule.operator === "is_not" ? match : !match) return false;
        } else if (rule.fieldKey === "organization") {
          const match = (item.organization_name || "General").toLowerCase() === String(rule.value || "").toLowerCase();
          if (rule.operator === "is_not" ? match : !match) return false;
        }
      }

      return isInManilaDateRange(item.created_at, proposalStartDate, proposalEndDate);
    });
  }, [organizationProposals, proposalSearch, proposalFilters, proposalFilterRules, proposalStartDate, proposalEndDate]);

  const proposalActiveChips = useMemo(() => {
    const chips = [];
    proposalFilterRules.forEach((rule) => {
      const field = proposalFilterFields.find((f) => f.key === rule.fieldKey);
      chips.push({
        id: rule.id,
        label: `${field?.label || rule.fieldKey}: ${rule.operator === "is_not" ? "not " : ""}${rule.value}`,
        onRemove: () => setProposalFilterRules((prev) => prev.filter((r) => r.id !== rule.id)),
      });
    });
    if (proposalStartDate || proposalEndDate) {
      chips.push({
        id: "date-range",
        label: `Date: ${proposalStartDate || "Any"} to ${proposalEndDate || "Any"}`,
        onRemove: () => {
          setProposalStartDate("");
          setProposalEndDate("");
        },
      });
    }
    return chips;
  }, [proposalFilterRules, proposalFilterFields, proposalStartDate, proposalEndDate, setProposalFilterRules]);

  const sortedProposals = useMemo(() => {
    return [...filteredProposals].sort((a, b) => {
      let valA = a[proposalSortBy];
      let valB = b[proposalSortBy];

      if (proposalSortBy === "created_at" || proposalSortBy === "event_date") {
        const timeA = new Date(valA || 0).getTime();
        const timeB = new Date(valB || 0).getTime();
        return proposalSortOrder === "ASC" ? timeA - timeB : timeB - timeA;
      } else if (typeof valA === "string") {
        valA = valA.toLowerCase();
        valB = (valB || "").toLowerCase();
      }

      if (valA < valB) return proposalSortOrder === "ASC" ? -1 : 1;
      if (valA > valB) return proposalSortOrder === "ASC" ? 1 : -1;
      return 0;
    });
  }, [filteredProposals, proposalSortBy, proposalSortOrder]);

  const groupedProposals = useMemo(() => {
    if (proposalGroupBy === "none") return [{ key: "all", label: null, items: sortedProposals }];
    const map = new Map();
    for (const item of sortedProposals) {
      let key = "Other";
      if (proposalGroupBy === "status") key = normalizeProposalStatus(item.status);
      else if (proposalGroupBy === "organization") key = item.organization_name || "General";

      if (!map.has(key)) map.set(key, []);
      map.get(key).push(item);
    }
    return Array.from(map.entries()).map(([label, items]) => ({
      key: label,
      label,
      items,
    }));
  }, [sortedProposals, proposalGroupBy]);

  const filteredPostEventReports = useMemo(() => {
    const q = (postEventSearch || "").trim().toLowerCase();

    return organizationPostEventReports.filter((item) => {
      const matchesSearch =
        !q ||
        (item.event_title || "").toLowerCase().includes(q) ||
        (item.organization_name || "").toLowerCase().includes(q) ||
        (item.status || "").toLowerCase().includes(q) ||
        (item.review_note || "").toLowerCase().includes(q);

      if (!matchesSearch) return false;

      for (const rule of postEventFilterRules) {
        if (rule.fieldKey === "status") {
          const match = String(item.status || "").toLowerCase() === String(rule.value || "").toLowerCase();
          if (rule.operator === "is_not" ? match : !match) return false;
        } else if (rule.fieldKey === "organization") {
          const match = (item.organization_name || "General").toLowerCase() === String(rule.value || "").toLowerCase();
          if (rule.operator === "is_not" ? match : !match) return false;
        }
      }

      return isInManilaDateRange(item.created_at, postEventStartDate, postEventEndDate);
    });
  }, [organizationPostEventReports, postEventSearch, postEventFilterRules, postEventStartDate, postEventEndDate]);

  const postEventActiveChips = useMemo(() => {
    const chips = [];
    postEventFilterRules.forEach((rule) => {
      const field = postEventFilterFields.find((f) => f.key === rule.fieldKey);
      chips.push({
        id: rule.id,
        label: `${field?.label || rule.fieldKey}: ${rule.operator === "is_not" ? "not " : ""}${rule.value}`,
        onRemove: () => setPostEventFilterRules((prev) => prev.filter((r) => r.id !== rule.id)),
      });
    });
    if (postEventStartDate || postEventEndDate) {
      chips.push({
        id: "date-range",
        label: `Date: ${postEventStartDate || "Any"} to ${postEventEndDate || "Any"}`,
        onRemove: () => {
          setPostEventStartDate("");
          setPostEventEndDate("");
        },
      });
    }
    return chips;
  }, [postEventFilterRules, postEventFilterFields, postEventStartDate, postEventEndDate, setPostEventFilterRules]);

  const sortedPostEventReports = useMemo(() => {
    return [...filteredPostEventReports].sort((a, b) => {
      let valA = a[postEventSortBy];
      let valB = b[postEventSortBy];

      if (postEventSortBy === "created_at" || postEventSortBy === "event_date") {
        const timeA = new Date(valA || 0).getTime();
        const timeB = new Date(valB || 0).getTime();
        return postEventSortOrder === "ASC" ? timeA - timeB : timeB - timeA;
      } else if (postEventSortBy === "actual_attendance" || postEventSortBy === "total_expenses") {
        const numA = Number(valA || 0);
        const numB = Number(valB || 0);
        return postEventSortOrder === "ASC" ? numA - numB : numB - numA;
      } else if (typeof valA === "string" || typeof valB === "string") {
        valA = String(valA || "").toLowerCase();
        valB = String(valB || "").toLowerCase();
      }

      if (valA < valB) return postEventSortOrder === "ASC" ? -1 : 1;
      if (valA > valB) return postEventSortOrder === "ASC" ? 1 : -1;
      return 0;
    });
  }, [filteredPostEventReports, postEventSortBy, postEventSortOrder]);

  const groupedPostEventReports = useMemo(() => {
    if (postEventGroupBy === "none") return [{ key: "all", label: null, items: sortedPostEventReports }];
    const map = new Map();
    for (const item of sortedPostEventReports) {
      let key = "Other";
      if (postEventGroupBy === "status") key = item.status || "Submitted";
      else if (postEventGroupBy === "organization") key = item.organization_name || "General";

      if (!map.has(key)) map.set(key, []);
      map.get(key).push(item);
    }
    return Array.from(map.entries()).map(([label, items]) => ({
      key: label,
      label,
      items,
    }));
  }, [sortedPostEventReports, postEventGroupBy]);

  const filteredCblVersions = useMemo(() => {
    const q = (cblSearch || "").trim().toLowerCase();

    return cblVersions.filter((item) => {
      const matchesSearch =
        !q ||
        (item.version_tag || "").toLowerCase().includes(q) ||
        (item.amendment_summary || "").toLowerCase().includes(q) ||
        (item.review_notes || "").toLowerCase().includes(q) ||
        (item.status || "").toLowerCase().includes(q) ||
        (item.original_filename || "").toLowerCase().includes(q);

      if (!matchesSearch) return false;

      for (const rule of cblFilterRules) {
        if (rule.fieldKey === "status") {
          const match = String(item.status || "").toLowerCase() === String(rule.value || "").toLowerCase();
          if (rule.operator === "is_not" ? match : !match) return false;
        }
      }

      return isInManilaDateRange(item.created_at, cblStartDate, cblEndDate);
    });
  }, [cblVersions, cblSearch, cblFilterRules, cblStartDate, cblEndDate]);

  const cblActiveChips = useMemo(() => {
    const chips = [];
    cblFilterRules.forEach((rule) => {
      const field = cblFilterFields.find((f) => f.key === rule.fieldKey);
      chips.push({
        id: rule.id,
        label: `${field?.label || rule.fieldKey}: ${rule.operator === "is_not" ? "not " : ""}${rule.value}`,
        onRemove: () => setCblFilterRules((prev) => prev.filter((r) => r.id !== rule.id)),
      });
    });
    if (cblStartDate || cblEndDate) {
      chips.push({
        id: "date-range",
        label: `Date: ${cblStartDate || "Any"} to ${cblEndDate || "Any"}`,
        onRemove: () => {
          setCblStartDate("");
          setCblEndDate("");
        },
      });
    }
    return chips;
  }, [cblFilterRules, cblFilterFields, cblStartDate, cblEndDate, setCblFilterRules]);

  const sortedCblVersions = useMemo(() => {
    return [...filteredCblVersions].sort((a, b) => {
      let valA = a[cblSortBy];
      let valB = b[cblSortBy];

      if (cblSortBy === "created_at" || cblSortBy === "effective_date") {
        const timeA = new Date(valA || 0).getTime();
        const timeB = new Date(valB || 0).getTime();
        return cblSortOrder === "ASC" ? timeA - timeB : timeB - timeA;
      } else if (typeof valA === "string" || typeof valB === "string") {
        valA = String(valA || "").toLowerCase();
        valB = String(valB || "").toLowerCase();
      }

      if (valA < valB) return cblSortOrder === "ASC" ? -1 : 1;
      if (valA > valB) return cblSortOrder === "ASC" ? 1 : -1;
      return 0;
    });
  }, [filteredCblVersions, cblSortBy, cblSortOrder]);

  const groupedCblVersions = useMemo(() => {
    if (cblGroupBy === "none") return [{ key: "all", label: null, items: sortedCblVersions }];
    const map = new Map();
    for (const item of sortedCblVersions) {
      let key = "Other";
      if (cblGroupBy === "status") key = item.status || "Pending";

      if (!map.has(key)) map.set(key, []);
      map.get(key).push(item);
    }
    return Array.from(map.entries()).map(([label, items]) => ({
      key: label,
      label,
      items,
    }));
  }, [sortedCblVersions, cblGroupBy]);

  const sortedRequests = useMemo(() => {
    return [...filteredRequests].sort((a, b) => {
      let valA = a[sortBy];
      let valB = b[sortBy];

      if (sortBy === "id") {
        return sortOrder === "ASC" ? Number(a.id) - Number(b.id) : Number(b.id) - Number(a.id);
      } else if (sortBy === "created_at") {
        const timeA = new Date(a.created_at || 0).getTime();
        const timeB = new Date(b.created_at || 0).getTime();
        return sortOrder === "ASC" ? timeA - timeB : timeB - timeA;
      } else if (typeof valA === "string") {
        valA = valA.toLowerCase();
        valB = (valB || "").toLowerCase();
      }

      if (valA < valB) return sortOrder === "ASC" ? -1 : 1;
      if (valA > valB) return sortOrder === "ASC" ? 1 : -1;
      return 0;
    });
  }, [filteredRequests, sortBy, sortOrder]);

  const totalPages = Math.ceil(sortedRequests.length / itemsPerPage) || 1;
  const displayPage = Math.min(currentPage, totalPages);

  const orderedGroups = useMemo(() => requestGroupBy === "none"
    ? sortedRequests
    : orderRowsByGroup(sortedRequests, (item) => requestGroupBy === "status" ? item.status || "Unknown" : item.doc_type || "Other"),
  [sortedRequests, requestGroupBy]);

  const paginatedRequests = useMemo(() => {
    const start = (displayPage - 1) * itemsPerPage;
    return orderedGroups.slice(start, start + itemsPerPage);
  }, [orderedGroups, displayPage, itemsPerPage]);

  const groupedPaginatedRequests = useMemo(() => {
    if (requestGroupBy === "none") return [{ key: "all", label: null, items: paginatedRequests }];
    const map = new Map();
    for (const item of paginatedRequests) {
      let key = "Other";
      if (requestGroupBy === "status") key = item.status || "Unknown";
      else if (requestGroupBy === "doc_type") key = item.doc_type || "Other";

      if (!map.has(key)) map.set(key, []);
      map.get(key).push(item);
    }
    return Array.from(map.entries()).map(([label, items]) => ({
      key: label,
      label,
      items,
    }));
  }, [paginatedRequests, requestGroupBy]);

  const handleKeyDown = useCallback(
    (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "SELECT" || e.target.tagName === "TEXTAREA") return;
      if (e.key === "ArrowLeft") {
        setCurrentPage((p) => Math.max(1, p - 1));
      } else if (e.key === "ArrowRight") {
        setCurrentPage((p) => Math.min(totalPages, p + 1));
      }
    },
    [totalPages, setCurrentPage]
  );

  const selectedRequestReference = formatRequestReference(selectedRequestForDetail?.id);
  const requestStatus = selectedRequestForDetail?.status;
  const readyInquiry = requestStatus === "Ready" && selectedRequestForDetail?.doc_type === MISSING_DOCUMENTS_INQUIRY;
  const requestNotice = readyInquiry
    ? { tone: "success", title: "Inquiry Response Available", message: "Read the Registrar’s response in the request timeline." }
    : requestStatus
    ? REQUEST_STATUS_NOTICES[requestStatus.toLowerCase().replace(/\s+/g, "")] ?? {
        title: requestStatus,
        message: "Check the processing timeline for the latest update.",
      }
    : null;
  const currentRequestDetailIndex = selectedRequestForDetail
    ? sortedRequests.findIndex((r) => r.id === selectedRequestForDetail.id)
    : -1;

  const handlePrevRequestDetail = () => {
    if (currentRequestDetailIndex > 0) {
      setSelectedRequestForDetail(sortedRequests[currentRequestDetailIndex - 1]);
    }
  };

  const handleNextRequestDetail = () => {
    if (currentRequestDetailIndex >= 0 && currentRequestDetailIndex < sortedRequests.length - 1) {
      setSelectedRequestForDetail(sortedRequests[currentRequestDetailIndex + 1]);
    }
  };

  const currentProposalDetailIndex = selectedProposalForDetail
    ? filteredProposals.findIndex((p) => p.id === selectedProposalForDetail.id)
    : -1;

  const handlePrevProposalDetail = () => {
    if (currentProposalDetailIndex > 0) {
      setSelectedProposalForDetail(filteredProposals[currentProposalDetailIndex - 1]);
    }
  };

  const handleNextProposalDetail = () => {
    if (currentProposalDetailIndex >= 0 && currentProposalDetailIndex < filteredProposals.length - 1) {
      setSelectedProposalForDetail(filteredProposals[currentProposalDetailIndex + 1]);
    }
  };

  const currentPostEventReportDetailIndex = selectedPostEventReportForDetail
    ? sortedPostEventReports.findIndex((report) => String(report.id) === String(selectedPostEventReportForDetail.id))
    : -1;

  const handlePrevPostEventReportDetail = () => {
    if (currentPostEventReportDetailIndex > 0) {
      setSelectedPostEventReportForDetail(sortedPostEventReports[currentPostEventReportDetailIndex - 1]);
    }
  };

  const handleNextPostEventReportDetail = () => {
    if (currentPostEventReportDetailIndex >= 0 && currentPostEventReportDetailIndex < sortedPostEventReports.length - 1) {
      setSelectedPostEventReportForDetail(sortedPostEventReports[currentPostEventReportDetailIndex + 1]);
    }
  };

  const currentCblVersionDetailIndex = selectedCblVersionForDetail
    ? sortedCblVersions.findIndex((version) => String(version.id) === String(selectedCblVersionForDetail.id))
    : -1;

  const handlePrevCblVersionDetail = () => {
    if (currentCblVersionDetailIndex > 0) {
      setSelectedCblVersionForDetail(sortedCblVersions[currentCblVersionDetailIndex - 1]);
    }
  };

  const handleNextCblVersionDetail = () => {
    if (currentCblVersionDetailIndex >= 0 && currentCblVersionDetailIndex < sortedCblVersions.length - 1) {
      setSelectedCblVersionForDetail(sortedCblVersions[currentCblVersionDetailIndex + 1]);
    }
  };

  const showToast = useCallback((msgOrTitle, maybeDescOrError = false, maybeIsError = false, options = {}) => {
    if (msgOrTitle && typeof msgOrTitle === "object") {
      if (msgOrTitle instanceof Error) {
        const normalized = formatErrorMessage(msgOrTitle);
        return toast.error(normalized.title, {
          description: normalized.description,
          action: normalized.action,
          ...options,
        });
      }
      const isErr =
        Boolean(maybeDescOrError || maybeIsError) ||
        msgOrTitle.variant === "destructive" ||
        msgOrTitle.variant === "error";
      const isWarn = maybeDescOrError === "warning" || maybeIsError === "warning" || msgOrTitle.variant === "warning";
      const fn = isErr ? toast.error : isWarn ? toast.warning : toast.success;
      return fn(msgOrTitle.title || "", {
        description: msgOrTitle.description,
        action: msgOrTitle.action,
        ...options,
      });
    }

    const title = String(msgOrTitle || "");
    const isWarning = maybeDescOrError === "warning" || maybeIsError === "warning";
    const isError =
      Boolean(maybeIsError && !isWarning) ||
      maybeDescOrError === true ||
      maybeDescOrError === "error";
    const description = typeof maybeDescOrError === "string" && maybeDescOrError !== "error" && maybeDescOrError !== "warning"
      ? maybeDescOrError
      : "";

    if (isError) {
      const normalized = formatErrorMessage(description || title, { title, description });
      return toast.error(normalized.title, {
        description: normalized.description,
        action: normalized.action || options?.action,
        ...options,
      });
    }

    if (isWarning) {
      return toast.warning(title, {
        description: description || undefined,
        ...options,
      });
    }

    return toast.success(title, {
      description: description || undefined,
      ...options,
    });
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      document.documentElement.style.setProperty("--brand-accent", "#800000");
      document.documentElement.style.setProperty("--brand-foreground", "#FFFFFF");
    }
  }, []);

  // The shared Sidebar emits this event from its own collapse button. Keep
  // the student shell in sync just like the staff dashboard does.
  useEffect(() => {
    const handleToggle = () => setSidebarOpen((open) => !open);
    window.addEventListener("toggle-sidebar", handleToggle);
    return () => window.removeEventListener("toggle-sidebar", handleToggle);
  }, []);

  const switchView = useCallback((nextView) => {
    const requested = normalizeStudentTab(nextView) || "overview";
    const target = !canUseStudentModules && ["compliance", "osas"].includes(requested) ? "odrs" : requested;
    setView(target);
    const params = new URLSearchParams();
    params.set("view", target);
    router.push(`${window.location.pathname}?${params.toString()}`, { scroll: false });
  }, [router, canUseStudentModules]);

  // Synchronize view from switch-view events (Command Palette & deep linking)
  useEffect(() => {
    const handleSwitch = (e) => {
      const { view: targetView } = e.detail || {};
      if (targetView) {
        switchView(targetView);
      }
    };
    window.addEventListener("switch-view", handleSwitch);
    return () => window.removeEventListener("switch-view", handleSwitch);
  }, [switchView]);

  // Synchronize view from URL parameter
  useEffect(() => {
    const tab = normalizeStudentTab(searchParams?.get("view"));
    const prefTab = normalizeStudentTab(authUser?.preferences?.default_home_view);
    const target = tab || prefTab || "overview";
    const restricted = me && !canUseStudentModules && ["compliance", "osas"].includes(target);
    const timer = setTimeout(() => {
      if (restricted) router.replace("/student?view=odrs", { scroll: false });
      setView(restricted ? "odrs" : target);
    }, 0);
    return () => clearTimeout(timer);
  }, [searchParams, router, authUser?.preferences?.default_home_view, me, canUseStudentModules]);

  useEffect(() => {
    if (!me) return;
    const controller = new AbortController();
    const refresh = () => fetch("/api/student/notifications?count=1", { signal: controller.signal })
      .then((response) => response.json())
      .then((result) => { if (result.ok) setUnreadNotifications(result.data.unread); })
      .catch(() => {});
    void refresh();
    const timer = setInterval(refresh, 30000);
    window.addEventListener("focus", refresh);
    return () => {
      controller.abort();
      clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, [me, view]);

  useEffect(() => {
    const requestId = searchParams?.get("request");
    const proposalId = searchParams?.get("proposal");
    const reportId = searchParams?.get("report");
    const request = requestId && data.requests.find((item) => String(item.id) === requestId);
    const proposal = proposalId && data.proposals.find((item) => String(item.id) === proposalId);
    const report = reportId && postEventReports.find((item) => String(item.id) === reportId);
    if ((view === "odrs" && request) || (view === "osas" && (proposal || report))) {
      const timer = setTimeout(() => {
        if (view === "odrs") setSelectedRequestForDetail(request);
        else if (report) setSelectedPostEventReportForDetail(report);
        else setSelectedProposalForDetail(proposal);
        const params = new URLSearchParams(searchParams.toString());
        params.delete("request");
        params.delete("proposal");
        params.delete("report");
        router.replace(`/student?${params}`, { scroll: false });
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [searchParams, view, data.requests, data.proposals, postEventReports, router]);

  useEffect(() => {
    const proposalId = searchParams?.get("postEventFor");
    if (view !== "osas" || !proposalId || !hasLoaded) return;
    const pendingEvent = pendingPostEvents.find((event) => String(event.id) === proposalId);
    const timer = setTimeout(() => {
      setOsasSubView("post_event");
      if (pendingEvent) {
        setSelectedOsasOrgId(String(pendingEvent.organization_id));
        setPostEventForm((current) => ({ ...current, eventProposalId: proposalId }));
        setIsFormOpen(true);
        osasRevisionFormTarget.current = "osas-post-event-form";
      }
      const params = new URLSearchParams(searchParams.toString());
      params.delete("postEventFor");
      router.replace(`/student?${params}`, { scroll: false });
    }, 0);
    return () => clearTimeout(timer);
  }, [searchParams, view, hasLoaded, pendingPostEvents, setOsasSubView, router]);

  useEffect(() => {
    const versionId = searchParams?.get("bylaws");
    const orgId = searchParams?.get("org");
    if (view !== "osas" || !versionId || !orgId ||
        !myOrganizations.some((org) => String(org.organization_id) === orgId)) return;
    const timer = setTimeout(() => {
      setSelectedOsasOrgId(orgId);
      setOsasSubView("cbl");
      if (String(selectedOsasOrgId) !== orgId || String(cblOrgData?.id) !== orgId) return;
      const version = cblVersions.find((item) => String(item.id) === versionId);
      if (version) setSelectedCblVersionForDetail(version);
      const params = new URLSearchParams(searchParams.toString());
      params.delete("bylaws");
      params.delete("org");
      router.replace(`/student?${params}`, { scroll: false });
    }, 0);
    return () => clearTimeout(timer);
  }, [searchParams, view, myOrganizations, selectedOsasOrgId, cblOrgData, cblVersions, setOsasSubView, router]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const session = await getClientSession();
      const authenticated = Boolean(session.ok && session.data);
      if (!canAccessPage("/student", session.data?.role, { authenticated })) {
        router.replace("/login");
        return;
      }
      if (!authenticated) {
        return;
      }
      setMe(session.data);
      setRequestForm((prev) => ({
        ...prev,
        clientType: session.data.client_type || "Student",
        studentNo: prev.studentNo || (session.data.client_type === "Parent" ? "" : session.data.student_no) || "",
      }));
      const studentModules = session.data.client_type === "Student" && session.data.portal_setup_complete !== false;
      const fetchDashboardData = async (url) => {
        try {
          const response = await fetch(url, { cache: "no-store" });
          return response.ok ? await response.json() : null;
        } catch {
          return null;
        }
      };
      const [requestJson, proposalJson, typesJson, coursesJson, orgsJson, postEventJson, complianceJson] = await Promise.all([
        fetchDashboardData("/api/student/document-requests"),
        studentModules ? fetchDashboardData("/api/student/event-proposals") : null,
        fetchDashboardData("/api/doc-types?scope=requestable"),
        fetchDashboardData("/api/courses"),
        studentModules ? fetchDashboardData("/api/student/organizations") : null,
        studentModules ? fetchDashboardData("/api/student/post-event-reports") : null,
        studentModules ? fetchDashboardData("/api/student/compliance") : null,
      ]);
      const requestsLoaded = requestJson?.ok && Array.isArray(requestJson.data?.requests);
      setRequestLoadFailed(!requestsLoaded);
      if (!requestsLoaded) {
        showToast("Could not load document requests", "Try refreshing your request history.", true);
      }
      setComplianceData(complianceJson?.ok && complianceJson.data?.student ? complianceJson.data : null);
      setDocTypes(Array.isArray(typesJson?.data) ? typesJson.data : []);
      setCourses(Array.isArray(coursesJson?.data) ? coursesJson.data : []);
      const loadedOrgs = Array.isArray(orgsJson?.data) ? orgsJson.data : [];
      setMyOrganizations(loadedOrgs);
      const savedOsasOrgId = String(session.data.preferences?.selected_osas_org_id || "");
      setSelectedOsasOrgId((prev) => {
        const preferredOrganization = savedOsasOrgId || prev;
        const currentOrganizationIsAuthorized = loadedOrgs.some(
          (org) => String(org.organization_id) === String(preferredOrganization)
        );
        if (currentOrganizationIsAuthorized) return String(preferredOrganization);
        return loadedOrgs.length === 1 ? String(loadedOrgs[0].organization_id) : "";
      });
      const proposalsLoaded = proposalJson?.ok && Array.isArray(proposalJson.data);
      const postEventsLoaded = postEventJson?.ok && Array.isArray(postEventJson.data?.reports);
      setProposalLoadFailed(studentModules && !proposalsLoaded);
      setPostEventLoadFailed(studentModules && !postEventsLoaded);
      if (postEventsLoaded) {
        setPostEventReports(postEventJson.data.reports);
        setPendingPostEvents(postEventJson.data.pendingEvents || []);
      }
      setData((current) => ({
        requests: requestsLoaded ? requestJson.data.requests : current.requests,
        proposals: proposalsLoaded ? proposalJson.data : current.proposals,
      }));
      if (requestsLoaded) {
        setSelectedRequestForDetail((prev) => {
          if (!prev) return prev;
          const fresh = requestJson.data.requests.find((r) => Number(r.id) === Number(prev.id));
          return fresh || prev;
        });
      }
    } finally {
      setHasLoaded(true);
      setLoading(false);
    }
  }, [router, showToast]);

  const handleCorrectionUpload = async (requestId, correctionId, file) => {
    if (correctionUploadLock.current) return;
    if (!file.size || file.size > 10 * 1024 * 1024) {
      showToast("Check the file size", "Choose a file up to 10 MB.", true);
      return;
    }
    correctionUploadLock.current = true;
    setCorrectionUploading(true);
    try {
      const form = new FormData();
      form.set("file", file);
      form.set("correctionId", correctionId);
      const response = await authFetch(`/api/document-requests/${requestId}/attachments`, { method: "POST", body: form });
      const json = await response.json().catch(() => null);
      if (!response.ok || !json?.ok) {
        showToast("Could not submit correction", json?.error || "Check your connection and try again.", true);
        if (response.status === 409) await load();
        return;
      }
      const update = (request) => request && String(request.id) === String(requestId) ? {
        ...request,
        status: json.status,
        correction_items: json.corrections,
        attachments: [...(request.attachments || []), json.data],
        attachment_count: Number(request.attachment_count ?? request.attachments?.length ?? 0) + 1,
      } : request;
      setSelectedRequestForDetail(update);
      setData((current) => ({ ...current, requests: (current.requests || []).map(update) }));
      showToast("Correction submitted", json.completed
        ? "Your request is back in the Registrar review queue."
        : "Submit the remaining corrections to return your request to the Registrar.");
      await load();
    } catch {
      showToast("Could not refresh the request", "Refresh the request before trying again.", true);
    } finally {
      correctionUploadLock.current = false;
      setCorrectionUploading(false);
    }
  };

  const handlePaymentProofUpload = useCallback(async (requestId, file) => {
    if (file.size > 10 * 1024 * 1024) {
      showToast(
        "File is too large",
        "This file exceeds the 10\u00A0MB limit. Compress the file or upload a JPEG or PNG receipt.",
        true
      );
      return;
    }
    setPaymentUploadRequestId(requestId);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await authFetch(`/api/document-requests/${requestId}/attachments`, { method: "POST", body: formData });
      const json = await response.json().catch(() => null);
      if (!response.ok || !json?.ok) {
        const uploadError = new Error(json?.error || "Unable to upload payment proof.");
        uploadError.status = response.status;
        throw uploadError;
      }
      setPendingPaymentProof(null);
      if (json.data) {
        setSelectedRequestForDetail((prev) => {
          if (!prev || Number(prev.id) !== Number(requestId)) return prev;
          const existing = Array.isArray(prev.attachments) ? prev.attachments : [];
          if (existing.some((att) => Number(att.id) === Number(json.data.id))) return prev;
          return { ...prev, attachments: [...existing, json.data] };
        });
      }
      showToast("Payment proof uploaded", "Your receipt has been sent to the Registrar for verification.");
      await load();
    } catch (error) {
      showToast(
        formatErrorMessage(error, {
          title: "Could not upload receipt",
          description: "Check your connection and try again.",
        }),
        true
      );
    } finally {
      setPaymentUploadRequestId(null);
    }
  }, [load, showToast, setPendingPaymentProof, setSelectedRequestForDetail]);

  const handleDeletePaymentProof = useCallback(async (requestId, attachmentId) => {
    setRemovingAttachmentId(attachmentId);
    try {
      const response = await authFetch(`/api/document-requests/${requestId}/attachments/${attachmentId}`, {
        method: "DELETE",
      });
      const json = await response.json().catch(() => null);
      if (!response.ok || !json?.ok) {
        const deleteError = new Error(json?.error || "Unable to remove payment receipt.");
        deleteError.status = response.status;
        throw deleteError;
      }
      setSelectedRequestForDetail((prev) => {
        if (!prev || Number(prev.id) !== Number(requestId)) return prev;
        const existing = Array.isArray(prev.attachments) ? prev.attachments : [];
        return {
          ...prev,
          attachments: existing.filter((att) => Number(att.id) !== Number(attachmentId)),
        };
      });
      showToast("Receipt removed", "You can attach a new file if needed.");
      await load();
    } catch (error) {
      showToast(
        formatErrorMessage(error, {
          title: "Could not remove receipt",
          description: "Check your connection and try again.",
        }),
        true
      );
    } finally {
      setRemovingAttachmentId(null);
    }
  }, [load, showToast, setSelectedRequestForDetail]);

  useEffect(() => {
    const timer = setTimeout(() => {
      load().catch((error) => {
        showToast(
          formatErrorMessage(error, {
            title: "Could not load records",
            description: "Check your connection and refresh the page.",
          }),
          true
        );
      });
    }, 0);
    return () => clearTimeout(timer);
  }, [load, showToast]);

  useEffect(() => {
    if (me === null) {
      getClientSession()
        .then((session) => {
          if (session.status === 401) return;
          const authenticated = Boolean(session.ok && session.data);
          if (!canAccessPage("/student", session.data?.role, { authenticated })) {
            router.replace("/login");
          }
        })
        .catch(() => router.replace("/login"));
    }
  }, [me, router]);

  async function createRequest(event) {
    event.preventDefault();
    setRequestAttempted(true);
    setRequestSubmitting(true);
    try {
      const studentNo = String(requestForm.studentNo || "").trim().toUpperCase() || null;
      const docType = String(requestForm.docType || "").trim();
      const notes = String(requestForm.notes || "").trim();
      const clientType = getRequestAffiliation(me?.client_type || "Student", requestForm.clientType);
      const courseCode = String(requestForm.courseCode || "").trim().toUpperCase() || null;
      const requesterName = String(requestForm.requesterName || "").trim() || null;
      const requesterRelationship = String(requestForm.requesterRelationship || "").trim() || null;
      const requesterContact = String(requestForm.requesterContact || "").trim() || null;
      const attachments = Array.isArray(requestForm.attachments) ? requestForm.attachments : [];

      if (!clientType) {
        showToast("Choose who you are requesting for", "Select Student, Alumni, or Parent/Guardian.", true);
        return;
      }
      if (clientType === "Parent") {
        if (!studentNo) {
          showToast("Enter a student number", "Enter the student number of your child or ward.", true);
          return;
        }
        if (!requesterName) {
          showToast("Enter your full name", "Enter your full legal name as the parent or guardian.", true);
          return;
        }
        if (!requesterRelationship) {
          showToast("Select your relationship", "Choose your relationship to the student.", true);
          return;
        }
        const hasSpa = attachments.some(
          (a) => a.file && a.attachmentType === "spa"
        );
        const hasValidId = attachments.some(
          (a) => a.file && a.attachmentType === "valid_id"
        );
        if (!hasSpa || !hasValidId) {
          showToast("Attach authorization documents", "Attach a signed authorization letter or SPA and a valid government ID, and select the matching category for each file.", true);
          return;
        }
      }
      if (clientType === "Alumni" && !studentNo && !courseCode) {
        showToast("Select an academic program", "Choose your degree program to help locate your record.", true);
        return;
      }
      if (clientType === "Student" && !studentNo) {
        showToast("Enter a student number", "Enter your student number so the Registrar can locate your record.", true);
        return;
      }
      if (!docType) {
        showToast("Select a document type", "Choose the document you are requesting.", true);
        return;
      }
      if (!notes || notes.trim().length < 5) {
        showToast("Describe your purpose", "Enter a purpose of at least 5 characters.", true);
        return;
      }
      if (requesterContact) {
        const phoneCheck = PhoneSchema.safeParse(requesterContact);
        if (!phoneCheck.success) {
          showToast("Enter a valid mobile number", "Use a Philippine mobile number like 09171234567 or +639171234567.", true);
          return;
        }
      }
      if (studentNo) {
        const snCheck = StudentNoSchema.safeParse(studentNo);
        if (!snCheck.success) {
          showToast("Enter a valid student number", "Use a student number like 2024-00123-SJ-0.", true);
          return;
        }
      }

      const formData = new FormData();
      if (studentNo) formData.append("studentNo", studentNo);
      formData.append("docType", docType);
      formData.append("notes", notes);
      formData.append("clientType", clientType);
      if (courseCode) formData.append("courseCode", courseCode);
      if (requesterName) formData.append("requesterName", requesterName);
      if (requesterRelationship) formData.append("requesterRelationship", requesterRelationship);
      if (requesterContact) formData.append("requesterContact", requesterContact);

      attachments.forEach((att) => {
        if (att.file) {
          formData.append("files", att.file);
          formData.append("file_types", att.attachmentType || "evidence");
        }
      });

      const res = await fetch("/api/student/document-requests", {
        method: "POST",
        body: formData,
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        showToast(
          formatErrorMessage({ status: res.status, error: json?.error }, {
            title: "Could not submit request",
            description: "Check your entries and try again.",
          }),
          true
        );
        return;
      }
      setRequestAttempted(false);
      setRequestForm((prev) => ({
        ...prev,
        docType: "",
        notes: "",
        courseCode: "",
        studentNo: isParentAccount ? "" : me?.student_no || "",
        requesterName: "",
        requesterRelationship: "",
        requesterContact: "",
        attachments: [],
      }));
      showToast("Document request submitted", "Your request has been sent to the Registrar for review.");
      await load();
      if (json.data) {
        setFeedbackRequest(json.data);
        setFeedbackInitialRating(0);
        setFeedbackModalOpen(true);
      }
    } catch (error) {
      showToast(
        formatErrorMessage(error, {
          title: "Could not submit request",
          description: "Check your connection and try again.",
        }),
        true
      );
    } finally {
      setRequestSubmitting(false);
    }
  }

  const handleAddFiles = (e) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (!selectedFiles.length) return;
    const newItems = selectedFiles.map((file) => {
      let defaultType = "evidence";
      const nameLower = file.name.toLowerCase();
      if (requestForm.clientType === "Parent") {
        if (nameLower.includes("id") || nameLower.includes("valid") || nameLower.includes("passport") || nameLower.includes("license")) {
          defaultType = "valid_id";
        } else {
          defaultType = "spa";
        }
      } else {
        if (nameLower.includes("receipt") || nameLower.includes("pay") || nameLower.includes("proof")) {
          defaultType = "receipt";
        } else if (nameLower.includes("clearance")) {
          defaultType = "clearance";
        }
      }
      return {
        id: Math.random().toString(36).slice(2, 9),
        file,
        attachmentType: defaultType,
      };
    });
    setRequestForm((prev) => ({
      ...prev,
      attachments: [...prev.attachments, ...newItems].slice(0, 5),
    }));
    e.target.value = "";
  };

  const handleRemoveFile = (id) => {
    setRequestForm((prev) => ({
      ...prev,
      attachments: prev.attachments.filter((a) => a.id !== id),
    }));
  };

  const handleUpdateFileType = (id, type) => {
    setRequestForm((prev) => ({
      ...prev,
      attachments: prev.attachments.map((a) => (a.id === id ? { ...a, attachmentType: type } : a)),
    }));
  };

  const handleFeedbackSubmitted = (newFeedback) => {
    if (!newFeedback) return;
    setData((prev) => ({
      ...prev,
      requests: (prev.requests || []).map((req) =>
        Number(req.id) === Number(newFeedback.document_request_id)
          ? { ...req, feedback: newFeedback }
          : req
      ),
    }));
    setSelectedRequestForDetail((prev) =>
      prev && Number(prev.id) === Number(newFeedback.document_request_id)
        ? { ...prev, feedback: newFeedback }
        : prev
    );
  };

  async function submitProposal(event) {
    event.preventDefault();
    setProposalAttempted(true);
    if (!proposalForm.eventDate) {
      showToast("Select an event date", "Choose an event date before submitting.", true);
      return;
    }
    if (!isFutureManilaCalendarDate(proposalForm.eventDate)) {
      showToast("Select a future event date", "Choose a date after today in Manila time.", true);
      return;
    }
    setProposalSubmitting(true);
    try {
      const selectedOrg = selectedOsasOrganization;
      if (!selectedOrg) {
        throw new Error("Select an authorized organization before submitting a proposal.");
      }
      if (revisionTargetProposal && String(selectedOrg.organization_id) !== String(revisionTargetProposal.organization_id)) {
        throw new Error("A revision must be submitted under the proposal’s original organization.");
      }
      if (revisionTargetProposal && !proposalForm.file) {
        throw new Error("Upload the revised proposal PDF before submitting.");
      }
      const form = new FormData();
      form.set("title", proposalForm.title);
      form.set("organizationId", selectedOrg.organization_id);
      form.set("organizationName", selectedOrg.organization_name);
      form.set("eventDate", proposalForm.eventDate);
      if (proposalForm.file) form.set("file", proposalForm.file);

      const res = await fetch(
        revisionTargetProposal
          ? `/api/student/event-proposals/${revisionTargetProposal.id}`
          : "/api/student/event-proposals",
        { method: "POST", body: form }
      );
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        showToast(
          formatErrorMessage({ status: res.status, error: json?.error }, {
            title: "Could not submit proposal",
            description: "Check the requirements and try again.",
          }),
          true
        );
        return;
      }
      setProposalAttempted(false);
      setProposalForm({ title: "", eventDate: "", file: null });
      if (revisionTargetProposal) {
        setRevisionTargetProposal(null);
        setIsFormOpen(false);
        showToast("Revised proposal submitted", "Your updated proposal has been sent to OSAS under the same record.");
      } else {
        showToast("Event proposal submitted", "Your proposal has been sent to OSAS for review.");
      }
      await load();
    } catch (error) {
      showToast(
        formatErrorMessage(error, {
          title: "Could not submit proposal",
          description: "Check your connection and try again.",
        }),
        true
      );
    } finally { setProposalSubmitting(false); }
  }

  function focusOsasRevisionForm(open) {
    if (open || !osasRevisionFormTarget.current) return;
    const targetId = osasRevisionFormTarget.current;
    osasRevisionFormTarget.current = null;

    requestAnimationFrame(() => {
      const panel = document.getElementById(targetId);
      if (!panel) return;
      panel.querySelector("h2")?.focus({ preventScroll: true });
      panel.scrollIntoView({ block: "start", behavior: reduceMotion ? "instant" : "smooth" });
    });
  }

  function startProposalRevision(proposal) {
    const organizationId = String(proposal?.organization_id || "");
    const authorizedOrganization = myOrganizations.find((org) => String(org.organization_id) === organizationId);
    if (!authorizedOrganization) {
      showToast("Organization authorization required", "Contact OSAS to confirm that you can submit for this organization.", true);
      return;
    }
    handleOsasOrganizationChange(organizationId);
    setProposalAttempted(false);
    setProposalForm({
      title: proposal.title || "",
      eventDate: proposal.event_date ? String(proposal.event_date).slice(0, 10) : "",
      file: null,
    });
    osasRevisionFormTarget.current = "osas-proposal-form";
    setRevisionTargetProposal(proposal);
    setView("osas");
    setOsasSubView("proposals");
    setIsFormOpen(true);
    setSelectedProposalForDetail(null);
  }

  function closeProposalForm() {
    setIsFormOpen(false);
    if (revisionTargetProposal) {
      setRevisionTargetProposal(null);
      setProposalAttempted(false);
      setProposalForm({ title: "", eventDate: "", file: null });
    }
  }

  function startPostEventRevision(report) {
    osasRevisionFormTarget.current = "osas-post-event-form";
    setRevisionTargetReport(report);
    setPostEventAttempted(false);
    setPostEventForm({
      eventProposalId: String(report.event_proposal_id),
      actualAttendance: String(report.actual_attendance ?? ""),
      totalExpenses: String(report.total_expenses ?? ""),
      narrativeFile: null,
      liquidationFile: null,
    });
    setOsasSubView("post_event");
    setIsFormOpen(true);
    setSelectedPostEventReportForDetail(null);
  }

  function closePostEventForm() {
    setIsFormOpen(false);
    if (revisionTargetReport) {
      setRevisionTargetReport(null);
      setPostEventAttempted(false);
      setPostEventForm({ eventProposalId: "", actualAttendance: "", totalExpenses: "", narrativeFile: null, liquidationFile: null });
    }
  }

  async function submitPostEventReport(event) {
    event.preventDefault();
    setPostEventAttempted(true);
    setPostEventSubmitting(true);
    try {
      const selectedOrg = selectedOsasOrganization;
      if (!selectedOrg) {
        throw new Error("Select an authorized organization before submitting a post-event report.");
      }
      if (!revisionTargetReport && !hasSelectedApprovedProposal) {
        throw new Error("Please select an approved event proposal.");
      }
      if (revisionTargetReport) {
        const message = validatePostEventRevision(revisionTargetReport, {
          narrative: postEventForm.narrativeFile,
          liquidation: postEventForm.liquidationFile,
          actualAttendance: Number(postEventForm.actualAttendance),
          totalExpenses: Number(postEventForm.totalExpenses),
        });
        if (message) throw new Error(message);
      } else if (!postEventForm.narrativeFile) {
        throw new Error("Please upload the Post-Event Narrative Report PDF.");
      }
      const maxPostEventPdfBytes = 25 * 1024 * 1024;
      if (postEventForm.narrativeFile && (!postEventForm.narrativeFile.size || postEventForm.narrativeFile.size > maxPostEventPdfBytes)) {
        throw new Error("Narrative report PDF exceeds the 25 MB limit. Please compress the file.");
      }
      if (postEventForm.liquidationFile && (!postEventForm.liquidationFile.size || postEventForm.liquidationFile.size > maxPostEventPdfBytes)) {
        throw new Error("Liquidation report PDF exceeds the 25 MB limit. Please compress the file.");
      }
      const form = new FormData();
      if (revisionTargetReport) {
        form.set("revisionReportId", String(revisionTargetReport.id));
        if (revisionTargetReport.updated_at) form.set("revisionUpdatedAt", revisionTargetReport.updated_at);
      }
      form.set("eventProposalId", postEventForm.eventProposalId);
      form.set("organizationId", selectedOrg.organization_id);
      form.set("actualAttendance", postEventForm.actualAttendance || "0");
      form.set("totalExpenses", postEventForm.totalExpenses || "0.00");
      if (postEventForm.narrativeFile) form.set("narrativeFile", postEventForm.narrativeFile);
      if (postEventForm.liquidationFile) {
        form.set("liquidationFile", postEventForm.liquidationFile);
      }

      const res = await fetch("/api/student/post-event-reports", { method: "POST", body: form });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        showToast(
          formatErrorMessage({ status: res.status, error: json?.error }, {
            title: "Could not submit report",
            description: "Check that the required PDFs are attached and try again.",
          }),
          true
        );
        return;
      }
      setPostEventAttempted(false);
      setPostEventForm({
        eventProposalId: "",
        actualAttendance: "",
        totalExpenses: "",
        narrativeFile: null,
        liquidationFile: null,
      });
      if (revisionTargetReport) closePostEventForm();
      showToast(revisionTargetReport ? "Post-event report resubmitted" : "Post-event report submitted", "Your report has been sent to OSAS.");
      await load();
    } catch (error) {
      showToast(
        formatErrorMessage(error, {
          title: "Could not submit report",
          description: "Check the file sizes and your connection, then try again.",
        }),
        true
      );
    } finally {
      setPostEventSubmitting(false);
    }
  }

  const loadCblData = useCallback(async (orgId) => {
    if (!orgId) return;
    const request = ++cblLoadRequest.current;
    setCblLoading(true);
    try {
      const res = await fetch(`/api/student/organizations/${orgId}/bylaws`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok || !json?.ok || !Array.isArray(json.data?.versions)) {
        throw new Error("Unable to load charter history.");
      }
      if (request !== cblLoadRequest.current) return;
      setCblOrgData(json.data.organization || null);
      setCblVersions(json.data.versions);
      setCblLoadFailed(false);
    } catch {
      if (request === cblLoadRequest.current) setCblLoadFailed(true);
    } finally {
      if (request === cblLoadRequest.current) setCblLoading(false);
    }
  }, []);

  useEffect(() => {
    if (osasSubView === "cbl" && selectedOsasOrgId) {
      const timer = setTimeout(() => loadCblData(selectedOsasOrgId), 0);
      return () => clearTimeout(timer);
    }
  }, [osasSubView, selectedOsasOrgId, loadCblData]);

  function startCblRevision(version) {
    setCblAttempted(false);
    setCblForm({
      versionTag: version.version_tag || "",
      amendmentSummary: version.amendment_summary || "",
      file: null,
    });
    osasRevisionFormTarget.current = "osas-charter-form";
    setOsasSubView("cbl");
    setIsFormOpen(true);
    setSelectedCblVersionForDetail(null);
  }

  async function submitCbl(event) {
    event.preventDefault();
    setCblAttempted(true);
    setCblSubmitting(true);
    try {
      const selectedOrg = selectedOsasOrganization;
      if (!selectedOrg) {
        throw new Error("Select an authorized organization before submitting Constitution and By-Laws documents.");
      }
      if (!cblForm.file) {
        throw new Error("Please upload the Constitution & By-Laws PDF document.");
      }
      const form = new FormData();
      form.set("versionTag", cblForm.versionTag.trim() || `Amendment ${new Date().getFullYear()}`);
      form.set("amendmentSummary", cblForm.amendmentSummary.trim() || "");
      form.set("file", cblForm.file);

      const res = await fetch(`/api/student/organizations/${selectedOrg.organization_id}/bylaws`, {
        method: "POST",
        body: form,
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        showToast(
          formatErrorMessage({ status: res.status, error: json?.error }, {
            title: "Could not submit by-laws",
            description: "Check your file and try again.",
          }),
          true
        );
        return;
      }
      setCblAttempted(false);
      setCblForm({
        versionTag: "",
        amendmentSummary: "",
        file: null,
      });
      setIsFormOpen(false);
      showToast("By-laws submitted", "Your Constitution and By-Laws document has been sent to OSAS for review.");
      await loadCblData(selectedOrg.organization_id);
    } catch (error) {
      showToast(
        formatErrorMessage(error, {
          title: "Could not submit by-laws",
          description: "Check your file and connection, then try again.",
        }),
        true
      );
    } finally {
      setCblSubmitting(false);
    }
  }

  if (!me || (loading && !hasLoaded)) {
    const requestedView = normalizeStudentTab(searchParams?.get("view"));
    return <InitialDashboardLoader><StudentDashboardSkeleton view={me ? view : requestedView} /></InitialDashboardLoader>;
  }

  const readyRequestsCount = (data.requests || []).filter(
    (r) => String(r.status || "").toLowerCase().trim() === "ready"
  ).length;

  const missingComplianceCount = complianceData?.summary?.missingCount || 0;

  const osasActionCount =
    (data.proposals || []).filter((p) => {
      const s = String(p.status || "").toLowerCase().trim();
      return s === "needs revision" || s === "revisionsrequested" || s === "revision";
    }).length + (pendingPostEvents || []).length;

  const sidebarItems = [
    { key: "overview", label: "Overview", iconClass: " LayoutGridIcon" },
    { key: "notifications", label: "Notifications", iconClass: " Notification01Icon", badge: unreadNotifications || undefined },
    { type: "header", label: "Academic Records" },
    {
      key: "odrs",
      label: "Document Requests",
      iconClass: " FileUploadIcon",
      badge: readyRequestsCount > 0 ? readyRequestsCount : undefined,
    },
    ...(canUseStudentModules ? [
    {
      key: "compliance",
      label: "Document Checklist",
      iconClass: " ClipboardIcon",
      badge: missingComplianceCount > 0 ? missingComplianceCount : undefined,
    },
    { type: "header", label: "Student Affairs" },
    {
      key: "osas",
      label: "OSAS Submissions",
      iconClass: " StudentIcon",
      badge: osasActionCount > 0 ? osasActionCount : undefined,
    },
    ] : []),
  ];

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    window.location.href = "/login";
  }

  return (
    <TooltipProvider delayDuration={200}>
      {inquiryOpen && ["Parent", "Alumni"].includes(me.client_type) && (
        <MissingDocumentsInquiryDialog user={me} courses={courses} onClose={() => setInquiryOpen(false)}
          onSubmitted={() => {
            setInquiryOpen(false);
            showToast("Inquiry submitted", "Follow the Registrar’s review in Document requests.");
            load();
          }} />
      )}
      {me.portal_setup_complete === false && (
        <PortalAccountSetupDialog user={me} required onSave={async () => {
          invalidateClientSession();
          await load();
        }} />
      )}
      <div className="relative flex h-screen min-h-0 flex-col overflow-hidden bg-slate-50/30 font-jakarta dark:bg-zinc-950/30">
        {/* Shared dashboard liquid-gradient background with subtle opacity */}
        <div className="liquid-container pointer-events-none opacity-20 dark:opacity-10">
          <div className="liquid-blob liquid-blob-1" />
          <div className="liquid-blob liquid-blob-2" />
          <div className="liquid-blob liquid-blob-3" />
        </div>
        <div
          className="flex-1 h-full w-full flex min-h-0 overflow-hidden flex-col md:flex-row"
          style={zoomStyle}
        >
        <Sidebar
          open={sidebarOpen}
          items={sidebarItems}
          activeKey={view}
          onSelect={(key) => switchView(key)}
          onLogout={handleLogout}
          zoomNode={zoomNode}
          setZoomNode={setZoomNode}
          handleZoomMouseDown={handleZoomMouseDown}
          accentColor="#800000"
          officeName={isParentAccount || me.client_type === "Alumni" ? "Records Portal" : "Student Portal"}
          authUser={me}
          bottomContent={
            <StudentSidebarFeedbackCard
              open={sidebarOpen}
              requests={data.requests}
              onRateRequest={(req, prefillRating) => {
                setFeedbackRequest(req);
                setFeedbackInitialRating(prefillRating || 0);
                setFeedbackModalOpen(true);
              }}
            />
          }
        />
          <main className="relative w-full min-w-0 min-h-0 flex-1 overflow-y-auto bg-white dark:bg-zinc-950/50 flex flex-col">
            <div
              className="p-2 md:pl-1 flex flex-[1_0_auto] min-h-full flex-col w-full"
            >
              <div className="w-full flex flex-[1_0_auto] flex-col [&>*]:flex-[1_0_auto]">
                <ContentSwap id={view} className="w-full flex flex-[1_0_auto] flex-col [&>*]:flex-[1_0_auto]">
              {view === "overview" ? (
                <StudentOverviewTab
                  authUser={me}
                  data={data}
                  complianceData={complianceData}
                  myOrganizations={myOrganizations}
                  pendingPostEvents={pendingPostEvents}
                  postEventReports={postEventReports}
                  onNavigate={(targetView) => switchView(targetView)}
                  onSelectRequest={(req) => setSelectedRequestForDetail(req)}
                  onSelectProposal={(prop) => setSelectedProposalForDetail(prop)}
                  onNewRequest={() => {
                    switchView("odrs");
                    setIsFormOpen(true);
                  }}
                  onRefresh={async () => {
                    setRefreshing(true);
                    try {
                      await load();
                    } finally {
                      setRefreshing(false);
                    }
                  }}
                  refreshing={refreshing}
                  loading={loading}
                  hasLoaded={hasLoaded}
                />
              ) : view === "compliance" && canUseStudentModules ? (
                <StudentComplianceTab
                  authUser={me}
                  onChecklistChange={setComplianceData}
                  onStudentNumberSaved={(number) => {
                    invalidateClientSession();
                    setMe((current) => ({ ...current, checklist_student_no: number }));
                  }}
                />
              ) : view === "notifications" ? (
                <StudentNotifications onUnreadChange={setUnreadNotifications} />
              ) : view === "activity" ? (
                <MyActivityPanel />
              ) : view === "settings" ? (
                <AccountSettingsPanel />
              ) : view === "odrs" ? (
                <div className="flex flex-[1_0_auto] flex-col w-full">
                  {/* ONE Single Card Container encapsulating Header, Inline Request Form, Toolbar, Active Filters, Table & Pagination */}
                  <Card
                    className="flex flex-[1_0_auto] h-auto w-full flex-col p-0 gap-0 overflow-hidden rounded-2xl border border-border bg-white shadow-sm dark:border-border dark:bg-card dark:shadow-none isolate font-jakarta focus:outline-none"
                    onKeyDown={handleKeyDown}
                    tabIndex={0}
                  >
                    {/* 1. Page Header */}
                    <PageHeader
                      icon="InboxIcon"
                      title={
                        <div className="flex flex-wrap items-baseline gap-2">
                          <span>Document requests</span>
                          <span className="text-[11px] font-normal tracking-normal text-gray-500 dark:text-zinc-400 tabular-nums">
                            {filteredRequests.length} {filteredRequests.length === 1 ? "record" : "records"}
                            {me?.student_no ? ` · ${me.student_no}` : ""}
                          </span>
                        </div>
                      }
                      description="Request official academic records and track Registrar processing updates."
                      className="p-6"
                      titleClassName="text-[18px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50"
                      descriptionClassName="text-[13px] font-normal text-gray-500 dark:text-zinc-400 mt-[4px]"
                      actions={
                        <div className="flex items-center gap-2">
                          <RefreshButton
                            onRefresh={async () => {
                              setRefreshing(true);
                              try {
                                await load();
                              } finally {
                                setRefreshing(false);
                              }
                            }}
                            isLoading={refreshing}
                            title="Refresh records"
                          />
                          
                          {["Parent", "Alumni"].includes(me.client_type) && (
                            <Button size="sm" variant="outline" onClick={() => setInquiryOpen(true)}>Check for missing documents</Button>
                          )}
                          {!isFormOpen && (
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => setIsFormOpen(true)}
                              className="h-9 shrink-0 px-4 text-xs font-semibold rounded-xl cursor-pointer"
                              title="Open request form"
                            >
                              {isParentAccount ? "Request for a student" : "Open request form"}
                            </Button>
                          )}
                        </div>
                      }
                    />

                    {/* 2. Inline Non-Modal Request Form Section */}
                    <AnimatePresence initial={false}>
                      {isFormOpen && (
                        <ExpandablePanel key="document-request-form" reduceMotion={reduceMotion}>
                          {!isDuplicateAlertDismissed && (
                            <CampusStatusNotice
                              title="Avoid duplicate requests"
                              imageSizes="100vw"
                              onDismiss={handleDismissDuplicateAlert}
                            >
                              Submit one request per concern to help the Registrar process it promptly.
                            </CampusStatusNotice>
                          )}

                          <div className="p-5 sm:p-6">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border dark:border-border">
                              <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-pup-maroon dark:bg-red-950/40 dark:text-red-400">
                                  <AddCircleIcon size="1em" className="text-xl" />
                                </div>
                                <div>
                                  <h2 className="text-[15px] font-semibold text-gray-900 dark:text-zinc-50">{requestForm.clientType === "Parent" ? "Request for a student" : "New document request"}</h2>
                                  <p className="text-xs text-gray-500 dark:text-zinc-400">Request an academic document from the Registrar.</p>
                                </div>
                              </div>
                            </div>

                          <form onInvalid={() => setRequestAttempted(true)} onSubmit={createRequest} className="flex flex-col gap-4 mt-4">
                            {/* Parent / Legal Guardian Compliance Notice */}
                            {requestForm.clientType === "Parent" && (
                              <CampusStatusNotice tone="warning" title="What you need for this request" imageSizes="100vw">
                                <ul className="list-disc space-y-1 pl-4">
                                  <li>The student’s student number</li>
                                  <li>A signed authorization letter or Special Power of Attorney (SPA)</li>
                                  <li>A copy of a valid government ID</li>
                                </ul>
                                <p>The Registrar reviews your authorization with the request.</p>
                              </CampusStatusNotice>
                            )}

                            {/* Top Row: Client Type, Student Number, Academic Program, Document Type */}
                            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                              {/* Client Type */}
                              <div className="min-w-0">
                                <label htmlFor="student-client-type" className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-zinc-200">
                                  Requesting as
                                </label>
                                <Select
                                  id="student-client-type"
                                  value={requestForm.clientType}
                                  disabled={isParentAccount}
                                  onChange={(e) => {
                                    const clientType = e.target.value;
                                    setRequestForm((prev) => ({
                                      ...prev,
                                      clientType,
                                      studentNo: clientType === "Parent" ? "" : me?.student_no || "",
                                      attachments: prev.attachments.filter(({ attachmentType }) =>
                                        attachmentType !== "spa" && attachmentType !== "valid_id"
                                      ),
                                    }));
                                  }}
                                  className="h-10 w-full rounded-xl text-xs font-normal text-gray-800 dark:text-zinc-100 border border-border dark:border-border bg-white dark:bg-zinc-800 shadow-none focus-visible:outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus-visible:border-red-500/80 dark:focus-visible:ring-red-500/80"
                                >
                                  {STUDENT_AFFILIATIONS.map(({ value, label }) => (
                                    <option key={value} value={value}>{label}</option>
                                  ))}
                                </Select>
                              </div>

                              {/* Student Number */}
                              <div className="min-w-0">
                                <div className="flex items-center justify-between mb-1.5">
                                  <label htmlFor="student-id-input" className="text-xs font-semibold text-gray-700 dark:text-zinc-200">
                                    {requestForm.clientType === "Parent" ? "Student’s student number" : "Student number"} {requestForm.clientType === "Alumni" ? <span className="normal-case tracking-normal opacity-70">(optional)</span> : ""}
                                  </label>
                                </div>
                                <Input
                                  id="student-id-input"
                                  aria-invalid={(requestAttempted && Boolean(requestForm.studentNo?.trim()) && !StudentNoSchema.safeParse(requestForm.studentNo.trim()).success) || undefined}
                                  required={requestForm.clientType !== "Alumni"}
                                  type="text"
                                  placeholder={
                                    requestForm.clientType === "Parent"
                                      ? "Child/Ward ID (YYYY-XXXXX-SJ-0)"
                                      : requestForm.clientType === "Alumni"
                                      ? "Optional if forgotten"
                                      : "YYYY-XXXXX-SJ-0"
                                  }
                                  value={requestForm.studentNo || ""}
                                  readOnly={Boolean(me?.student_no) && requestForm.clientType !== "Parent"}
                                  onChange={(e) => setRequestForm({ ...requestForm, studentNo: e.target.value })}
                                  className="h-10 w-full rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 px-3 text-xs text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 shadow-none outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus-visible:border-red-500/80 dark:focus-visible:ring-red-500/80"
                                />
                              </div>

                              {/* Academic Program (Alumni only) */}
                              {requestForm.clientType === "Alumni" && (
                                <div className="min-w-0">
                                  <label htmlFor="student-course-select" className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-zinc-200">
                                    Academic program
                                  </label>
                                  <Select placeholder="Select degree program"
                                    id="student-course-select"
                                  required={!requestForm.studentNo?.trim()}
                                    value={requestForm.courseCode || ""}
                                    onChange={(e) => setRequestForm({ ...requestForm, courseCode: e.target.value })}
                                    className="h-10 w-full rounded-xl text-xs font-normal border border-border dark:border-border bg-white dark:bg-zinc-800 shadow-none text-gray-800 dark:text-zinc-100 focus-visible:outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus-visible:border-red-500/80 dark:focus-visible:ring-red-500/80"
                                  >
                                    {courses.map((c) => (
                                      <option key={c.code} value={c.code}>
                                        {c.code} - {c.name}
                                      </option>
                                    ))}
                                  </Select>
                                </div>
                              )}

                              {/* Document Type */}
                              <div className={cn("min-w-0", requestForm.clientType === "Alumni" ? "lg:col-span-1" : "md:col-span-1 lg:col-span-2")}>
                                <label htmlFor="student-document-type" className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-zinc-200">
                                  Document type
                                </label>
                                <Select
                                  id="student-document-type"
                                  required
                                  aria-describedby="student-document-type-help"
                                  disabled={docTypes.length === 0}
                                  value={requestForm.docType}
                                  placeholder="Select a document type"
                                  onChange={(e) => setRequestForm({ ...requestForm, docType: e.target.value })}
                                  className={`h-10 w-full rounded-xl text-xs font-normal border border-border dark:border-border bg-white dark:bg-zinc-800 shadow-none focus-visible:outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus-visible:border-red-500/80 dark:focus-visible:ring-red-500/80 ${
                                    !requestForm.docType ? "text-gray-400 dark:text-zinc-500" : "text-gray-800 dark:text-zinc-100"
                                  }`}
                                >
                                  {docTypes.map((type) => (
                                    <option key={type} value={type}>
                                      {type}
                                    </option>
                                  ))}
                                </Select>
                                {docTypes.length === 0 ? (
                                  <p id="student-document-type-help" className="mt-1 text-xs text-amber-700 dark:text-amber-400">No active requestable Registrar document types are available.</p>
                                ) : (
                                  <p id="student-document-type-help" className="mt-1.5 text-[11px] text-gray-500 dark:text-zinc-400">
                                    Only university-issued credentials and certifications may be requested here.
                                    {requestForm.clientType === "Student" && " For enrollment records, open Document Checklist."}
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Parent / Legal Guardian Specific Identity Fields */}
                            {requestForm.clientType === "Parent" && (
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
                                <div className="min-w-0">
                                  <label htmlFor="parent-name-input" className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-zinc-200">
                                    Parent or guardian full name
                                  </label>
                                  <Input
                                    id="parent-name-input"
                                    type="text"
                                    placeholder="Maria Santos Dela Cruz"
                                    value={requestForm.requesterName || ""}
                                    onChange={(e) => setRequestForm({ ...requestForm, requesterName: e.target.value })}
                                    required
                                    className="h-10 w-full rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 px-3 text-xs text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 shadow-none outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus-visible:border-red-500/80 dark:focus-visible:ring-red-500/80"
                                  />
                                </div>

                                <div className="min-w-0">
                                  <label htmlFor="parent-relationship-select" className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-zinc-200">
                                    Relationship to student
                                  </label>
                                  <Select placeholder="Select a relationship"
                                    id="parent-relationship-select"
                                    required
                                    value={requestForm.requesterRelationship}
                                    onChange={(e) => setRequestForm({ ...requestForm, requesterRelationship: e.target.value })}
                                    className="h-10 w-full rounded-xl text-xs font-normal border border-border dark:border-border bg-white dark:bg-zinc-800 shadow-none text-gray-800 dark:text-zinc-100 focus-visible:outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus-visible:border-red-500/80 dark:focus-visible:ring-red-500/80"
                                  >
                                    <option value="Mother">Mother</option>
                                    <option value="Father">Father</option>
                                    <option value="Legal Guardian">Legal Guardian</option>
                                    <option value="Authorized Representative">Authorized Representative</option>
                                  </Select>
                                </div>

                                <div className="min-w-0">
                                  <label htmlFor="parent-contact-input" className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-zinc-200">
                                    Mobile number <span className="normal-case tracking-normal opacity-70">(optional)</span>
                                  </label>
                                  <Input
                                    id="parent-contact-input"
                                    aria-invalid={(requestAttempted && Boolean(requestForm.requesterContact?.trim()) && !PhoneSchema.safeParse(requestForm.requesterContact.trim()).success) || undefined}
                                    type="text"
                                    placeholder="0917-123-4567"
                                    value={requestForm.requesterContact || ""}
                                    onChange={(e) => setRequestForm({ ...requestForm, requesterContact: e.target.value })}
                                    className="h-10 w-full rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 px-3 text-xs text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 shadow-none outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus-visible:border-red-500/80 dark:focus-visible:ring-red-500/80"
                                  />
                                </div>
                              </div>
                            )}

                            {/* Description / Purpose */}
                            <div>
                              <label htmlFor="student-request-description" className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-zinc-200">
                                Purpose
                              </label>
                              <Textarea
                                id="student-request-description"
                                aria-invalid={(requestAttempted && requestForm.notes.trim().length < 5) || undefined}
                                required
                                rows={2}
                                className="min-h-[72px] resize-none"
                                placeholder="Employment verification, board exam, or transfer credentials"
                                value={requestForm.notes}
                                minLength={5}
                                maxLength={1000}
                                onChange={(e) => setRequestForm({ ...requestForm, notes: e.target.value })}
                              />
                            </div>

                            {/* Supporting Documents & Attachments Dropzone */}
                            <FileAttachmentDropzone
                              heading={
                                <div className="text-xs font-semibold text-gray-700 dark:text-zinc-200 flex flex-wrap items-center gap-1.5">
                                  <span>Supporting documents</span>
                                  {requestForm.clientType === "Parent" ? (
                                    <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400">(SPA & valid ID required)</span>
                                  ) : (
                                    <span className="normal-case tracking-normal opacity-70">(optional)</span>
                                  )}
                                </div>
                              }
                              animateCards={false}
                              invalid={requestAttempted && requestForm.clientType === "Parent" && ["spa", "valid_id"].some(
                                (type) => !requestForm.attachments.some((item) => item.file && item.attachmentType === type)
                              )}
                              value={requestForm.attachments}
                              onChange={(val) => {
                                if (typeof val === "function") {
                                  setRequestForm((prev) => ({ ...prev, attachments: val(prev.attachments) }));
                                } else {
                                  setRequestForm((prev) => ({ ...prev, attachments: val || [] }));
                                }
                              }}
                              mode="multiple"
                              maxFiles={5}
                              categories={
                                requestForm.clientType === "Parent"
                                  ? [
                                      { value: "spa", label: "Authorization Letter or SPA" },
                                      { value: "valid_id", label: "Valid Government ID" },
                                      { value: "evidence", label: "Supporting Evidence" },
                                      { value: "receipt", label: "Proof of Payment" },
                                      { value: "other", label: "Other Document" },
                                    ]
                                  : [
                                      { value: "evidence", label: "Supporting Evidence" },
                                      { value: "receipt", label: "Proof of Payment / Receipt" },
                                      { value: "clearance", label: "Clearance Slip" },
                                      { value: "other", label: "Other Document" },
                                    ]
                              }
                              title={
                                requestForm.clientType === "Parent"
                                  ? "Drop SPA letter & government ID here, or browse"
                                  : "Drop supporting documents or receipts here, or browse"
                              }
                              subtitle="PDF, PNG, JPG, or WEBP up to 10MB each (max 5 files)"
                              accept=".pdf,.png,.jpg,.jpeg,.webp"
                            />

                            {/* Form Actions */}
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
                              <span className="text-xs text-gray-500 dark:text-zinc-400">
                                Requests are received and reviewed in order by the Registrar Office.
                              </span>
                              <div className="flex items-center gap-2.5 w-full sm:w-auto">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => { setRequestAttempted(false); setIsFormOpen(false); }}
                                  className="w-full sm:w-auto h-9 px-4 text-xs font-semibold rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"
                                >
                                  Hide
                                </Button>
                                <Button
                                  type="submit"
                                  size="sm"
                                  disabled={requestSubmitting || docTypes.length === 0}
                                  title="Submit request"
                                  className="w-full sm:w-auto h-9 px-4 gap-2 flex items-center justify-center cursor-pointer border-0"
                                >
                                  {requestSubmitting ? (
                                    <>
                                      <Loading01Icon size="1em"  className="animate-spin text-sm"></Loading01Icon>
                                      Submitting…
                                    </>
                                  ) : (
                                    "Submit request"
                                  )}
                                </Button>
                              </div>
                            </div>
                          </form>
                          </div>
                        </ExpandablePanel>
                      )}
                    </AnimatePresence>

                    {/* 3. Toolbar & Request History Header */}
                    <DataViewToolbar label="Request history search and controls" className="p-4 sm:px-5 sm:py-3 gap-2 bg-white dark:bg-card flex flex-wrap items-center justify-between select-none">
                      {/* Left: DashboardSearch */}
                      <div className="flex min-w-0 items-center gap-2">
                        <DashboardSearch
                          value={requestSearch}
                          onChange={(val) => {
                            setRequestSearch(val);
                            setCurrentPage(1);
                          }}
                          count={filteredRequests.length}
                          loading={loading}
                          placeholder="Search ticket, document, or notes"
                          label="Search requests"
                        />
                      </div>

                      {/* Right: Filter -> Sort -> Group -> DateRange */}
                      <div className="ml-auto flex shrink-0 items-center gap-2">
                        <FilterPopover
                          fields={requestFilterFields}
                          filters={requestFilterRules}
                          onFiltersChange={(newRules) => {
                            setRequestFilterRules(newRules);
                            setCurrentPage(1);
                          }}
                          entityLabel="requests"
                        />
                        <SortPopover
                          options={requestSortOptions}
                          sortBy={sortBy}
                          onSortByChange={(val) => {
                            setSortBy(val);
                            setCurrentPage(1);
                          }}
                          sortOrder={sortOrder}
                          onSortOrderChange={(val) => {
                            setSortOrder(val);
                            setCurrentPage(1);
                          }}
                        />
                        <GroupPopover
                          options={requestGroupOptions}
                          groupBy={requestGroupBy}
                          onGroupByChange={(val) => {
                            setRequestGroupBy(val);
                            setCurrentPage(1);
                          }}
                        />
                        <DateRangeFilterButton
                          startDate={requestStartDate}
                          endDate={requestEndDate}
                          onApply={({ startDate: s, endDate: e }) => {
                            setRequestStartDate(s);
                            setRequestEndDate(e);
                            setCurrentPage(1);
                          }}
                          onClear={() => {
                            setRequestStartDate("");
                            setRequestEndDate("");
                            setCurrentPage(1);
                          }}
                          disableFutureDates={true}
                        />
                      </div>
                    </DataViewToolbar>

                    {/* 4. Active Filter Chips Bar */}
                    <ActiveFilterChips
                      chips={requestActiveChips}
                      searchQuery={requestSearch}
                      onClearSearch={() => { setRequestSearch(""); setCurrentPage(1); }}
                      onClearAll={clearRequestFilters}
                      className="border-t border-border dark:border-border bg-white dark:bg-card px-6 py-2.5"
                    />

                    {/* 5. Request History List / Empty State */}
                    {loading && !hasLoaded ? (
                      <div className="w-full flex-1 border-t border-border">
                        <StudentRequestsTableRowsSkeleton rowCount={Math.min(itemsPerPage || 6, 6)} density={density} />
                      </div>
                    ) : requestLoadFailed && sortedRequests.length === 0 ? (
                      <EmptyState
                        className="border-t border-border"
                        icon={Alert01Icon}
                        title="Could not load document requests"
                        description="Try loading your request history again."
                      >
                        <Button variant="outline" size="sm" onClick={() => load()} disabled={loading}>
                          Try again
                        </Button>
                      </EmptyState>
                    ) : sortedRequests.length === 0 ? (
                      <EmptyState
                        className="border-t border-border"
                        icon={hasActiveFilters ? EmptySearch01Icon : EmptyInboxIcon}
                        title={hasActiveFilters ? "No matches found" : "No document requests yet"}
                        description={hasActiveFilters
                          ? "Adjust your search or reset your filters."
                          : "Your submitted document requests will appear here."}
                      >
                        {hasActiveFilters ? (
                          <Button variant="outline" size="sm" onClick={clearRequestFilters}>
                            Reset filters
                          </Button>
                        ) : !isFormOpen ? (
                          <Button size="sm" onClick={() => setIsFormOpen(true)}>
                            Open request form
                          </Button>
                        ) : null}
                      </EmptyState>
                    ) : (
                      <div className="w-full flex-1 border-t border-border divide-y divide-border bg-white dark:bg-card font-jakarta">
                        {groupedPaginatedRequests.map((group) => {
                          const isGrouped = Boolean(group.label && requestGroupBy !== "none");
                          const isCollapsed = Boolean(collapsedRequestGroups[group.key]);

                          return (
                            <section key={group.key || "root"} className="flex flex-col">
                              {isGrouped && (
                                <DataGroupHeader label={group.label} count={group.items.length}
                                  collapsed={isCollapsed} onToggle={() => toggleRequestGroup(group.key)} />
                              )}

                              {!isCollapsed && (
                                <div role="list" className="w-full divide-y divide-gray-100 dark:divide-zinc-800/60">
                                  {group.items.map((item) => (
                                    <article
                                      key={item.id}
                                      role="listitem"
                                      tabIndex={0}
                                      onClick={() => setSelectedRequestForDetail(item)}
                                      onKeyDown={(event) => {
                                        if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) {
                                          event.preventDefault();
                                          setSelectedRequestForDetail(item);
                                        }
                                      }}
                                      className={cn(
                                        "group flex cursor-pointer items-center justify-between border-b border-gray-100 transition-colors hover:bg-gray-50/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-pup-maroon dark:border-zinc-800/60 dark:hover:bg-zinc-800/40",
                                        requestListDensity.paddingX,
                                        requestListDensity.paddingY,
                                        requestListDensity.gap,
                                        requestListDensity.minHeight,
                                        ["Deficient", "PendingPayment"].includes(item.status) && "border-l-2 border-l-amber-500 bg-amber-50/60 dark:bg-amber-950/20"
                                      )}
                                    >
                                      <div className="mr-2 flex min-w-0 flex-1 items-center gap-2.5 sm:gap-3">
                                        <span className="min-w-[70px] shrink-0 select-none font-sans text-xs font-medium tabular-nums text-gray-500 dark:text-zinc-400">{formatRequestReference(item.id)}</span>
                                        <span className="max-w-[200px] shrink-0 truncate text-xs font-medium text-gray-900 transition-colors group-hover:text-[#800000] dark:text-zinc-100 dark:group-hover:text-red-400 sm:max-w-[320px] sm:text-sm lg:max-w-md">
                                          {item.doc_type || "Document Request"}
                                        </span>
                                        {item.client_type === "Parent" && (
                                          <span className={cn(BADGE_BASE, BADGE_PALETTES.amber)}>Parent/Guardian</span>
                                        )}
                                        {(Number(item.attachment_count) > 0 || (Array.isArray(item.attachments) && item.attachments.length > 0)) && (() => {
                                          const attachmentCount = item.attachment_count || item.attachments?.length || 0;
                                          return (
                                            <span
                                              className={cn(BADGE_BASE, BADGE_PALETTES.slate, "shrink-0 tabular-nums")}
                                              title={`${attachmentCount} ${attachmentCount === 1 ? "attachment" : "attachments"}`}
                                            >
                                              <Attachment01Icon size="1em" className="text-[11px]" />
                                              {attachmentCount}
                                            </span>
                                          );
                                        })()}
                                        <span className="hidden truncate text-xs font-normal text-gray-400 dark:text-zinc-500 md:inline">
                                          · {item.notes ? <NarrativeText text={item.notes} mode="compact" /> : "Document request"}
                                        </span>
                                      </div>

                                      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2" onClick={(event) => event.stopPropagation()}>
                                        <StatusBadge status={item.status} />
                                        {item.created_at && (() => {
                                          const relativeTime = formatRelativeTime(item.created_at);
                                          return (
                                            <Tooltip>
                                              <TooltipTrigger asChild>
                                                <span className="ml-1 hidden shrink-0 text-[11px] font-normal tabular-nums text-gray-400 dark:text-zinc-500 sm:inline">
                                                  {relativeTime.relative || relativeTime.date}
                                                </span>
                                              </TooltipTrigger>
                                              <TooltipContent>Requested on {formatPHDateTime(item.created_at)}</TooltipContent>
                                            </Tooltip>
                                          );
                                        })()}
                                        <div className="flex items-center gap-1">
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  setFeedbackRequest(item);
                                                  setFeedbackInitialRating(item.feedback?.rating || 0);
                                                  setFeedbackModalOpen(true);
                                                }}
                                                aria-label={item.feedback ? `Rated ${item.feedback.rating}/5 stars. Edit feedback.` : "Rate service"}
                                                className={cn("table-action-button rounded-lg active:scale-95 cursor-pointer", item.feedback && "opacity-100!")}
                                              >
                                                <StarIcon size={16} aria-hidden="true" className={item.feedback ? "fill-current text-amber-600 dark:text-amber-400" : undefined} />
                                              </button>
                                            </TooltipTrigger>
                                            <TooltipContent>{item.feedback ? `Rated ${item.feedback.rating}/5 stars. Edit feedback.` : "Rate service"}</TooltipContent>
                                          </Tooltip>
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <button
                                                type="button"
                                                onClick={() => setSelectedRequestForDetail(item)}
                                                aria-label="View request updates timeline"
                                                className="table-action-button rounded-lg text-gray-500 hover:text-pup-maroon dark:text-zinc-400 dark:hover:text-red-400 active:scale-95 cursor-pointer"
                                              >
                                                <Time01Icon size="1em" className="text-[15px]" />
                                              </button>
                                            </TooltipTrigger>
                                            <TooltipContent>View timeline</TooltipContent>
                                          </Tooltip>
                                        </div>
                                      </div>
                                    </article>
                                  ))}
                                </div>
                              )}
                            </section>
                          );
                        })}
                      </div>

                    )}

                    {/* 6. Pagination Bar */}
                    {loading && !hasLoaded ? (
                      <StudentRequestsPaginationSkeleton />
                    ) : filteredRequests.length > 0 ? (
                      <TablePagination label="Student request pages" page={currentPage} pageSize={itemsPerPage} totalCount={filteredRequests.length} displayedCount={paginatedRequests.length} onPageChange={setCurrentPage} onPageSizeChange={setItemsPerPage} />
                    ) : null}
                  </Card>
                </div>
              ) : (
                <Card
                  className="flex flex-[1_0_auto] h-auto w-full flex-col p-0 gap-0 overflow-hidden rounded-2xl border border-border bg-white shadow-sm dark:border-border dark:bg-card dark:shadow-none isolate font-jakarta focus:outline-none"
                  tabIndex={0}
                >
                  {/* 1. Page Header */}
                  <PageHeader
                    icon="File02Icon"
                    title={
                      <div className="flex flex-wrap items-baseline gap-2">
                        <span>OSAS submissions</span>
                        <span className="text-[11px] font-normal tracking-normal text-gray-500 dark:text-zinc-400 tabular-nums">
                          {osasSubView === "proposals"
                            ? `${organizationProposals.length} ${organizationProposals.length === 1 ? "proposal" : "proposals"}`
                            : osasSubView === "post_event"
                            ? `${organizationPostEventReports.length} ${organizationPostEventReports.length === 1 ? "report" : "reports"}`
                            : `${cblVersions.length} ${cblVersions.length === 1 ? "charter" : "charters"}`}
                          {me?.student_no ? ` · ${me.student_no}` : ""}
                        </span>
                      </div>
                    }
                    description="Submit organization event proposals and follow evaluation progress."
                    className="p-6"
                    titleClassName="text-[18px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50"
                    descriptionClassName="text-[13px] font-normal text-gray-500 dark:text-zinc-400 mt-[4px]"
                    actions={
                      <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto">
                        <OsasOrganizationSwitcher
                          organizations={myOrganizations}
                          selectedOrganization={selectedOsasOrganization}
                          onChange={handleOsasOrganizationChange}
                          selectionLocked={Boolean(revisionTargetProposal || revisionTargetReport)}
                        />
                        <RefreshButton
                          onRefresh={async () => {
                            setRefreshing(true);
                            try {
                              await load();
                            } finally {
                              setRefreshing(false);
                            }
                          }}
                          isLoading={refreshing}
                          title="Refresh records"
                        />
                        
                        {!isFormOpen && (
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => setIsFormOpen(true)}
                            disabled={!selectedOsasOrganization}
                            title={!selectedOsasOrganization ? "Select an organization above to continue" : osasSubView === "proposals" ? "Open proposal form" : osasSubView === "post_event" ? "Open report form" : "Open CBL form"}
                            className={cn(
                              "h-9 shrink-0 px-4 text-xs font-semibold rounded-xl cursor-pointer disabled:opacity-50",
                              !selectedOsasOrganization && "opacity-50 cursor-not-allowed"
                            )}
                          >
                              {osasSubView === "proposals" ? "Open proposal form" : osasSubView === "post_event" ? "Open report form" : "Open CBL form"}
                          </Button>
                        )}
                      </div>
                    }
                  />

                  {myOrganizations.length === 0 && (
                    <CampusStatusNotice tone="warning" title="Officer authorization required" imageSizes="100vw">
                      Contact OSAS to authorize your account before submitting on behalf of a recognized organization.
                    </CampusStatusNotice>
                  )}

                  {/* OSAS Stream Switcher */}
                  <div className="border-b border-border/80 dark:border-white/10 bg-white dark:bg-card px-6 py-2.5 overflow-x-auto scrollbar-none">
                    <SegmentedControl
                      value={osasSubView}
                      onValueChange={(nextView) => {
                        if (nextView !== "post_event" && revisionTargetReport) closePostEventForm();
                        setOsasSubView(nextView);
                      }}
                      variant="capsule"
                      className="w-max"
                      items={[
                        {
                          value: "proposals",
                          label: "Event proposals",
                          icon: <Calendar01Icon size="1em" className="text-sm" />,
                          badge: organizationProposals.length,
                        },
                        {
                          value: "post_event",
                          label: "Post-event and liquidation",
                          icon: <ClipboardIcon size="1em" className="text-sm" />,
                          badge: organizationPendingPostEvents.length > 0
                            ? `${organizationPendingPostEvents.length} Action`
                            : organizationPostEventReports.length,
                          badgeClassName: organizationPendingPostEvents.length > 0
                            ? BADGE_PALETTES.amber
                            : undefined,
                        },
                        {
                          value: "cbl",
                          label: "Constitution & By-Laws",
                          icon: <BookBookmark01Icon size="1em" className="text-sm" />,
                          badge: cblVersions.filter((version) => version.status === "Pending").length > 0
                            ? "Pending"
                            : cblVersions.length,
                          badgeClassName: cblVersions.some((version) => version.status === "Pending")
                            ? BADGE_PALETTES.amber
                            : undefined,
                        },
                      ]}
                    />
                  </div>

                  <AnimatePresence initial={false}>
                    {selectedOsasOrganization && isFormOpen && (
                      <ExpandablePanel key="osas-submitting-organization" reduceMotion={reduceMotion} contentClassName="">
                        <div role="status">
                          <CampusStatusNotice tone="info" title="Submitting For" imageSizes="100vw">
                            {selectedOsasOrganization.organization_name}. New submissions will be filed under this organization.
                          </CampusStatusNotice>
                        </div>
                      </ExpandablePanel>
                    )}
                  </AnimatePresence>

                  <ContentSwap
                    id={`osas-${osasSubView}`}
                    className="flex flex-[1_0_auto] flex-col w-full"
                  >
                  {/* STREAM 1: EVENT PROPOSALS */}
                  {osasSubView === "proposals" && (
                    <>
                      {/* Inline Proposal Form Section */}
                      <AnimatePresence initial={false}>
                        {isFormOpen && selectedOsasOrganization && (
                          <ExpandablePanel
                            key="event-proposal-form"
                            id="osas-proposal-form"
                            reduceMotion={reduceMotion}
                            contentClassName="border-t border-border p-5 sm:p-6"
                          >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border dark:border-border">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-pup-maroon dark:bg-red-950/40 dark:text-red-400">
                                <AddCircleIcon size="1em" className="text-xl" />
                              </div>
                              <div>
                                <h2 tabIndex={-1} className="text-[15px] font-semibold text-gray-900 dark:text-zinc-50">
                                  {revisionTargetProposal ? "Revise event proposal" : "New event proposal"}
                                </h2>
                                <p className="text-xs text-gray-500 dark:text-zinc-400">
                                  {revisionTargetProposal
                                    ? `Update the proposal requested by OSAS · Submitting for ${selectedOsasOrganization.organization_name}`
                                    : `Upload a PDF proposal for OSAS review and evaluation · Submitting for ${selectedOsasOrganization.organization_name}`}
                                </p>
                              </div>
                            </div>
                          </div>

                          <form onInvalid={() => setProposalAttempted(true)} onSubmit={submitProposal} className="flex flex-col gap-4 mt-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="min-w-0">
                                <label htmlFor="osas-event-title" className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-zinc-200">
                                  Event title
                                </label>
                                <Input
                                  id="osas-event-title"
                                  placeholder="Enter event title"
                                  value={proposalForm.title}
                                  onChange={(e) => setProposalForm({ ...proposalForm, title: e.target.value })}
                                  required
                                  className="h-10 w-full rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 px-3 text-xs text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 shadow-none outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus-visible:border-red-500/80 dark:focus-visible:ring-red-500/80"
                                />
                              </div>

                              <div className="min-w-0">
                                <label htmlFor="osas-event-date" className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-zinc-200">
                                  Event date
                                </label>
                                <Popover open={eventDatePickerOpen} onOpenChange={setEventDatePickerOpen}>
                                  <PopoverTrigger asChild>
                                    <Button
                                      id="osas-event-date"
                                      type="button"
                                      variant="outline"
                                      aria-label="Event date"
                                      aria-describedby="osas-event-date-help"
                                      aria-invalid={proposalDateInvalid || (proposalAttempted && !proposalForm.eventDate) || undefined}
                                      aria-required="true"
                                      aria-haspopup="dialog"
                                      className="h-10 w-full justify-start gap-2 rounded-xl border border-border bg-white px-3 text-left text-xs font-normal text-gray-900 shadow-none hover:bg-gray-50 dark:border-border dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
                                    >
                                      <Calendar01Icon size={14} aria-hidden="true" className="shrink-0 text-gray-500 dark:text-zinc-400" />
                                      <span className={proposalForm.eventDate ? "" : "text-gray-400 dark:text-zinc-500"}>
                                        {proposalForm.eventDate
                                          ? format(parseDateLocal(proposalForm.eventDate), "MMM d, yyyy")
                                          : "Select event date"}
                                      </span>
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent align="start" className="w-auto rounded-2xl border border-border bg-white p-0 shadow-2xl dark:border-border dark:bg-card">
                                    <Calendar
                                      mode="single"
                                      selected={parseDateLocal(proposalForm.eventDate)}
                                      defaultMonth={parseDateLocal(!proposalDateInvalid && proposalForm.eventDate ? proposalForm.eventDate : proposalToday)}
                                      today={parseDateLocal(proposalToday)}
                                      disabled={(date) => formatDateIso(date) <= proposalToday}
                                      onSelect={(date) => {
                                        const eventDate = formatDateIso(date);
                                        if (!isFutureManilaCalendarDate(eventDate)) return;
                                        setProposalForm((current) => ({ ...current, eventDate }));
                                        setEventDatePickerOpen(false);
                                      }}
                                    />
                                  </PopoverContent>
                                </Popover>
                                <p id="osas-event-date-help" className={cn("mt-1.5 text-[11px]", (proposalDateInvalid || (proposalAttempted && !proposalForm.eventDate)) ? "text-destructive" : "text-muted-foreground")}>
                                  Select a date after today (Manila time).
                                </p>
                              </div>
                            </div>

                            <div>
                              <label className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-zinc-200">
                                Proposal PDF
                              </label>
                              <FileAttachmentDropzone
                                animateCards={false}
                                invalid={proposalAttempted && Boolean(revisionTargetProposal) && !proposalForm.file}
                                value={proposalForm.file ? { file: proposalForm.file, original_filename: proposalForm.file.name, size_bytes: proposalForm.file.size } : null}
                                onChange={(item) => setProposalForm({ ...proposalForm, file: item?.file || null })}
                                mode="single"
                                accept="application/pdf"
                                title={revisionTargetProposal ? "Drop revised proposal PDF here, or browse" : "Drop activity proposal PDF here, or browse"}
                                subtitle="Must be an official PDF document (up to 25 MB)"
                                maxSizeBytes={25 * 1024 * 1024}
                              />
                            </div>

                            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
                              <span className="text-xs text-gray-500 dark:text-zinc-400">
                                Proposals are received and evaluated by the OSAS office.
                              </span>
                              <div className="flex items-center gap-2.5 w-full sm:w-auto">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={closeProposalForm}
                                  className="w-full sm:w-auto h-9 px-4 text-xs font-semibold rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"
                                >
                                  {revisionTargetProposal ? "Cancel revision" : "Hide"}
                                </Button>
                                <Button
                                  type="submit"
                                  size="sm"
                                  disabled={proposalSubmitting}
                                  title={revisionTargetProposal ? "Submit revised proposal" : "Submit proposal"}
                                  className="w-full sm:w-auto h-9 px-4 gap-2 flex items-center justify-center cursor-pointer border-0"
                                >
                                  {proposalSubmitting ? (
                                    <>
                                      <Loading01Icon size="1em" className="animate-spin text-sm"></Loading01Icon>
                                      {revisionTargetProposal ? "Submitting revision…" : "Submitting…"}
                                    </>
                                  ) : (
                                    revisionTargetProposal ? "Submit revised proposal" : "Submit proposal"
                                  )}
                                </Button>
                              </div>
                            </div>
                          </form>
                          </ExpandablePanel>
                        )}
                      </AnimatePresence>

                      {/* Proposals History Toolbar */}
                      <DataViewToolbar label="Event proposals search and controls" className="border-t border-border dark:border-border p-4 sm:px-5 sm:py-3 gap-2 bg-white dark:bg-card flex flex-wrap items-center justify-between select-none">
                        {/* Left: DashboardSearch */}
                        <div className="flex min-w-0 items-center gap-2">
                          <DashboardSearch
                            value={proposalSearch}
                            onChange={(val) => setProposalSearch(val)}
                            count={filteredProposals.length}
                            loading={loading}
                            placeholder="Search proposals"
                            label="Search proposals"
                          />
                        </div>

                        {/* Right: Filter -> Sort -> Group -> DateRange */}
                        <div className="ml-auto flex shrink-0 items-center gap-2">
                          <FilterPopover
                            fields={proposalFilterFields}
                            filters={proposalFilterRules}
                            onFiltersChange={(newRules) => setProposalFilterRules(newRules)}
                            entityLabel="proposals"
                          />
                          <SortPopover
                            options={proposalSortOptions}
                            sortBy={proposalSortBy}
                            onSortByChange={(val) => setProposalSortBy(val)}
                            sortOrder={proposalSortOrder}
                            onSortOrderChange={(val) => setProposalSortOrder(val)}
                          />
                          <GroupPopover
                            options={proposalGroupOptions}
                            groupBy={proposalGroupBy}
                            onGroupByChange={(val) => setProposalGroupBy(val)}
                          />
                          <DateRangeFilterButton
                            startDate={proposalStartDate}
                            endDate={proposalEndDate}
                            onApply={({ startDate: s, endDate: e }) => {
                              setProposalStartDate(s);
                              setProposalEndDate(e);
                            }}
                            onClear={() => {
                              setProposalStartDate("");
                              setProposalEndDate("");
                            }}
                            disableFutureDates={false}
                          />
                        </div>
                      </DataViewToolbar>

                      {/* Active Filter Chips Bar */}
                      <ActiveFilterChips
                        chips={proposalActiveChips}
                        searchQuery={proposalSearch}
                        onClearSearch={() => setProposalSearch("")}
                        onClearAll={() => {
                          setProposalSearch("");
                          setProposalFilterRules([]);
                          setProposalStartDate("");
                          setProposalEndDate("");
                        }}
                        className="border-t border-border dark:border-border bg-white dark:bg-card px-6 py-2.5"
                      />

                      {/* Proposals List */}
                      <div className="border-t border-border dark:border-border flex-1">
                        {loading && !hasLoaded ? (
                          <div className="p-5">
                            <StudentOsasProposalsListSkeleton count={3} />
                          </div>
                        ) : proposalLoadFailed && organizationProposals.length === 0 ? (
                          <StudentHistoryLoadError title="Could not load event proposals" onRetry={() => load()} loading={loading} />
                        ) : organizationProposals.length === 0 ? (
                          <div className="rounded-b-2xl flex-1 flex flex-col items-center justify-center min-h-[420px] w-full">
                            <Empty>
                              <EmptyHeader>
                                <EmptyMedia><EmptyFile02Icon size="1em" /></EmptyMedia>
                                <EmptyTitle>
                                  {selectedOsasOrganization
                                    ? "No event proposals yet"
                                    : myOrganizations.length === 0
                                    ? "No authorized organization"
                                    : "Choose an organization"}
                                </EmptyTitle>
                                <EmptyDescription>
                                  {selectedOsasOrganization
                                    ? `No event proposals have been submitted for ${selectedOsasOrganization.organization_name} yet.`
                                    : myOrganizations.length === 0
                                    ? "Contact OSAS to confirm your officer authorization."
                                    : "Choose an organization above to view its OSAS submissions."}
                                </EmptyDescription>
                              </EmptyHeader>
                              {selectedOsasOrganization && (
                                <EmptyContent>
                                  <Button
                                    type="button"
                                    size="sm"
                                    onClick={() => setIsFormOpen(true)}
                                    title="Open proposal form"
                                    className="flex h-9 px-4 cursor-pointer border-0"
                                  >
                                    Open proposal form
                                  </Button>
                                </EmptyContent>
                              )}
                            </Empty>
                          </div>
                        ) : filteredProposals.length === 0 ? (
                          <div className="rounded-b-2xl flex-1 flex flex-col items-center justify-center min-h-[420px] w-full">
                            <Empty>
                              <EmptyHeader>
                                <EmptyMedia><EmptySearch01Icon size="1em" /></EmptyMedia>
                                <EmptyTitle>
                                  No matches found
                                </EmptyTitle>
                                <EmptyDescription>
                                  Try adjusting your search or filter criteria.
                                </EmptyDescription>
                              </EmptyHeader>
                              <EmptyContent>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setProposalSearch("");
                                    setProposalFilters({ status: [], organization: [] });
                                    setProposalFilterRules([]);
                                    setProposalStartDate("");
                                    setProposalEndDate("");
                                  }}
                                  title="Reset filters"
                                  className="h-9 px-4 text-xs font-semibold rounded-xl"
                                >
                                  Reset filters
                                </Button>
                              </EmptyContent>
                            </Empty>
                          </div>
                        ) : (
                          <div>
                            {groupedProposals.map((group) => (
                              <div key={group.key || "all"}>
                                {group.label && (
                                  <DataGroupHeader label={group.label} count={group.items.length} />
                                )}
                                <div className="space-y-3 p-5">
                                {group.items.map((item) => {
                                  const latestUpdate = item.updates?.[item.updates.length - 1];
                                  const submissionUpdate = latestUpdate?.message?.match(PROPOSAL_SUBMISSION_UPDATE);
                                  return (
                                  <article
                                    key={item.id}
                                    onClick={() => setSelectedProposalForDetail(item)}
                                    className="group rounded-xl border border-border p-4 dark:border-border hover:bg-gray-50/50 dark:hover:bg-white/2 transition-colors cursor-pointer select-none"
                                  >
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                      <h3 className="text-xs font-semibold text-[#111111] dark:text-zinc-100 group-hover:text-pup-maroon dark:group-hover:text-red-400 transition-colors">
                                        {item.title}
                                      </h3>
                                      <div className="flex items-center gap-2">
                                        <StatusBadge status={item.status} />
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleOpenPdfPreview(item);
                                          }}
                                          title={PDF_ACTION_LABELS.preview}
                                          aria-label={PDF_ACTION_LABELS.preview}
                                          className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10 hover:text-pup-maroon dark:hover:text-red-400 transition-colors cursor-pointer"
                                        >
                                          <File02Icon size="1em" className="text-[16px]" />
                                        </button>
                                      </div>
                                    </div>
                                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                                      <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                                        <span className="inline-flex min-w-0 items-center gap-1.5 font-medium text-gray-700 dark:text-zinc-200">
                                          <OrganizationAvatar organization={selectedOsasOrganization} className="size-5" />
                                          <span className="truncate">
                                            {selectedOsasOrganization ? organizationName(selectedOsasOrganization) : item.organization_name}
                                          </span>
                                        </span>
                                        <span className="text-gray-500 dark:text-zinc-400">
                                          · {formatProposalEventDate(item.event_date)}
                                        </span>
                                      </div>
                                      {item.status === "Approved" && (
                                        <div className="flex items-center gap-2">
                                          {item.post_event_status === "Cleared" ? (
                                            <span className={cn(BADGE_BASE, BADGE_PALETTES.emerald)}>
                                              Post-Event Cleared
                                            </span>
                                          ) : item.post_event_status === "Submitted" || item.post_event_status === "Under Review" ? (
                                            <span className={cn(BADGE_BASE, BADGE_PALETTES.blue)}>
                                              Post-Event In Review
                                            </span>
                                          ) : (
                                            <button
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                if (!myOrganizations.some((org) => String(org.organization_id) === String(item.organization_id))) {
                                                  showToast("Organization authorization required", "Contact OSAS to restore your officer authorization for this organization.", true);
                                                  return;
                                                }
                                                handleOsasOrganizationChange(String(item.organization_id));
                                                setOsasSubView("post_event");
                                                setPostEventForm((prev) => ({
                                                  ...prev,
                                                  eventProposalId: String(item.id),
                                                }));
                                                setIsFormOpen(true);
                                              }}
                                              title="Open Report Form"
                                              className="group/btn inline-flex items-center gap-1 text-xs font-semibold text-amber-700 dark:text-amber-400 hover:underline underline-offset-4 cursor-pointer"
                                            >
                                              <span>Open Report Form</span>
                                              <ArrowUpRight01Icon size={14} aria-hidden="true" className="shrink-0 transition-transform group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5" />
                                            </button>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                    <div className="mt-3 flex flex-col gap-2 border-t border-border/70 pt-3 dark:border-border">
                                      {latestUpdate ? (
                                        <div className="min-w-0">
                                          <div className="mb-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px]">
                                            <span className="font-semibold text-gray-700 dark:text-zinc-300">Latest update · {latestUpdate.status}</span>
                                            {latestUpdate.created_at && (
                                              <span className="text-gray-400 dark:text-zinc-500">{formatPHDateTime(latestUpdate.created_at)}</span>
                                            )}
                                          </div>
                                          <div className={cn("text-xs leading-relaxed text-gray-600 dark:text-zinc-400", !submissionUpdate && "line-clamp-2")}>
                                            {submissionUpdate ? (
                                              <ProposalSubmissionNarrative submission={submissionUpdate} name={item.student_name} user={me} />
                                            ) : (
                                              <NarrativeText text={latestUpdate.message || "Status updated by OSAS"} mode="compact" />
                                            )}
                                          </div>
                                        </div>
                                      ) : (
                                        <p className="text-xs text-gray-500 dark:text-zinc-400">No evaluation updates yet.</p>
                                      )}
                                      <div className="flex justify-end">
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedProposalForDetail(item);
                                          }}
                                          className="group/more inline-flex items-center gap-1 text-xs font-semibold text-pup-maroon hover:underline underline-offset-4 dark:text-red-400 cursor-pointer"
                                        >
                                          <span>{item.updates?.length ? "View full timeline" : "View proposal details"}</span>
                                          <ArrowUpRight01Icon size={14} aria-hidden="true" className="shrink-0 transition-transform group-hover/more:translate-x-0.5 group-hover/more:-translate-y-0.5" />
                                        </button>
                                      </div>
                                    </div>
                                  </article>
                                  );
                                })}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  {/* STREAM 2: POST-EVENT & LIQUIDATION REPORTS */}
                  {osasSubView === "post_event" && (
                    <div className="flex flex-col flex-[1_0_auto] min-h-0">
                      {organizationPendingPostEvents.length > 0 && !isPostEventAlertDismissed && (
                        <CampusStatusNotice
                          title="Post-Event Reports Due"
                          imageSizes="100vw"
                          onDismiss={handleDismissPostEventAlert}
                        >
                          {organizationPendingPostEvents.length} approved {organizationPendingPostEvents.length === 1 ? "event requires" : "events require"} narrative and financial liquidation reports.
                        </CampusStatusNotice>
                      )}

                      {/* Post-Event Submission Form */}
                      <AnimatePresence initial={false}>
                        {isFormOpen && selectedOsasOrganization && (
                          <ExpandablePanel
                            key="post-event-report-form"
                            id="osas-post-event-form"
                            reduceMotion={reduceMotion}
                            contentClassName="border-t border-border p-5 sm:p-6"
                          >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border dark:border-border">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-pup-maroon dark:bg-red-950/40 dark:text-red-400">
                                <ClipboardIcon size="1em" className="text-xl" />
                              </div>
                              <div>
                                <h2 tabIndex={-1} className="text-[15px] font-semibold text-gray-900 dark:text-zinc-50">{revisionTargetReport ? "Revise post-event report" : "New post-event and liquidation report"}</h2>
                                <p className="text-xs text-gray-500 dark:text-zinc-400">
                                  {revisionTargetReport
                                    ? "Replace the requested PDFs or update the report details according to the OSAS review note."
                                    : `Submit accomplishment documentation, attendance figures, and liquidation receipts for an approved event · Submitting for ${selectedOsasOrganization.organization_name}`}
                                </p>
                              </div>
                            </div>
                          </div>

                          {revisionTargetReport?.review_note && (
                            <div className="mt-4 space-y-1 text-xs text-gray-700 dark:text-zinc-300">
                              <p className="font-semibold">OSAS Review Note</p>
                              <NarrativeText text={revisionTargetReport.review_note} mode="full" />
                            </div>
                          )}

                          <form onInvalid={() => setPostEventAttempted(true)} onSubmit={submitPostEventReport} className="flex flex-col gap-4 mt-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              <div className="min-w-0">
                                <label htmlFor="post-event-proposal" className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-zinc-200">
                                  Approved event proposal
                                </label>
                                <Select
                                  id="post-event-proposal"
                                  aria-invalid={(postEventAttempted && !revisionTargetReport && !hasSelectedApprovedProposal) || undefined}
                                  aria-describedby={revisionTargetReport || !hasApprovedPostEventProposals ? "post-event-proposal-help" : undefined}
                                  disabled={Boolean(revisionTargetReport) || !hasApprovedPostEventProposals}
                                  placeholder="Select an approved event…"
                                  value={revisionTargetReport || hasSelectedApprovedProposal ? postEventForm.eventProposalId : ""}
                                  onChange={(e) => {
                                    const pId = e.target.value;
                                    setPostEventForm((prev) => ({ ...prev, eventProposalId: pId }));
                                  }}
                                  className="h-10 w-full rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 text-xs text-gray-900 dark:text-zinc-100 shadow-none"
                                >
                                  {revisionTargetReport ? (
                                    <option value={postEventForm.eventProposalId}>{revisionTargetReport.event_title}</option>
                                  ) : approvedPostEventProposals.map((p) => (
                                    <option key={p.id} value={p.id}>
                                      {p.title} ({formatProposalEventDate(p.event_date)}) : {p.organization_name}
                                    </option>
                                  ))}
                                </Select>
                                {(revisionTargetReport || !hasApprovedPostEventProposals) && (
                                  <p id="post-event-proposal-help" className="mt-1 text-[11px] text-muted-foreground">
                                    {revisionTargetReport
                                      ? "This revision stays linked to the original event proposal."
                                      : "OSAS must approve an event proposal for this organization before you can select it here."}
                                  </p>
                                )}
                              </div>

                              <div className="min-w-0">
                                <label className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-zinc-200">
                                  Actual attendees <span className="normal-case tracking-normal opacity-70">(optional)</span>
                                </label>
                                <Input
                                  type="number"
                                  min="0"
                                  step="1"
                                  max="2147483647"
                                  placeholder="150"
                                  value={postEventForm.actualAttendance}
                                  onChange={(e) => setPostEventForm({ ...postEventForm, actualAttendance: e.target.value })}
                                  className="h-10 w-full rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 px-3 text-xs text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 shadow-none outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus-visible:border-red-500/80 dark:focus-visible:ring-red-500/80"
                                />
                              </div>

                              <div className="min-w-0">
                                <label className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-zinc-200">
                                  Total expenses liquidated (PHP) <span className="normal-case tracking-normal opacity-70">(optional)</span>
                                </label>
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  max="9999999999.99"
                                  placeholder="5200.00"
                                  value={postEventForm.totalExpenses}
                                  onChange={(e) => setPostEventForm({ ...postEventForm, totalExpenses: e.target.value })}
                                  className="h-10 w-full rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 px-3 text-xs text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 shadow-none outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus-visible:border-red-500/80 dark:focus-visible:ring-red-500/80"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                              {Object.entries(postEventFileLabels).map(([kind, label]) => {
                                const field = `${kind}File`;
                                const file = postEventForm[field];
                                const hasExisting = Boolean(revisionTargetReport?.[`${kind}_storage_filename`]);
                                const replacementRequired = revisionTargetReport?.revision_files?.includes(kind);
                                const required = replacementRequired || (kind === "narrative" && !hasExisting);
                                const existingName = revisionTargetReport?.[`${kind}_original_filename`] || `${label}.pdf`;
                                const url = hasExisting ? `/api/student/post-event-reports/${revisionTargetReport.id}?file=${kind}` : undefined;
                                return (
                                  <div key={kind} className="space-y-2">
                                    <p className="text-xs font-semibold">
                                      {label} (PDF){" "}
                                      {replacementRequired
                                        ? <span className="font-normal text-amber-700 dark:text-amber-300">Replacement required</span>
                                        : !required && <span className="font-normal text-muted-foreground">(optional)</span>}
                                    </p>
                                    {hasExisting && (
                                      <SheetAttachmentRow
                                        filename={existingName}
                                        description={replacementRequired ? "Previously submitted" : "Kept unless replaced"}
                                        fileUrl={url}
                                        onPreview={() => handleOpenPdfPreview(null, { url, title: label, originalFilename: existingName })}
                                      />
                                    )}
                                    <FileAttachmentDropzone
                                      animateCards={false}
                                      invalid={postEventAttempted && required && !file}
                                      value={file ? { file, original_filename: file.name, size_bytes: file.size } : null}
                                      onChange={(item) => setPostEventForm((current) => ({ ...current, [field]: item?.file || null }))}
                                      mode="single"
                                      accept="application/pdf"
                                      title={hasExisting ? "Drop a replacement PDF here, or browse" : "Drop a report PDF here, or browse"}
                                      subtitle="PDF up to 25 MB"
                                      maxSizeBytes={25 * 1024 * 1024}
                                    />
                                  </div>
                                );
                              })}
                            </div>

                            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
                              <span className="text-xs text-gray-500 dark:text-zinc-400">
                                Post-event reports are audited by OSAS for compliance scoring and accreditation.
                              </span>
                              <div className="flex items-center gap-2.5 w-full sm:w-auto">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={closePostEventForm}
                                  disabled={postEventSubmitting}
                                  className="w-full sm:w-auto h-9 px-4 text-xs font-semibold rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"
                                >
                                  {revisionTargetReport ? "Cancel revision" : "Hide"}
                                </Button>
                                <Button
                                  type="submit"
                                  size="sm"
                                  disabled={postEventSubmitting || (!revisionTargetReport && !hasApprovedPostEventProposals)}
                                  title={revisionTargetReport ? "Resubmit post-event report" : "Submit post-event report"}
                                  className="w-full sm:w-auto h-9 px-4 gap-2 flex items-center justify-center cursor-pointer border-0"
                                >
                                  {postEventSubmitting ? (
                                    <>
                                      <Loading01Icon size="1em" className="animate-spin text-sm" />
                                      Submitting…
                                    </>
                                  ) : (
                                    revisionTargetReport ? "Resubmit post-event report" : "Submit post-event report"
                                  )}
                                </Button>
                              </div>
                            </div>
                          </form>
                          </ExpandablePanel>
                        )}
                      </AnimatePresence>

                      {/* Post-Event Reports History Toolbar */}
                      <DataViewToolbar label="Post-event reports search and controls" className="border-t border-border dark:border-border p-4 sm:px-5 sm:py-3 gap-2 bg-white dark:bg-card flex flex-wrap items-center justify-between select-none">
                        <div className="flex min-w-0 items-center gap-2">
                          <DashboardSearch
                            value={postEventSearch}
                            onChange={(val) => setPostEventSearch(val)}
                            count={filteredPostEventReports.length}
                            loading={loading}
                            placeholder="Search reports"
                            label="Search post-event reports"
                          />
                        </div>

                        <div className="ml-auto flex shrink-0 items-center gap-2">
                          <FilterPopover
                            fields={postEventFilterFields}
                            filters={postEventFilterRules}
                            onFiltersChange={(newRules) => setPostEventFilterRules(newRules)}
                            entityLabel="reports"
                          />
                          <SortPopover
                            options={postEventSortOptions}
                            sortBy={postEventSortBy}
                            onSortByChange={(val) => setPostEventSortBy(val)}
                            sortOrder={postEventSortOrder}
                            onSortOrderChange={(val) => setPostEventSortOrder(val)}
                          />
                          <GroupPopover
                            options={postEventGroupOptions}
                            groupBy={postEventGroupBy}
                            onGroupByChange={(val) => setPostEventGroupBy(val)}
                          />
                          <DateRangeFilterButton
                            startDate={postEventStartDate}
                            endDate={postEventEndDate}
                            onApply={({ startDate: s, endDate: e }) => {
                              setPostEventStartDate(s);
                              setPostEventEndDate(e);
                            }}
                            onClear={() => {
                              setPostEventStartDate("");
                              setPostEventEndDate("");
                            }}
                            disableFutureDates={false}
                          />
                        </div>
                      </DataViewToolbar>

                      <ActiveFilterChips
                        chips={postEventActiveChips}
                        searchQuery={postEventSearch}
                        onClearSearch={() => setPostEventSearch("")}
                        onClearAll={() => {
                          setPostEventSearch("");
                          setPostEventFilterRules([]);
                          setPostEventStartDate("");
                          setPostEventEndDate("");
                        }}
                        className="border-t border-border dark:border-border bg-white dark:bg-card px-6 py-2.5"
                      />

                      <div className="border-t border-border dark:border-border flex-1">
                        {loading && !hasLoaded ? (
                          <div className="p-5">
                            <StudentOsasProposalsListSkeleton count={3} stream="post_events" />
                          </div>
                        ) : postEventLoadFailed && organizationPostEventReports.length === 0 ? (
                          <StudentHistoryLoadError title="Could not load post-event reports" onRetry={() => load()} loading={loading} />
                        ) : organizationPostEventReports.length === 0 ? (
                          <div className="rounded-b-2xl flex-1 flex flex-col items-center justify-center min-h-[420px] w-full">
                            <Empty>
                              <EmptyHeader>
                                <EmptyMedia><EmptyClipboardIcon size="1em" /></EmptyMedia>
                                <EmptyTitle>
                                  {selectedOsasOrganization
                                    ? "No post-event reports yet"
                                    : myOrganizations.length === 0
                                    ? "No authorized organization"
                                    : "Choose an organization"}
                                </EmptyTitle>
                                <EmptyDescription>
                                  {selectedOsasOrganization
                                    ? `No accomplishment or liquidation reports have been submitted for ${selectedOsasOrganization.organization_name} yet.`
                                    : myOrganizations.length === 0
                                    ? "Contact OSAS to confirm your officer authorization."
                                    : "Choose an organization above to view its OSAS submissions."}
                                </EmptyDescription>
                              </EmptyHeader>
                              {selectedOsasOrganization && !isFormOpen && (
                                <EmptyContent>
                                  <Button
                                    type="button"
                                    size="sm"
                                    onClick={() => setIsFormOpen(true)}
                                    title="Open report form"
                                    className="flex h-9 px-4 cursor-pointer border-0"
                                  >
                                    Open report form
                                  </Button>
                                </EmptyContent>
                              )}
                            </Empty>
                          </div>
                        ) : filteredPostEventReports.length === 0 ? (
                          <div className="rounded-b-2xl flex-1 flex flex-col items-center justify-center min-h-[420px] w-full">
                            <Empty>
                              <EmptyHeader>
                                <EmptyMedia><EmptySearch01Icon size="1em" /></EmptyMedia>
                                <EmptyTitle>
                                  No matches found
                                </EmptyTitle>
                                <EmptyDescription>
                                  Try adjusting your search or filter criteria.
                                </EmptyDescription>
                              </EmptyHeader>
                              <EmptyContent>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setPostEventSearch("");
                                    setPostEventFilterRules([]);
                                    setPostEventStartDate("");
                                    setPostEventEndDate("");
                                  }}
                                  title="Reset filters"
                                  className="h-9 px-4 text-xs font-semibold rounded-xl"
                                >
                                  Reset filters
                                </Button>
                              </EmptyContent>
                            </Empty>
                          </div>
                        ) : (
                          <div>
                            {groupedPostEventReports.map((group) => (
                              <div key={group.key || "all"}>
                                {group.label && (
                                  <DataGroupHeader label={group.label} count={group.items.length} />
                                )}
                                <div className="space-y-3 p-5">
                                {group.items.map((report) => (
                                  <article
                                    key={report.id}
                                    onClick={() => setSelectedPostEventReportForDetail(report)}
                                    className="group rounded-xl border border-border p-4 dark:border-border hover:bg-gray-50/50 dark:hover:bg-white/2 transition-colors cursor-pointer select-none"
                                  >
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                      <h3 className="text-xs font-semibold text-[#111111] dark:text-zinc-100 group-hover:text-pup-maroon dark:group-hover:text-red-400 transition-colors">
                                        {report.event_title}
                                      </h3>
                                      <div className="flex items-center gap-2">
                                        <StatusBadge status={report.status} />
                                        {report.liquidation_storage_filename ? (
                                          <div className="flex items-center gap-1">
                                            <button
                                              type="button"
                                              onClick={(event) => {
                                                event.stopPropagation();
                                                handleOpenPdfPreview(null, {
                                                  url: `/api/student/post-event-reports/${report.id}?file=narrative`,
                                                  title: `Narrative Report: ${report.event_title}`,
                                                  subtitle: `Submitted by ${report.submitted_by_email}`,
                                                  studentName: me?.name || "Student",
                                                  docType: "Post-Event Narrative Report",
                                                  originalFilename: report.narrative_original_filename,
                                                });
                                              }}
                                              title="Preview Narrative Report"
                                              aria-label="Preview Narrative Report"
                                              className="inline-flex h-7 items-center gap-1 rounded-lg px-2 text-[11px] font-medium text-gray-500 hover:bg-gray-100 hover:text-pup-maroon dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-red-400 transition-colors cursor-pointer"
                                            >
                                              <File02Icon size="1em" className="text-[14px]" />
                                              <span>Narrative</span>
                                            </button>
                                            <button
                                              type="button"
                                              onClick={(event) => {
                                                event.stopPropagation();
                                                handleOpenPdfPreview(null, {
                                                  url: `/api/student/post-event-reports/${report.id}?file=liquidation`,
                                                  title: `Financial Liquidation: ${report.event_title}`,
                                                  subtitle: `Submitted by ${report.submitted_by_email}`,
                                                  studentName: me?.name || "Student",
                                                  docType: "Financial Liquidation Report",
                                                  originalFilename: report.liquidation_original_filename,
                                                });
                                              }}
                                              title="Preview Financial Liquidation"
                                              aria-label="Preview Financial Liquidation"
                                              className="inline-flex h-7 items-center gap-1 rounded-lg px-2 text-[11px] font-medium text-gray-500 hover:bg-gray-100 hover:text-pup-maroon dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-red-400 transition-colors cursor-pointer"
                                            >
                                              <File02Icon size="1em" className="text-[14px]" />
                                              <span>Liquidation</span>
                                            </button>
                                          </div>
                                        ) : (
                                          <button
                                            type="button"
                                            onClick={(event) => {
                                              event.stopPropagation();
                                              handleOpenPdfPreview(null, {
                                                url: `/api/student/post-event-reports/${report.id}?file=narrative`,
                                                title: `Narrative Report: ${report.event_title}`,
                                                subtitle: `Submitted by ${report.submitted_by_email}`,
                                                studentName: me?.name || "Student",
                                                docType: "Post-Event Narrative Report",
                                                originalFilename: report.narrative_original_filename,
                                              });
                                            }}
                                            title={PDF_ACTION_LABELS.preview}
                                            aria-label={PDF_ACTION_LABELS.preview}
                                            className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10 hover:text-pup-maroon dark:hover:text-red-400 transition-colors cursor-pointer"
                                          >
                                            <File02Icon size="1em" className="text-[16px]" />
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                                      <p className="text-[13px] font-normal text-[#8E8E93] dark:text-zinc-400">
                                        {report.organization_name} · {formatProposalEventDate(report.event_date)}
                                      </p>
                                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 dark:text-zinc-400">
                                        <span>Attendees: <strong className="font-semibold text-gray-700 dark:text-zinc-300">{report.actual_attendance || 0}</strong></span>
                                        <span>Expenses: <strong className="font-semibold text-gray-700 dark:text-zinc-300">₱{Number(report.total_expenses || 0).toLocaleString()}</strong></span>
                                      </div>
                                    </div>
                                    <div className="mt-3 flex flex-col gap-2 border-t border-border/70 pt-3 dark:border-border">
                                      {(report.status === "Needs Revision" || report.status === "Declined") && report.review_note && (
                                        <div className="min-w-0 space-y-1">
                                          <p className="text-[11px] font-semibold text-gray-700 dark:text-zinc-300">OSAS Review Note</p>
                                          <div className="line-clamp-2 text-xs leading-relaxed text-gray-600 dark:text-zinc-400">
                                            <NarrativeText text={report.review_note} mode="compact" />
                                          </div>
                                        </div>
                                      )}
                                      <div className="flex justify-end">
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedPostEventReportForDetail(report);
                                          }}
                                          className="group/more inline-flex items-center gap-1 text-xs font-semibold text-pup-maroon hover:underline underline-offset-4 dark:text-red-400 cursor-pointer"
                                        >
                                          <span>View report details</span>
                                          <ArrowUpRight01Icon size={14} aria-hidden="true" className="shrink-0 transition-transform group-hover/more:translate-x-0.5 group-hover/more:-translate-y-0.5" />
                                        </button>
                                      </div>
                                    </div>
                                  </article>
                                ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* STREAM 3: CONSTITUTION & BY-LAWS */}
                  {osasSubView === "cbl" && (
                    <div className="flex flex-col flex-[1_0_auto] min-h-0">
                      {!selectedOsasOrganization && (
                        <div className="border-t border-border px-5 py-4 text-xs text-gray-500 dark:text-zinc-400">
                          Select an organization above to view its charter and submission history.
                        </div>
                      )}

                      {/* Inline CBL Submission Form */}
                      <AnimatePresence initial={false}>
                        {isFormOpen && selectedOsasOrganization && (
                          <ExpandablePanel
                            key="charter-submission-form"
                            id="osas-charter-form"
                            reduceMotion={reduceMotion}
                            contentClassName="border-t border-border p-5 sm:p-6"
                          >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border dark:border-border">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-pup-maroon dark:bg-red-950/40 dark:text-red-400">
                                <BookOpen01Icon size="1em" className="text-xl" />
                              </div>
                              <div>
                                <h2 tabIndex={-1} className="text-[15px] font-semibold text-gray-900 dark:text-zinc-50">New Constitution & By-Laws submission</h2>
                                <p className="text-xs text-gray-500 dark:text-zinc-400">
                                  Submit a ratified charter, baseline document, or amendment for OSAS review and archival · Submitting for {selectedOsasOrganization.organization_name}
                                </p>
                              </div>
                            </div>
                          </div>

                          <form onInvalid={() => setCblAttempted(true)} onSubmit={submitCbl} className="flex flex-col gap-4 mt-4">
                            {/* 1. Version Title / Tag */}
                            <div className="min-w-0">
                              <label className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-zinc-200">
                                Version title or tag
                              </label>
                              <Input
                                placeholder="2026 Ratified Charter"
                                value={cblForm.versionTag}
                                onChange={(e) => setCblForm({ ...cblForm, versionTag: e.target.value })}
                                required
                                className="h-10 w-full rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 px-3 text-xs text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 shadow-none outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon"
                              />
                            </div>

                            {/* 2. Summary of Amendments / Notes for OSAS */}
                            <div className="min-w-0">
                              <label htmlFor="cbl-amendment-summary" className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-zinc-200">
                                Summary of amendments or notes for OSAS <span className="normal-case tracking-normal opacity-70">(optional)</span>
                              </label>
                              <Textarea
                                id="cbl-amendment-summary"
                                placeholder="Describe the amendments or updates"
                                value={cblForm.amendmentSummary}
                                onChange={(e) => setCblForm({ ...cblForm, amendmentSummary: e.target.value })}
                                rows={3}
                                className="resize-y"
                              />
                            </div>

                            {/* 3. Official PDF Document Attachment */}
                            <div className="min-w-0">
                              <label className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-zinc-200">
                                Official PDF document
                              </label>
                              <FileAttachmentDropzone
                                animateCards={false}
                                invalid={cblAttempted && !cblForm.file}
                                value={cblForm.file ? { file: cblForm.file, original_filename: cblForm.file.name, size_bytes: cblForm.file.size } : null}
                                onChange={(item) => setCblForm({ ...cblForm, file: item?.file || null })}
                                mode="single"
                                accept="application/pdf"
                                title="Drop official charter PDF here, or browse"
                                subtitle="Must be an official ratified PDF document (up to 25 MB)"
                                maxSizeBytes={25 * 1024 * 1024}
                              />
                            </div>

                            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
                              <span className="text-xs text-gray-500 dark:text-zinc-400">
                                Charter submissions and amendments are reviewed and archived by the OSAS office.
                              </span>
                              <div className="flex items-center gap-2.5 w-full sm:w-auto">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setIsFormOpen(false)}
                                  className="w-full sm:w-auto h-9 px-4 text-xs font-semibold rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"
                                >
                                  Hide
                                </Button>
                                <Button
                                  type="submit"
                                  size="sm"
                                  disabled={cblSubmitting}
                                  title="Submit Constitution & By-Laws"
                                  className="w-full sm:w-auto h-9 px-4 gap-2 flex items-center justify-center cursor-pointer border-0"
                                >
                                  {cblSubmitting ? (
                                    <>
                                      <Loading01Icon size="1em" className="animate-spin text-sm" />
                                      <span>Submitting…</span>
                                    </>
                                  ) : (
                                    <span>Submit Constitution & By-Laws</span>
                                  )}
                                </Button>
                              </div>
                            </div>
                          </form>
                          </ExpandablePanel>
                        )}
                      </AnimatePresence>

                      {/* Current Charter Status and Document */}
                      <div className={cn("border-t border-border dark:border-border p-5 sm:p-6 bg-gray-50/40 dark:bg-zinc-900/30", !selectedOsasOrganization && "hidden")}>
                        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-center lg:gap-8">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-sm font-bold text-gray-900 dark:text-zinc-100">
                                Current active charter
                              </h3>
                              {cblLoading && !cblOrgData ? (
                                <span className={SETTINGS_STATUS_PILL_SM}>
                                  <Loading01Icon size={13} className="animate-spin shrink-0 text-gray-500 dark:text-zinc-400" aria-hidden="true" />
                                  <span className="font-medium text-gray-500 dark:text-zinc-400">Checking Status</span>
                                </span>
                              ) : cblLoadFailed ? (
                                <span className={SETTINGS_STATUS_PILL_SM}>
                                  <Alert01Icon size={13} className="shrink-0 text-amber-700 dark:text-amber-400" aria-hidden="true" />
                                  <span className="font-semibold text-gray-900 dark:text-zinc-100">Status Unavailable</span>
                                </span>
                              ) : cblOrgData?.hasBylaws ? (
                                <span className={SETTINGS_STATUS_PILL_SM}>
                                  <span className={SETTINGS_DOT_CHECK} aria-hidden="true">
                                    <Tick01Icon size={8} className="stroke-[3]" />
                                  </span>
                                  <span className="font-semibold text-gray-900 dark:text-zinc-100">Active & Ratified</span>
                                </span>
                              ) : (
                                <span className={SETTINGS_STATUS_PILL_SM}>
                                  <Clock01Icon size={13} className="shrink-0 text-amber-700 dark:text-amber-400" aria-hidden="true" />
                                  <span className="font-semibold text-gray-900 dark:text-zinc-100">Not Yet Archived</span>
                                </span>
                              )}
                            </div>
                            <p className="mt-1 text-xs text-gray-500 dark:text-zinc-400">
                              {cblLoading && !cblOrgData
                                ? `Checking the charter on file for ${selectedOsasOrganization?.organization_name || "this organization"}.`
                                : cblLoadFailed
                                ? "Could not check the charter on file."
                                : cblOrgData?.hasBylaws
                                ? `Official Constitution & By-Laws on file for ${cblOrgData.name}.`
                                : `No ratified Constitution & By-Laws on file for ${cblOrgData?.name || selectedOsasOrganization?.organization_name || "this organization"}.`}
                            </p>
                            {cblOrgData?.hasBylaws && cblOrgData.updatedAt && (
                              <p className="mt-3 text-[11px] font-medium text-gray-500 dark:text-zinc-400">
                                Last updated <span className="tabular-nums text-gray-700 dark:text-zinc-300">{formatPHDateTime(cblOrgData.updatedAt)}</span>
                              </p>
                            )}
                          </div>

                          {cblLoading && !cblOrgData ? (
                            <div aria-hidden="true" className="flex min-w-0 flex-col gap-4 rounded-xl border border-border/80 bg-white p-4 dark:bg-zinc-900 sm:flex-row sm:items-center sm:justify-between">
                              <div className="flex min-w-0 items-center gap-3">
                                <Skeleton className="size-10 shrink-0 rounded-lg" />
                                <div className="min-w-0 space-y-1">
                                  <Skeleton className="h-3 w-28 max-w-full" />
                                  <Skeleton className="h-4 w-44 max-w-full" />
                                </div>
                              </div>
                              <Skeleton className="h-8 w-28 shrink-0 rounded-xl" />
                            </div>
                          ) : cblOrgData?.hasBylaws && selectedOsasOrgId ? (
                            <SheetAttachmentRow
                              filename={cblOrgData.originalFilename || "Constitution-and-By-Laws.pdf"}
                              description="Active charter document"
                              mimeType="application/pdf"
                              downloadUrl={`/api/student/organizations/${selectedOsasOrgId}/bylaws?file=1`}
                              previewLabel="View Current Charter"
                              onPreview={() => handleOpenPdfPreview(null, {
                                url: `/api/student/organizations/${selectedOsasOrgId}/bylaws?file=1`,
                                title: `${cblOrgData.name}: Constitution & By-Laws`,
                                subtitle: "Official ratified charter on file with OSAS.",
                                studentName: me?.name || "Student Officer",
                                docType: "Constitution & By-Laws",
                                originalFilename: cblOrgData.originalFilename || "Constitution-and-By-Laws.pdf",
                              })}
                            />
                          ) : (
                            <div className="flex flex-col gap-3 rounded-xl border border-dashed border-border bg-white/70 p-4 dark:bg-zinc-900/40 sm:flex-row sm:items-center sm:justify-between">
                              <p className="text-xs text-gray-600 dark:text-zinc-400">
                                The approved charter document will appear here once it is on file with OSAS.
                              </p>
                              {!isFormOpen && (
                                <Button
                                  type="button"
                                  size="sm"
                                  onClick={() => setIsFormOpen(true)}
                                  className="h-9 shrink-0 px-4"
                                >
                                  Open CBL form
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* CBL Submissions History Toolbar */}
                      <DataViewToolbar label="Constitution and by-laws search and controls" className={cn("border-t border-border dark:border-border p-4 sm:px-5 sm:py-3 gap-2 bg-white dark:bg-card flex flex-wrap items-center justify-between select-none", !selectedOsasOrganization && "hidden")}>
                        <div className="flex min-w-0 items-center gap-2">
                          <DashboardSearch
                            value={cblSearch}
                            onChange={(val) => setCblSearch(val)}
                            count={filteredCblVersions.length}
                            loading={cblLoading}
                            placeholder="Search charters"
                            label="Search charter submissions"
                          />
                        </div>

                        <div className="ml-auto flex shrink-0 items-center gap-2">
                          <FilterPopover
                            fields={cblFilterFields}
                            filters={cblFilterRules}
                            onFiltersChange={(newRules) => setCblFilterRules(newRules)}
                            entityLabel="charters"
                          />
                          <SortPopover
                            options={cblSortOptions}
                            sortBy={cblSortBy}
                            onSortByChange={(val) => setCblSortBy(val)}
                            sortOrder={cblSortOrder}
                            onSortOrderChange={(val) => setCblSortOrder(val)}
                          />
                          <GroupPopover
                            options={cblGroupOptions}
                            groupBy={cblGroupBy}
                            onGroupByChange={(val) => setCblGroupBy(val)}
                          />
                          <DateRangeFilterButton
                            startDate={cblStartDate}
                            endDate={cblEndDate}
                            onApply={({ startDate: s, endDate: e }) => {
                              setCblStartDate(s);
                              setCblEndDate(e);
                            }}
                            onClear={() => {
                              setCblStartDate("");
                              setCblEndDate("");
                            }}
                            disableFutureDates={false}
                          />
                        </div>
                      </DataViewToolbar>

                      {selectedOsasOrganization && (
                        <ActiveFilterChips
                          chips={cblActiveChips}
                          searchQuery={cblSearch}
                          onClearSearch={() => setCblSearch("")}
                          onClearAll={() => {
                            setCblSearch("");
                            setCblFilterRules([]);
                            setCblStartDate("");
                            setCblEndDate("");
                          }}
                          className="border-t border-border dark:border-border bg-white dark:bg-card px-6 py-2.5"
                        />
                      )}

                      {/* Submissions & Versions History */}
                      <div className={cn("border-t border-border dark:border-border flex-1", !selectedOsasOrganization && "hidden")}>
                        {cblLoading && !cblOrgData && cblVersions.length === 0 ? (
                          <div className="p-5">
                            <StudentOsasProposalsListSkeleton count={3} stream="cbl" />
                          </div>
                        ) : cblLoadFailed && cblVersions.length === 0 ? (
                          <StudentHistoryLoadError
                            title="Could not load charter history"
                            onRetry={() => loadCblData(selectedOsasOrgId)}
                            loading={cblLoading}
                          />
                        ) : cblVersions.length === 0 ? (
                          <div className="rounded-b-2xl flex-1 flex flex-col items-center justify-center min-h-[420px] w-full">
                            <Empty>
                              <EmptyHeader>
                                <EmptyMedia><EmptyBookOpen01Icon size="1em" /></EmptyMedia>
                                <EmptyTitle>
                                  No CBL submissions yet
                                </EmptyTitle>
                                <EmptyDescription>
                                  Submit your organization&apos;s Constitution and By-Laws or proposed amendments.
                                </EmptyDescription>
                              </EmptyHeader>
                              {selectedOsasOrganization && !isFormOpen && (
                                <EmptyContent>
                                  <Button
                                    type="button"
                                    size="sm"
                                    onClick={() => setIsFormOpen(true)}
                                    title="Open CBL form"
                                    className="flex h-9 px-4 cursor-pointer border-0"
                                  >
                                    Open CBL form
                                  </Button>
                                </EmptyContent>
                              )}
                            </Empty>
                          </div>
                        ) : filteredCblVersions.length === 0 ? (
                          <div className="rounded-b-2xl flex-1 flex flex-col items-center justify-center min-h-[420px] w-full">
                            <Empty>
                              <EmptyHeader>
                                <EmptyMedia><EmptySearch01Icon size="1em" /></EmptyMedia>
                                <EmptyTitle>
                                  No matches found
                                </EmptyTitle>
                                <EmptyDescription>
                                  Try adjusting your search or filter criteria.
                                </EmptyDescription>
                              </EmptyHeader>
                              <EmptyContent>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setCblSearch("");
                                    setCblFilterRules([]);
                                    setCblStartDate("");
                                    setCblEndDate("");
                                  }}
                                  title="Reset filters"
                                  className="h-9 px-4 text-xs font-semibold rounded-xl"
                                >
                                  Reset filters
                                </Button>
                              </EmptyContent>
                            </Empty>
                          </div>
                        ) : (
                          <div>
                            {groupedCblVersions.map((group) => (
                              <div key={group.key || "all"}>
                                {group.label && (
                                  <DataGroupHeader label={group.label} count={group.items.length} />
                                )}
                                <div className="space-y-3 p-5">
                                {group.items.map((ver) => (
                                  <article
                                    key={ver.id}
                                    onClick={() => setSelectedCblVersionForDetail(ver)}
                                    className="group rounded-xl border border-border p-4 dark:border-border hover:bg-gray-50/50 dark:hover:bg-white/2 transition-colors cursor-pointer select-none"
                                  >
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                      <h3 className="text-[14px] font-medium text-[#111111] dark:text-zinc-100 group-hover:text-pup-maroon dark:group-hover:text-red-400 transition-colors">
                                        {ver.version_tag || `v${ver.version_number || "1.0"}`}
                                      </h3>
                                      <div className="flex items-center gap-2">
                                        <StatusBadge status={ver.status} />
                                        {selectedOsasOrgId && (
                                          <button
                                            type="button"
                                            onClick={(event) => {
                                              event.stopPropagation();
                                              handleOpenPdfPreview(null, {
                                                url: `/api/student/organizations/${selectedOsasOrgId}/bylaws?file=1&versionId=${ver.id}`,
                                                title: `${cblOrgData?.name || "Organization"}: ${ver.version_tag || "CBL"}`,
                                                subtitle: `Submitted by ${ver.submitted_by_name || ver.submitted_by_email || "Student Officer"}. Status: ${ver.status}`,
                                                studentName: ver.submitted_by_name || me?.name || "Student",
                                                docType: "Constitution & By-Laws",
                                                originalFilename: ver.original_filename || "Constitution-and-By-Laws.pdf",
                                              });
                                            }}
                                            title={PDF_ACTION_LABELS.preview}
                                            aria-label={PDF_ACTION_LABELS.preview}
                                            className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10 hover:text-pup-maroon dark:hover:text-red-400 transition-colors cursor-pointer"
                                          >
                                            <File02Icon size="1em" className="text-[16px]" />
                                          </button>
                                        )}
                                      </div>
                                    </div>

                                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                                      <p className="text-[13px] font-normal text-[#8E8E93] dark:text-zinc-400">
                                        {selectedOsasOrganization?.organization_name || cblOrgData?.name || "Organization"}
                                        {ver.effective_date
                                          ? ` · Effective ${formatProposalEventDate(ver.effective_date)}`
                                          : ver.created_at
                                          ? ` · ${formatPHDateTime(ver.created_at)}`
                                          : ""}
                                      </p>
                                      {ver.effective_date && ver.created_at && (
                                        <span className="text-xs text-gray-500 dark:text-zinc-400">
                                          Submitted {formatPHDateTime(ver.created_at)}
                                        </span>
                                      )}
                                    </div>

                                    <div className="mt-3 flex flex-col gap-2 border-t border-border/70 pt-3 dark:border-border">
                                      {(ver.status === "Needs Revision" || ver.status === "Declined") && ver.review_notes && (
                                        <div className="min-w-0 space-y-1">
                                          <p className="text-[11px] font-semibold text-gray-700 dark:text-zinc-300">OSAS Review Feedback</p>
                                          <div className="line-clamp-2 text-xs leading-relaxed text-gray-600 dark:text-zinc-400">
                                            <NarrativeText text={ver.review_notes} mode="compact" />
                                          </div>
                                        </div>
                                      )}
                                      <div className="flex justify-end">
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedCblVersionForDetail(ver);
                                          }}
                                          className="group/more inline-flex items-center gap-1 text-xs font-semibold text-pup-maroon hover:underline underline-offset-4 dark:text-red-400 cursor-pointer"
                                        >
                                          <span>View charter details</span>
                                          <ArrowUpRight01Icon size={14} aria-hidden="true" className="shrink-0 transition-transform group-hover/more:translate-x-0.5 group-hover/more:-translate-y-0.5" />
                                        </button>
                                      </div>
                                    </div>
                                  </article>
                                ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  </ContentSwap>
                </Card>
              )}
                </ContentSwap>
              </div>
            </div>
          </main>
        </div>
      </div>

      {/* Request Details & Timeline: Sheet Slide-Over */}
      <Sheet
        open={Boolean(selectedRequestForDetail)}
        onOpenChange={(open) => !open && setSelectedRequestForDetail(null)}
      >
        <SheetContent
          side="right"
          size="default"
          showCloseButton={false}
          className="w-full sm:max-w-md md:max-w-lg lg:max-w-xl flex flex-col h-full font-jakarta p-0 overflow-hidden"
        >
          <SheetHeader className="shrink-0 p-0">
            <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
              <div>
                <SheetTitle>Document request details</SheetTitle>
                <SheetDescription className="sr-only">
                  Detailed status, documents, and updates for student request
                </SheetDescription>
              </div>

              <div className="ml-auto flex items-center gap-3">
                {sortedRequests.length > 1 && (
                  <SheetPagination
                    compact
                    label="Record navigation"
                    page={Math.max(1, currentRequestDetailIndex + 1)}
                    totalPages={sortedRequests.length}
                    onPrevious={handlePrevRequestDetail}
                    onNext={handleNextRequestDetail}
                    previousDisabled={currentRequestDetailIndex <= 0}
                    nextDisabled={currentRequestDetailIndex >= sortedRequests.length - 1}
                    previousLabel="Previous Request"
                    nextLabel="Next Request"
                  />
                )}

                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => setSelectedRequestForDetail(null)}
                      className="size-8 rounded-full bg-black/[0.04] hover:bg-black/[0.08] dark:bg-white/[0.08] dark:hover:bg-white/[0.14] text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-100 flex items-center justify-center transition-all cursor-pointer active:scale-95 border border-black/[0.04] dark:border-white/[0.08] shadow-2xs"
                      aria-label="Close"
                    >
                      <Cancel01Icon size="1em" className="text-sm" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Close</TooltipContent>
                </Tooltip>
              </div>
            </div>
          </SheetHeader>

          {requestNotice && (
            <CampusStatusNotice tone={requestNotice.tone ?? "info"} title={requestNotice.title}>{requestNotice.message}</CampusStatusNotice>
          )}

          <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto p-6 scrollbar-thin [&>section]:shrink-0">
            <section className="space-y-2">
              <SheetSectionHeading icon="SlidersHorizontalIcon" title="Request information" />
              <div>
                <SheetReferenceRow label="Request ID" reference={selectedRequestReference} />
                <InfoRow icon="File02Icon" label="Document Type" value={selectedRequestForDetail?.doc_type} />
                {selectedRequestForDetail?.status && (
                  <InfoRow icon="CheckListIcon" label="Status">
                    <StatusBadge compact status={readyInquiry ? "Inquiry Response Available" : selectedRequestForDetail.status} />
                  </InfoRow>
                )}
                <InfoRow
                  icon="Calendar01Icon"
                  label="Submitted On"
                  value={selectedRequestForDetail?.created_at ? formatPHDateTime(selectedRequestForDetail.created_at) : "N/A"}
                />
                <InfoRow icon="Building01Icon" label="Verifying Office" value="Office of the Campus Registrar" />
                <InfoRow icon="Tag01Icon" label="Client Type" value={selectedRequestForDetail?.client_type || "Enrolled Student"} />
                {selectedRequestForDetail?.status === "Ready" && !readyInquiry && selectedRequestForDetail.pickup_claim_by && (
                  <InfoRow icon="Calendar01Icon" label="Claim By" value={new Date(selectedRequestForDetail.pickup_claim_by).toLocaleDateString("en-PH", { dateStyle: "long", timeZone: "Asia/Manila" })} />
                )}
                {selectedRequestForDetail?.status === "Ready" && !readyInquiry && (
                  <InfoRow icon="Door01Icon" label="Pickup Instructions" value={
                    <span className="whitespace-pre-wrap">{selectedRequestForDetail.pickup_instructions || "Contact the Registrar for pickup instructions."}</span>
                  } />
                )}
                {selectedRequestForDetail?.status === "Completed" && selectedRequestForDetail?.updated_at && (
                  <InfoRow icon="CalendarCheckIn01Icon" label="Claimed On" value={formatPHDateTime(selectedRequestForDetail.updated_at)} />
                )}
                {selectedRequestForDetail?.client_type === "Parent" && (
                  <>
                    <InfoRow icon="UserIcon" label="Representative" value={selectedRequestForDetail.requester_name || "N/A"} />
                    <InfoRow icon="Contact01Icon" label="Relationship" value={selectedRequestForDetail.requester_relationship || "Legal Guardian"} />
                    <InfoRow icon="CallIcon" label="Contact" value={selectedRequestForDetail.requester_contact || "N/A"} />
                    <InfoRow icon="Shield01Icon" label="Authorization">
                      <span className={cn(COMPACT_BADGE_BASE, selectedRequestForDetail.spa_verified ? BADGE_PALETTES.emerald : BADGE_PALETTES.amber)}>
                        {selectedRequestForDetail.spa_verified ? "SPA Verified" : "SPA Pending"}
                      </span>
                    </InfoRow>
                  </>
                )}
              </div>
            </section>

            {selectedRequestForDetail?.notes && (
              <section className="space-y-2">
                <SheetSectionHeading icon="Message01Icon" title="Purpose and notes" />
                <div className="whitespace-pre-wrap text-xs leading-relaxed text-gray-700 dark:text-zinc-300">
                  <NarrativeText text={selectedRequestForDetail.notes} mode="full" />
                </div>
              </section>
            )}

            <RequestCorrectionsSection
              request={selectedRequestForDetail}
              busy={correctionUploading}
              onSubmit={(itemId, file) => handleCorrectionUpload(selectedRequestForDetail.id, itemId, file)}
              onPreview={(item, name) => {
                const url = item?.previewUrl || item?.url;
                if (!url) return;
                handleOpenPdfPreview(null, {
                  url,
                  title: name,
                  originalFilename: item.original_filename || item.file?.name,
                });
              }}
            />

            {/* Payment Proof Upload Notice (if PendingPayment) */}
            {selectedRequestForDetail?.status === "PendingPayment" && (
              <section className="space-y-2.5">
                <SheetSectionHeading icon="Invoice01Icon" title="Payment proof" />
                <p className="text-xs text-amber-800 dark:text-amber-300">
                  Attach your receipt or payment confirmation slip below (PDF, PNG, JPG, or WEBP up to 10\u00A0MB). You can preview or remove the file before submitting.
                </p>
                <FileAttachmentDropzone
                  animateCards={false}
                  mode="single"
                  accept=".pdf,.png,.jpg,.jpeg,.webp"
                  title="Drop receipt or payment slip here, or browse"
                  subtitle="PDF, PNG, JPG, or WEBP up to 10 MB"
                  value={pendingPaymentProof?.requestId === selectedRequestForDetail.id ? pendingPaymentProof.item : null}
                  isUploading={paymentUploadRequestId === selectedRequestForDetail.id}
                  uploadProgress={paymentUploadRequestId === selectedRequestForDetail.id ? 65 : null}
                  onChange={(item) =>
                    setPendingPaymentProof(item ? { requestId: selectedRequestForDetail.id, item } : null)
                  }
                  onPreview={(item) => {
                    const previewUrl = item?.previewUrl || item?.url;
                    if (!previewUrl) return;
                    setPdfPreviewData({
                      url: previewUrl,
                      title: item.original_filename || item.file?.name || "Payment Proof",
                      subtitle: `Receipt preview for Request ${selectedRequestForDetail.id}`,
                      studentName: selectedRequestForDetail.student_name || "Requester",
                      docType: "Payment Proof",
                      originalFilename: item.original_filename || item.file?.name,
                    });
                    setPdfPreviewOpen(true);
                  }}
                />
                {pendingPaymentProof?.requestId === selectedRequestForDetail.id && pendingPaymentProof?.item?.file && (
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={paymentUploadRequestId === selectedRequestForDetail.id}
                      onClick={() => setPendingPaymentProof(null)}
                    >
                      Remove file
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      disabled={paymentUploadRequestId === selectedRequestForDetail.id}
                      onClick={() => handlePaymentProofUpload(selectedRequestForDetail.id, pendingPaymentProof.item.file)}
                    >
                      {paymentUploadRequestId === selectedRequestForDetail.id ? "Uploading…" : "Submit payment proof"}
                    </Button>
                  </div>
                )}
              </section>
            )}

            {/* Attached Supporting Documents (Unboxed) */}
            {Array.isArray(selectedRequestForDetail?.attachments) && selectedRequestForDetail.attachments.length > 0 && (
              <section className="space-y-2">
                <SheetSectionHeading icon="Attachment01Icon" title={`Attached Documents (${selectedRequestForDetail.attachments.length})`} />
                <AttachmentViews>
                  {(Attachment) => selectedRequestForDetail.attachments.map((att) => {
                    const fileUrl = att.url || `/api/document-requests/${selectedRequestForDetail.id}/attachments/${att.id}`;
                    const canRemoveReceipt =
                      selectedRequestForDetail?.status === "PendingPayment" &&
                      att.attachment_type === "receipt" &&
                      removingAttachmentId !== att.id;
                    return (
                      <Attachment
                        key={att.id}
                        readOnly={!canRemoveReceipt}
                        compactBadge
                        item={{ ...att, url: fileUrl }}
                        onRemove={
                          canRemoveReceipt
                            ? () => handleDeletePaymentProof(selectedRequestForDetail.id, att.id)
                            : undefined
                        }
                        onPreview={() => {
                            setPdfPreviewData({
                              url: fileUrl,
                              title: att.original_filename,
                              subtitle: `Attached file for Request ${selectedRequestForDetail.id}`,
                              studentName: selectedRequestForDetail.student_name || "Requester",
                              docType: "Supporting Document",
                              originalFilename: att.original_filename,
                            });
                            setPdfPreviewOpen(true);
                        }}
                      />
                    );
                  })}
                </AttachmentViews>
              </section>
            )}

            {selectedRequestForDetail?.feedback && (
              <section className="space-y-2">
                <SheetSectionHeading icon="StarIcon" title="Experience Feedback">
                  <Button
                    type="button"
                    variant="outline"
                    size="xs"
                    onClick={() => {
                      setFeedbackRequest(selectedRequestForDetail);
                      setFeedbackInitialRating(selectedRequestForDetail.feedback?.rating || 0);
                      setFeedbackModalOpen(true);
                    }}
                  >
                    Edit Feedback
                  </Button>
                </SheetSectionHeading>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <svg
                        key={star}
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        className={cn(
                          "h-4 w-4",
                          star <= selectedRequestForDetail.feedback.rating
                            ? "fill-amber-400 text-amber-400"
                            : "fill-transparent text-gray-300 dark:text-zinc-600"
                        )}
                        stroke="currentColor"
                        strokeWidth="1.5"
                      >
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                      </svg>
                    ))}
                  </div>
                  <span className="text-xs font-semibold text-gray-800 dark:text-zinc-200">
                    {selectedRequestForDetail.feedback.rating}/5 · {RATING_LABELS[selectedRequestForDetail.feedback.rating] || ""}
                  </span>
                  {selectedRequestForDetail.feedback.created_at && (
                    <span className="text-[11px] text-gray-400 dark:text-zinc-500 sm:ml-auto">
                      Submitted on {formatPHDateTime(selectedRequestForDetail.feedback.created_at)}
                    </span>
                  )}
                </div>

                {selectedRequestForDetail.feedback.aspect_tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    {selectedRequestForDetail.feedback.aspect_tags.map((tag) => (
                      <span
                        key={tag}
                        className={cn(COMPACT_BADGE_BASE, BADGE_PALETTES.slate)}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {selectedRequestForDetail.feedback.comments && (
                  <div className="text-xs text-gray-600 dark:text-zinc-400 italic">
                    &ldquo;<NarrativeText text={selectedRequestForDetail.feedback.comments} mode="full" />&rdquo;
                  </div>
                )}
              </section>
            )}

            <DocumentRequestTimeline request={selectedRequestForDetail} />

            {canRateSelectedRequest && (
              <RequestFeedbackCard
                key={selectedRequestForDetail.id}
                minimized={feedbackMinimized}
                onToggle={() => setFeedbackMinimized((current) => !current)}
                onRate={rateSelectedRequest}
              />
            )}
          </div>

          <SheetFooter className="shrink-0 p-4 px-6 flex flex-row items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedRequestForDetail(null)}
              className="h-9 px-4"
            >
              Close
            </Button>
            {feedbackMinimized && canRateSelectedRequest && (
              <Button type="button" size="sm" onClick={rateSelectedRequest} className="h-9 px-4 border-0">
                Rate Service
              </Button>
            )}
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* OSAS Proposal Details & Timeline: Sheet Slide-Over */}
      <Sheet
        open={Boolean(selectedProposalForDetail)}
        onOpenChangeComplete={focusOsasRevisionForm}
        onOpenChange={(open) => !open && setSelectedProposalForDetail(null)}
      >
        <SheetContent
          side="right"
          size="default"
          showCloseButton={false}
          className="w-full sm:max-w-md md:max-w-lg lg:max-w-xl flex flex-col h-full font-jakarta p-0 overflow-hidden"
        >
          <SheetHeader className="shrink-0 p-0">
            <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
              <div>
                <SheetTitle>
                  Event Proposal Details
                </SheetTitle>
                <SheetDescription className="sr-only">
                  Detailed evaluation, attachments, and timeline for event proposal
                </SheetDescription>
              </div>

              <div className="ml-auto flex items-center gap-3">
                {filteredProposals.length > 1 && (
                  <SheetPagination
                    compact
                    label="Record navigation"
                    page={Math.max(1, currentProposalDetailIndex + 1)}
                    totalPages={filteredProposals.length}
                    onPrevious={handlePrevProposalDetail}
                    onNext={handleNextProposalDetail}
                    previousDisabled={currentProposalDetailIndex <= 0}
                    nextDisabled={currentProposalDetailIndex >= filteredProposals.length - 1}
                    previousLabel="Previous Proposal"
                    nextLabel="Next Proposal"
                  />
                )}

                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => setSelectedProposalForDetail(null)}
                      className="size-8 rounded-full bg-black/[0.04] hover:bg-black/[0.08] dark:bg-white/[0.08] dark:hover:bg-white/[0.14] text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-100 flex items-center justify-center transition-all cursor-pointer active:scale-95 border border-black/[0.04] dark:border-white/[0.08] shadow-2xs"
                      aria-label="Close"
                    >
                      <Cancel01Icon size="1em" className="text-sm" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Close</TooltipContent>
                </Tooltip>
              </div>
            </div>
          </SheetHeader>

          <CampusStatusNotice tone={proposalNotice.tone ?? "info"} title={proposalNotice.title}>{proposalNotice.message}</CampusStatusNotice>

          <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-6 scrollbar-thin">
            <section className="space-y-2">
              <SheetSectionHeading icon="SlidersHorizontalIcon" title="Proposal Information" />
              <div>
                <SheetReferenceRow
                  label="Proposal ID"
                  reference={selectedProposalForDetail?.tracking_number || (selectedProposalForDetail?.id != null ? `EVT-${selectedProposalForDetail.id}` : null)}
                />
                <InfoRow icon="File02Icon" label="Event Title" value={selectedProposalForDetail?.title} />
                <InfoRow icon="PieChartIcon" label="Status">
                  <StatusBadge compact status={selectedProposalForDetail?.status} />
                </InfoRow>
                <InfoRow icon="Calendar01Icon" label="Submitted On" value={selectedProposalForDetail?.created_at ? formatPHDateTime(selectedProposalForDetail.created_at) : "N/A"} />
                <InfoRow icon="Building01Icon" label="Organization" value={selectedProposalForDetail?.organization_name || "Student Organization"} />
                <InfoRow icon="CalendarCheckIn01Icon" label="Target Event Date" value={formatProposalEventDate(selectedProposalForDetail?.event_date)} />
              </div>
            </section>

            {/* Attached PDF Proposal File (Unboxed Sleek Row) */}
            {selectedProposalForDetail?.original_filename && (
              <div className="space-y-2">
                <SheetSectionHeading icon="Attachment01Icon" title="Attached Proposal Document" />
                <SheetAttachmentRow
                  filename={selectedProposalForDetail.original_filename}
                  fileUrl={`/api/student/event-proposals/${selectedProposalForDetail.id}?file=1`}
                  size={selectedProposalForDetail.size_bytes}
                  onPreview={() => handleOpenPdfPreview(selectedProposalForDetail)}
                />
              </div>
            )}

            {selectedProposalForDetail?.versions?.length > 0 && (
              <details
                key={selectedProposalForDetail.id}
                open
                className="group rounded-xl border border-border/70 bg-gray-50/70 dark:border-border/60 dark:bg-zinc-800/40"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-2 rounded-xl px-3 py-2.5 focus-visible:outline-2 focus-visible:outline-ring [&::-webkit-details-marker]:hidden">
                  <span className="flex min-w-0 items-center gap-2 text-xs font-semibold text-gray-800 dark:text-zinc-200">
                    <AppIcon icon="Files01Icon" aria-hidden="true" className="shrink-0 text-sm text-pup-maroon dark:text-red-400" />
                    Submitted PDF Versions
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <Badge variant="gray" size="compact" className="tabular-nums">
                      {selectedProposalForDetail.versions.length} {selectedProposalForDetail.versions.length === 1 ? "version" : "versions"}
                    </Badge>
                    <ArrowDown01Icon size={16} aria-hidden="true" className="text-muted-foreground transition-transform group-open:rotate-180 motion-reduce:transition-none" />
                  </span>
                </summary>
                <div className="space-y-2 px-3 pb-3">
                  {[...selectedProposalForDetail.versions].reverse().map((version, index) => {
                    const available = !version.file_pruned_at;
                    return (
                      <SheetAttachmentRow
                        key={version.id}
                        filename={version.original_filename || "Proposal.pdf"}
                        size={version.size_bytes}
                        fileUrl={available ? `/api/student/event-proposals/${selectedProposalForDetail.id}?file=1&revisionId=${version.id}` : undefined}
                        description={`Revision ${version.revision_number}${index === 0 ? " · Current" : ""} · ${formatPHDateTime(version.created_at)}${available ? "" : " · PDF removed after approval"}`}
                        onPreview={available ? () => handleOpenPdfPreview(null, {
                          url: `/api/student/event-proposals/${selectedProposalForDetail.id}?file=1&revisionId=${version.id}`,
                          title: `${selectedProposalForDetail.title} · Revision ${version.revision_number}`,
                          subtitle: `Submitted for ${selectedProposalForDetail.organization_name || "OSAS"}.`,
                          studentName: me?.name || "Student",
                          docType: "Event Proposal",
                          originalFilename: version.original_filename || "Proposal.pdf",
                        }) : undefined}
                      />
                    );
                  })}
                </div>
              </details>
            )}

            <section className="space-y-3">
              <SheetSectionHeading icon="Clock01Icon" title="Evaluation Timeline & Updates">
                <SheetUpdateCount count={selectedProposalForDetail?.updates?.length ?? 0} />
              </SheetSectionHeading>

              {selectedProposalForDetail?.updates && selectedProposalForDetail.updates.length > 0 ? (
                <div className="relative space-y-4">
                  {selectedProposalForDetail.updates.length > 1 && (
                    <div className="absolute left-2.5 top-2.5 bottom-2.5 w-0.5 -translate-x-1/2 bg-gray-200 dark:bg-zinc-800" />
                  )}
                  {selectedProposalForDetail.updates.map((upd, idx) => {
                    const isConsecutiveSameStatus =
                      idx > 0 && upd.status === selectedProposalForDetail.updates[idx - 1].status;

                    const submissionUpdate = upd.message?.match(PROPOSAL_SUBMISSION_UPDATE);

                    return (
                      <div key={upd.id || idx} className="relative pl-7">
                        <div
                          className={cn(
                            "absolute left-2.5 -translate-x-1/2 rounded-full border-2 border-white dark:border-border shadow-xs",
                            isConsecutiveSameStatus
                              ? "top-1.5 h-2.5 w-2.5 bg-gray-400 dark:bg-zinc-500"
                              : "top-1 h-3.5 w-3.5 bg-pup-maroon ring-2 ring-pup-maroon/20"
                          )}
                        />
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={cn(
                                "text-xs",
                                isConsecutiveSameStatus
                                  ? "font-semibold text-gray-700 dark:text-zinc-300"
                                  : "font-bold text-gray-900 dark:text-zinc-100"
                              )}
                            >
                              {isConsecutiveSameStatus ? "Evaluation Follow-Up" : upd.status}
                            </span>
                            {isConsecutiveSameStatus && (
                              <StatusBadge compact status={upd.status} />
                            )}
                          </div>
                          {upd.created_at && (
                            <span className="text-[11px] text-gray-400 dark:text-zinc-500 font-sans tabular-nums">
                              {formatPHDateTime(upd.created_at)}
                            </span>
                          )}
                        </div>
                        <div className="mt-1 text-xs text-gray-600 dark:text-zinc-400 leading-normal">
                          {submissionUpdate ? (
                            <ProposalSubmissionNarrative submission={submissionUpdate} name={selectedProposalForDetail.student_name} user={me} />
                          ) : (
                            <NarrativeText text={upd.message || "Status updated by OSAS"} mode="full" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <EmptyState
                  variant="compact"
                  title="No Updates Posted Yet"
                  description="Your proposal is queued for evaluation by OSAS."
                />
              )}
            </section>
          </div>

          <SheetFooter className="shrink-0 p-4 px-6 flex flex-row items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedProposalForDetail(null)}
              className="h-9 px-4"
            >
              Close
            </Button>
            {selectedProposalStatus === "Needs Revision" && (
              <Button
                size="sm"
                onClick={() => startProposalRevision(selectedProposalForDetail)}
                disabled={!myOrganizations.some((org) => String(org.organization_id) === String(selectedProposalForDetail?.organization_id))}
                title={!myOrganizations.some((org) => String(org.organization_id) === String(selectedProposalForDetail?.organization_id)) ? "Contact OSAS to confirm organization authorization" : "Upload a revised proposal PDF"}
                className="h-9 px-4 text-xs font-semibold"
              >
                Revise &amp; Resubmit
              </Button>
            )}
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* OSAS Post-Event Report Details: Sheet Slide-Over */}
      <Sheet
        open={Boolean(selectedPostEventReportForDetail)}
        onOpenChangeComplete={focusOsasRevisionForm}
        onOpenChange={(open) => !open && setSelectedPostEventReportForDetail(null)}
      >
        <SheetContent
          side="right"
          size="default"
          showCloseButton={false}
          className="w-full sm:max-w-md md:max-w-lg lg:max-w-xl flex flex-col h-full font-jakarta p-0 overflow-hidden"
        >
          <SheetHeader className="shrink-0 p-0">
            <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
              <div>
                <SheetTitle>Post-event report details</SheetTitle>
                <SheetDescription className="sr-only">
                  Submitted event report details, attachments, and OSAS review note
                </SheetDescription>
              </div>

              <div className="ml-auto flex items-center gap-3">
                {sortedPostEventReports.length > 1 && (
                  <SheetPagination
                    compact
                    label="Post-event report navigation"
                    page={Math.max(1, currentPostEventReportDetailIndex + 1)}
                    totalPages={sortedPostEventReports.length}
                    onPrevious={handlePrevPostEventReportDetail}
                    onNext={handleNextPostEventReportDetail}
                    previousDisabled={currentPostEventReportDetailIndex <= 0}
                    nextDisabled={currentPostEventReportDetailIndex >= sortedPostEventReports.length - 1}
                    previousLabel="Previous Report"
                    nextLabel="Next Report"
                  />
                )}

                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => setSelectedPostEventReportForDetail(null)}
                      className="size-8 rounded-full bg-black/[0.04] hover:bg-black/[0.08] dark:bg-white/[0.08] dark:hover:bg-white/[0.14] text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-100 flex items-center justify-center transition-all cursor-pointer active:scale-95 border border-black/[0.04] dark:border-white/[0.08] shadow-2xs"
                      aria-label="Close"
                    >
                      <Cancel01Icon size="1em" className="text-sm" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Close</TooltipContent>
                </Tooltip>
              </div>
            </div>
          </SheetHeader>

          {selectedPostEventReportForDetail && (
            <>
              <CampusStatusNotice tone={postEventNotice.tone ?? "info"} title={postEventNotice.title}>{postEventNotice.message}</CampusStatusNotice>

              <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-6 scrollbar-thin">
                <section className="space-y-2">
                  <SheetSectionHeading icon="SlidersHorizontalIcon" title="Post-Event Information" />
                  <div>
                    <SheetReferenceRow label="Report ID" reference={selectedPostEventReportForDetail.id != null ? `RPT-${selectedPostEventReportForDetail.id}` : null} />
                    <InfoRow icon="File02Icon" label="Event Title" value={selectedPostEventReportForDetail.event_title} />
                    <InfoRow icon="PieChartIcon" label="Status">
                      <StatusBadge compact status={selectedPostEventReportForDetail.status} />
                    </InfoRow>
                    <InfoRow icon="Calendar01Icon" label="Submitted On" value={selectedPostEventReportForDetail.created_at ? formatPHDateTime(selectedPostEventReportForDetail.created_at) : "N/A"} />
                    <InfoRow icon="Building01Icon" label="Organization" value={selectedPostEventReportForDetail.organization_name} />
                    <InfoRow icon="Calendar01Icon" label="Event Date" value={formatProposalEventDate(selectedPostEventReportForDetail.event_date)} />
                    {selectedPostEventReportForDetail.venue && (
                      <InfoRow icon="Location01Icon" label="Venue" value={selectedPostEventReportForDetail.venue} />
                    )}
                    <InfoRow icon="UserIcon" label="Submitter" value={selectedPostEventReportForDetail.student_name || selectedPostEventReportForDetail.submitted_by_email || me?.name} />
                    <InfoRow icon="UserSearch01Icon" label="Actual Attendance" value={`${Number(selectedPostEventReportForDetail.actual_attendance ?? selectedPostEventReportForDetail.actual_attendees ?? 0).toLocaleString()} attendees`} />
                    <InfoRow icon="Coins01Icon" label="Liquidated Spend" value={`₱${Number(selectedPostEventReportForDetail.total_expenses ?? selectedPostEventReportForDetail.actual_expenses ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`} />
                    {selectedPostEventReportForDetail.event_proposal_id && (
                      <SheetReferenceRow
                        icon="CalendarCheckIn01Icon"
                        label="Event Proposal"
                        reference={selectedPostEventReportForDetail.event_tracking_number || `EVT-${selectedPostEventReportForDetail.event_proposal_id}`}
                      />
                    )}
                  </div>
                </section>

                {selectedPostEventReportForDetail.narrative_summary && (
                  <div className="space-y-2">
                    <SheetSectionHeading icon="Message01Icon" title="Accomplishment Summary" />
                    <div className="text-xs text-gray-700 dark:text-zinc-300 leading-relaxed">
                      <NarrativeText text={selectedPostEventReportForDetail.narrative_summary} mode="full" />
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <SheetSectionHeading icon="Attachment01Icon" title="Submitted Documents" />
                  <div className="space-y-2">
                    {[
                      {
                        key: "narrative",
                        label: "Narrative Report",
                        docType: "Post-Event Narrative Report",
                        filename: selectedPostEventReportForDetail.narrative_original_filename,
                        storageFilename: selectedPostEventReportForDetail.narrative_storage_filename,
                      },
                      {
                        key: "liquidation",
                        label: "Financial Liquidation",
                        docType: "Financial Liquidation Report",
                        filename: selectedPostEventReportForDetail.liquidation_original_filename,
                        storageFilename: selectedPostEventReportForDetail.liquidation_storage_filename,
                      },
                    ].map((file) => (
                      <SheetAttachmentRow
                        key={file.key}
                        filename={file.filename || (file.storageFilename ? `${file.key}.pdf` : "No file attached")}
                        description={file.label}
                        fileUrl={file.storageFilename ? `/api/student/post-event-reports/${selectedPostEventReportForDetail.id}?file=${file.key}` : undefined}
                        onPreview={file.storageFilename ? () => handleOpenPdfPreview(null, {
                          url: `/api/student/post-event-reports/${selectedPostEventReportForDetail.id}?file=${file.key}`,
                          title: `${file.label}: ${selectedPostEventReportForDetail.event_title}`,
                          subtitle: `Submitted by ${selectedPostEventReportForDetail.submitted_by_email || me?.email || "Student Officer"}`,
                          studentName: me?.name || "Student",
                          docType: file.docType,
                          originalFilename: file.filename || `${file.key}.pdf`,
                        }) : undefined}
                      />
                    ))}
                  </div>
                </div>
                <section className="space-y-3">
                  <SheetSectionHeading icon="Clock01Icon" title="Evaluation Timeline & Updates">
                    {reportTimeline?.updates && <SheetUpdateCount count={reportTimeline.updates.length} />}
                  </SheetSectionHeading>
                  {!reportTimeline ? (
                    <p role="status" className="text-xs text-muted-foreground">Loading evaluation updates…</p>
                  ) : reportTimeline.failed ? (
                    <p role="status" className="text-xs text-muted-foreground">Could not load evaluation updates. Reopen the report to try again.</p>
                  ) : (
                    <SheetEvaluationTimeline updates={reportTimeline.updates} />
                  )}
                  {selectedPostEventReportForDetail.review_note
                    && reportTimeline
                    && !reportTimeline.updates?.some((update) => update.message === selectedPostEventReportForDetail.review_note) && (
                      <div className="space-y-1 text-xs text-gray-700 dark:text-zinc-300">
                        <p className="font-semibold">Latest OSAS Review Note</p>
                        <NarrativeText text={selectedPostEventReportForDetail.review_note} mode="full" />
                      </div>
                    )}
                </section>
              </div>

              <SheetFooter className="shrink-0 p-4 px-6 flex flex-row items-center justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedPostEventReportForDetail(null)}
                  className="h-9 px-4"
                >
                  Close
                </Button>
                {selectedPostEventReportForDetail.status === "Needs Revision"
                  && selectedPostEventReportForDetail.post_event_status === "Needs Revision"
                  && selectedPostEventReportForDetail.proposal_status === "Approved"
                  && !organizationPostEventReports.some((report) =>
                    String(report.event_proposal_id) === String(selectedPostEventReportForDetail.event_proposal_id)
                    && Number(report.id) > Number(selectedPostEventReportForDetail.id)
                  )
                  && selectedOsasOrganization
                  && String(selectedPostEventReportForDetail.organization_id) === String(selectedOsasOrganization.organization_id) && (
                    <Button size="sm" onClick={() => startPostEventRevision(selectedPostEventReportForDetail)}>
                      Revise Post-Event Report
                    </Button>
                  )}
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* OSAS Constitution & By-Laws Details: Sheet Slide-Over */}
      <Sheet
        open={Boolean(selectedCblVersionForDetail)}
        onOpenChangeComplete={focusOsasRevisionForm}
        onOpenChange={(open) => !open && setSelectedCblVersionForDetail(null)}
      >
        <SheetContent
          side="right"
          size="default"
          showCloseButton={false}
          className="w-full sm:max-w-md md:max-w-lg lg:max-w-xl flex flex-col h-full font-jakarta p-0 overflow-hidden"
        >
          <SheetHeader className="shrink-0 p-0">
            <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
              <div>
                <SheetTitle>Constitution &amp; By-Laws details</SheetTitle>
                <SheetDescription className="sr-only">
                  Charter version details, submitted document, and OSAS feedback
                </SheetDescription>
              </div>

              <div className="ml-auto flex items-center gap-3">
                {sortedCblVersions.length > 1 && (
                  <SheetPagination
                    compact
                    label="Charter version navigation"
                    page={Math.max(1, currentCblVersionDetailIndex + 1)}
                    totalPages={sortedCblVersions.length}
                    onPrevious={handlePrevCblVersionDetail}
                    onNext={handleNextCblVersionDetail}
                    previousDisabled={currentCblVersionDetailIndex <= 0}
                    nextDisabled={currentCblVersionDetailIndex >= sortedCblVersions.length - 1}
                    previousLabel="Previous Version"
                    nextLabel="Next Version"
                  />
                )}

                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => setSelectedCblVersionForDetail(null)}
                      className="size-8 rounded-full bg-black/[0.04] hover:bg-black/[0.08] dark:bg-white/[0.08] dark:hover:bg-white/[0.14] text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-100 flex items-center justify-center transition-all cursor-pointer active:scale-95 border border-black/[0.04] dark:border-white/[0.08] shadow-2xs"
                      aria-label="Close"
                    >
                      <Cancel01Icon size="1em" className="text-sm" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Close</TooltipContent>
                </Tooltip>
              </div>
            </div>
          </SheetHeader>

          {selectedCblVersionForDetail && (
            <>
              <CampusStatusNotice tone={cblNotice.tone ?? "info"} title={cblNotice.title}>{cblNotice.message}</CampusStatusNotice>

              <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-6 scrollbar-thin">
                <section className="space-y-2">
                  <SheetSectionHeading icon="SlidersHorizontalIcon" title="Charter Information" />
                  <div>
                    <InfoRow icon="PieChartIcon" label="Status">
                      <StatusBadge compact status={selectedCblVersionForDetail.status} />
                    </InfoRow>
                    <InfoRow icon="Calendar01Icon" label="Submitted On" value={selectedCblVersionForDetail.created_at ? formatPHDateTime(selectedCblVersionForDetail.created_at) : "N/A"} />
                    <InfoRow icon="Building01Icon" label="Organization" value={selectedOsasOrganization?.organization_name || cblOrgData?.name} />
                    <SheetReferenceRow icon="BookBookmark01Icon" label="Version" reference={selectedCblVersionForDetail.version_tag || `v${selectedCblVersionForDetail.version_number || "1.0"}`} />
                    {selectedCblVersionForDetail.effective_date && (
                      <InfoRow icon="Calendar01Icon" label="Effective Date" value={formatProposalEventDate(selectedCblVersionForDetail.effective_date)} />
                    )}
                    <InfoRow icon="UserIcon" label="Submitted By" value={selectedCblVersionForDetail.submitted_by_name || selectedCblVersionForDetail.submitted_by_email || "Student Officer"} />
                    {selectedCblVersionForDetail.submitted_by_student_no && (
                      <SheetReferenceRow label="Student Number" reference={selectedCblVersionForDetail.submitted_by_student_no} />
                    )}
                    {selectedCblVersionForDetail.size_bytes && (
                      <InfoRow icon="File02Icon" label="File Size" value={`${(selectedCblVersionForDetail.size_bytes / 1024).toFixed(1)} KB`} />
                    )}
                  </div>
                </section>

                <div className="space-y-2">
                  <SheetSectionHeading icon="Message01Icon" title="Amendment Summary" />
                  <div className="text-xs text-gray-700 dark:text-zinc-300 leading-relaxed">
                    <NarrativeText text={selectedCblVersionForDetail.amendment_summary || "No amendment summary was provided."} mode="full" />
                  </div>
                </div>

                {selectedCblVersionForDetail.review_notes && (
                  <div className="space-y-2">
                    <SheetSectionHeading icon="Message01Icon" title="OSAS Review Feedback" />
                    <div className="text-xs text-gray-700 dark:text-zinc-300 leading-relaxed">
                      <NarrativeText text={selectedCblVersionForDetail.review_notes} mode="full" />
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <SheetSectionHeading icon="Attachment01Icon" title="Submitted Document" />
                  {selectedCblVersionForDetail.storage_filename && selectedOsasOrgId ? (
                    <SheetAttachmentRow
                      filename={selectedCblVersionForDetail.original_filename || "Constitution-and-By-Laws.pdf"}
                      size={selectedCblVersionForDetail.size_bytes}
                      downloadUrl={`/api/student/organizations/${selectedOsasOrgId}/bylaws?file=1&versionId=${selectedCblVersionForDetail.id}`}
                      onPreview={() => handleOpenPdfPreview(null, {
                        url: `/api/student/organizations/${selectedOsasOrgId}/bylaws?file=1&versionId=${selectedCblVersionForDetail.id}`,
                        title: `${cblOrgData?.name || "Organization"}: ${selectedCblVersionForDetail.version_tag || "CBL"}`,
                        subtitle: `Submitted by ${selectedCblVersionForDetail.submitted_by_name || selectedCblVersionForDetail.submitted_by_email || "Student Officer"}. Status: ${selectedCblVersionForDetail.status}`,
                        studentName: selectedCblVersionForDetail.submitted_by_name || me?.name || "Student",
                        docType: "Constitution & By-Laws",
                        originalFilename: selectedCblVersionForDetail.original_filename || "Constitution-and-By-Laws.pdf",
                      })}
                    />
                  ) : (
                    <EmptyState variant="compact" title="No File Attached" />
                  )}
                </div>
              </div>

              <SheetFooter className="shrink-0 p-4 px-6 flex flex-row items-center justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedCblVersionForDetail(null)}
                  className="h-9 px-4"
                >
                  Close
                </Button>
                {selectedCblVersionForDetail.status === "Needs Revision" && selectedOsasOrganization && (
                  <Button size="sm" onClick={() => startCblRevision(selectedCblVersionForDetail)}>
                    Revise &amp; Resubmit
                  </Button>
                )}
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* PDF Document Preview Modal */}
      <PDFPreviewModal
        open={pdfPreviewOpen}
        onClose={() => {
          setPdfPreviewOpen(false);
          setPdfPreviewData(null);
        }}
        preview={pdfPreviewData}
      />

      {/* Student Request Experience Feedback Modal */}
      <StudentFeedbackModal
        open={feedbackModalOpen}
        onClose={() => {
          setFeedbackModalOpen(false);
          setFeedbackRequest(null);
          setFeedbackInitialRating(0);
        }}
        request={feedbackRequest}
        initialRating={feedbackInitialRating}
        onFeedbackSubmitted={handleFeedbackSubmitted}
      />
    </TooltipProvider>
  );
}

function StudentPageWithView() {
  const searchParams = useSearchParams();
  const fallback = <InitialDashboardLoader><StudentDashboardSkeleton view={normalizeStudentTab(searchParams?.get("view"))} /></InitialDashboardLoader>;

  return (
    <Suspense fallback={fallback}>
      <StudentDashboard />
    </Suspense>
  );
}

export default function StudentPage() {
  return (
    <Suspense fallback={<InitialDashboardLoader><StudentDashboardSkeleton view={null} /></InitialDashboardLoader>}>
      <StudentPageWithView />
    </Suspense>
  );
}
