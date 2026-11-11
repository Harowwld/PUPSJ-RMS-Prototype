"use client";
import TablePagination from "@/components/shared/TablePagination";
import SheetPagination from "@/components/shared/SheetPagination";
import { PDF_ACTION_LABELS } from "@/lib/pdfPreview";
import { Textarea } from "@/components/ui/textarea";


import useUrlPage from "@/hooks/useUrlPage";
import { useCallback, useEffect, useState, useMemo, useRef, Suspense, Fragment } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { formatErrorMessage } from "@/lib/errorUtils";
import Sidebar from "@/components/shared/Sidebar";
import MyActivityPanel from "@/components/shared/MyActivityPanel";
import AccountSettingsPanel from "@/components/shared/AccountSettingsPanel";
import { useLayoutZoom } from "@/hooks/useLayoutZoom";
import { formatPHDateTime, formatRelativeTime } from "@/lib/timeFormat";
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
import { BADGE_BASE, BADGE_PALETTES } from "@/lib/badgeStyles";
import { getClientSession } from "@/lib/clientAuth";
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
import StudentComplianceTab from "@/components/student/StudentComplianceTab";
import StudentOverviewTab from "@/components/student/StudentOverviewTab";
import StudentFeedbackModal from "@/components/student/StudentFeedbackModal";
import StudentSidebarFeedbackCard from "@/components/student/StudentSidebarFeedbackCard";
import NarrativeText from "@/components/shared/NarrativeText";
import { Skeleton } from "@/components/ui/skeleton";
import DashboardSearch from "@/components/shared/DashboardSearch";
import {
  FilterPopover,
  SortPopover,
  GroupPopover,
  ActiveFilterChips as TableActiveFilterChips,
} from "@/components/systemadmin/OfficeTableControls";
import { DateRangeFilterButton } from "@/components/shared/DateRangePickerModal";
import { formatDateIso, parseDateLocal } from "@/lib/dateRangeUtils";
import { format } from "date-fns";
import MultiCriteriaFilter from "@/components/shared/MultiCriteriaFilter";
import ActiveFilterChips from "@/components/shared/ActiveFilterChips";
import { ContentSwap } from "@/components/ui/motion";
import FileAttachmentDropzone, { AttachedFileCard } from "@/components/shared/FileAttachmentDropzone";
import DataViewToolbar from "@/components/shared/DataViewToolbar";
import { useTablePreferences } from "@/components/shared/TablePreferences";
import { getListDensityClasses } from "@/lib/tablePresentation";
import { BookOpen01Icon as EmptyBookOpen01Icon, ClipboardIcon as EmptyClipboardIcon, File02Icon as EmptyFile02Icon, InboxIcon as EmptyInboxIcon, Search01Icon as EmptySearch01Icon, AddCircleIcon, Alert01Icon, ArrowDown01Icon, ArrowUpRight01Icon, Attachment01Icon, BookBookmark01Icon, Building01Icon, Calendar01Icon, CalendarCheckIn01Icon, Cancel01Icon, CovidInfoIcon, Download01Icon, Loading01Icon, Shield01Icon, StarIcon, Tick01Icon, Time01Icon, ViewIcon, Search01Icon, ClipboardIcon, File02Icon, BookOpen01Icon } from "hugeicons-react";
import { getRequestAffiliation, hasLinkedStudentRecord, STUDENT_AFFILIATIONS } from "@/lib/studentAffiliation";
import AppIcon from "@/components/ui/app-icon";
const RATING_LABELS = {
  1: "Poor",
  2: "Fair",
  3: "Satisfactory",
  4: "Very Good",
  5: "Excellent",
};

const STUDENT_VIEWS = ["overview", "odrs", "osas", "compliance", "activity", "settings"];

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

function StatusBadge({ status }) {
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
    <span className={cn(BADGE_BASE, palette)}>
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
          <AppIcon className={cn("text-gray-400 dark:text-zinc-500 text-sm shrink-0", icon)} />
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

function StudentDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [me, setMe] = useState(null);
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
  const [data, setData] = useState({ requests: [], documents: [], proposals: [] });
  const [docTypes, setDocTypes] = useState([]);
  const [courses, setCourses] = useState([]);
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
  const [proposalForm, setProposalForm] = useState({ title: "", eventDate: "", file: null });
  const [eventDatePickerOpen, setEventDatePickerOpen] = useState(false);
  const [revisionTargetProposal, setRevisionTargetProposal] = useState(null);
  const [myOrganizations, setMyOrganizations] = useState([]);
  const [selectedOsasOrgId, setSelectedOsasOrgId] = useState("");
  const [selectedView, setView] = useState(() => normalizeStudentTab(searchParams?.get("view")) || "overview");
  const canViewStudentRecords = hasLinkedStudentRecord(me);
  const isParentAccount = me?.client_type === "Parent";
  const view = ["compliance", "osas"].includes(selectedView) && !canViewStudentRecords ? "overview" : selectedView;
  const [complianceData, setComplianceData] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [requestSubmitting, setRequestSubmitting] = useState(false);
  const [paymentUploadRequestId, setPaymentUploadRequestId] = useState(null);
  const [proposalSubmitting, setProposalSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const attachmentInputRef = useRef(null);

  // Request history list state
  const [requestSearch, setRequestSearch] = useState("");
  const [requestFilters, setRequestFilters] = useState({
    status: [],
    doc_type: [],
  });
  const [requestFilterRules, setRequestFilterRules] = useState([]);
  const [requestGroupBy, setRequestGroupBy] = useState("none");
  const { density } = useTablePreferences();
  const requestListDensity = getListDensityClasses(density);
  const [collapsedRequestGroups, setCollapsedRequestGroups] = useState({});
  const toggleRequestGroup = (key) => {
    setCollapsedRequestGroups((previous) => ({ ...previous, [key]: !previous[key] }));
  };
  const [requestStartDate, setRequestStartDate] = useState("");
  const [requestEndDate, setRequestEndDate] = useState("");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState("DESC");
  const [currentPage, setCurrentPage] = useUrlPage({ enabled: view === "odrs" });
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedRequestForDetail, setSelectedRequestForDetail] = useState(null);
  const [selectedProposalForDetail, setSelectedProposalForDetail] = useState(null);
  const [selectedPostEventReportForDetail, setSelectedPostEventReportForDetail] = useState(null);
  const [selectedCblVersionForDetail, setSelectedCblVersionForDetail] = useState(null);

  // Proposals Table & Filter state
  const [proposalFilterRules, setProposalFilterRules] = useState([]);
  const [proposalSortBy, setProposalSortBy] = useState("created_at");
  const [proposalSortOrder, setProposalSortOrder] = useState("DESC");
  const [proposalGroupBy, setProposalGroupBy] = useState("none");
  const [proposalStartDate, setProposalStartDate] = useState("");
  const [proposalEndDate, setProposalEndDate] = useState("");

  // Post-Event Reports Table & Filter state
  const [postEventSearch, setPostEventSearch] = useState("");
  const [postEventFilterRules, setPostEventFilterRules] = useState([]);
  const [postEventSortBy, setPostEventSortBy] = useState("created_at");
  const [postEventSortOrder, setPostEventSortOrder] = useState("DESC");
  const [postEventGroupBy, setPostEventGroupBy] = useState("none");
  const [postEventStartDate, setPostEventStartDate] = useState("");
  const [postEventEndDate, setPostEventEndDate] = useState("");

  // CBL Versions Table & Filter state
  const [cblSearch, setCblSearch] = useState("");
  const [cblFilterRules, setCblFilterRules] = useState([]);
  const [cblSortBy, setCblSortBy] = useState("created_at");
  const [cblSortOrder, setCblSortOrder] = useState("DESC");
  const [cblGroupBy, setCblGroupBy] = useState("none");
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

  // OSAS Multi-Stream Governance States
  const [osasSubView, setOsasSubView] = useState("proposals"); // "proposals" | "post_event"
  const [postEventReports, setPostEventReports] = useState([]);
  const [pendingPostEvents, setPendingPostEvents] = useState([]);
  const [postEventForm, setPostEventForm] = useState({
    eventProposalId: "",
    actualAttendance: "",
    totalExpenses: "",
    narrativeFile: null,
    liquidationFile: null,
  });
  const [postEventSubmitting, setPostEventSubmitting] = useState(false);

  // Constitution & By-Laws (CBL) Governance States
  const [cblVersions, setCblVersions] = useState([]);
  const [cblOrgData, setCblOrgData] = useState(null);
  const [cblLoading, setCblLoading] = useState(false);
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
    setCblLoading(true);
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
  }, [me]);

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
    requestSearch !== "" ||
    (requestFilters.status?.length > 0) ||
    (requestFilters.doc_type?.length > 0) ||
    requestFilterRules.length > 0 ||
    Boolean(requestStartDate) ||
    Boolean(requestEndDate);

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
        String(item.id).toLowerCase().includes(q) ||
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

      if (requestStartDate) {
        const s = new Date(requestStartDate).getTime();
        const rowDate = item.created_at ? new Date(item.created_at).getTime() : NaN;
        if (!isNaN(s) && !isNaN(rowDate) && rowDate < s) return false;
      }
      if (requestEndDate) {
        const e = new Date(requestEndDate);
        e.setHours(23, 59, 59, 999);
        const rowDate = item.created_at ? new Date(item.created_at).getTime() : NaN;
        if (!isNaN(rowDate) && rowDate > e.getTime()) return false;
      }

      return true;
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
  }, [requestFilterRules, requestFilterFields, requestStartDate, requestEndDate]);

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

      if (proposalStartDate) {
        const s = new Date(proposalStartDate).getTime();
        const rowDate = item.created_at ? new Date(item.created_at).getTime() : NaN;
        if (!isNaN(s) && !isNaN(rowDate) && rowDate < s) return false;
      }
      if (proposalEndDate) {
        const e = new Date(proposalEndDate);
        e.setHours(23, 59, 59, 999);
        const rowDate = item.created_at ? new Date(item.created_at).getTime() : NaN;
        if (!isNaN(rowDate) && rowDate > e.getTime()) return false;
      }

      return true;
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
  }, [proposalFilterRules, proposalFilterFields, proposalStartDate, proposalEndDate]);

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

      if (postEventStartDate) {
        const s = new Date(postEventStartDate).getTime();
        const rowDate = item.created_at ? new Date(item.created_at).getTime() : NaN;
        if (!isNaN(s) && !isNaN(rowDate) && rowDate < s) return false;
      }
      if (postEventEndDate) {
        const e = new Date(postEventEndDate);
        e.setHours(23, 59, 59, 999);
        const rowDate = item.created_at ? new Date(item.created_at).getTime() : NaN;
        if (!isNaN(rowDate) && rowDate > e.getTime()) return false;
      }

      return true;
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
  }, [postEventFilterRules, postEventFilterFields, postEventStartDate, postEventEndDate]);

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

      if (cblStartDate) {
        const s = new Date(cblStartDate).getTime();
        const rowDate = item.created_at ? new Date(item.created_at).getTime() : NaN;
        if (!isNaN(s) && !isNaN(rowDate) && rowDate < s) return false;
      }
      if (cblEndDate) {
        const e = new Date(cblEndDate);
        e.setHours(23, 59, 59, 999);
        const rowDate = item.created_at ? new Date(item.created_at).getTime() : NaN;
        if (!isNaN(rowDate) && rowDate > e.getTime()) return false;
      }

      return true;
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
  }, [cblFilterRules, cblFilterFields, cblStartDate, cblEndDate]);

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

  const paginatedRequests = useMemo(() => {
    const start = (displayPage - 1) * itemsPerPage;
    return sortedRequests.slice(start, start + itemsPerPage);
  }, [sortedRequests, displayPage, itemsPerPage]);

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
      const isErr = Boolean(maybeDescOrError || maybeIsError);
      const fn = isErr ? toast.error : toast.success;
      return fn(msgOrTitle.title || "", {
        description: msgOrTitle.description,
        action: msgOrTitle.action,
        ...options,
      });
    }

    const title = String(msgOrTitle || "");
    const isError = Boolean(maybeIsError);
    const description = typeof maybeDescOrError === "string" ? maybeDescOrError : "";

    if (isError) {
      const normalized = formatErrorMessage(description || title, { title, description });
      return toast.error(normalized.title, {
        description: normalized.description,
        action: normalized.action || options?.action,
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
    const normalized = normalizeStudentTab(nextView) || "overview";
    const target = ["compliance", "osas"].includes(normalized) && !canViewStudentRecords ? "overview" : normalized;
    setView(target);
    const params = new URLSearchParams();
    params.set("view", target);
    router.push(`${window.location.pathname}?${params.toString()}`, { scroll: false });
  }, [router, canViewStudentRecords]);

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
    const timer = setTimeout(() => setView(target), 0);
    return () => clearTimeout(timer);
  }, [searchParams, router, authUser?.preferences?.default_home_view]);

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
      const linkedStudent = hasLinkedStudentRecord(session.data);
      setRequestForm((prev) => ({
        ...prev,
        clientType: session.data.client_type || "Student",
        studentNo: prev.studentNo || (session.data.client_type === "Parent" ? "" : session.data.student_no) || "",
      }));
      const [requestRes, proposalRes, typesRes, coursesRes, orgsRes, postEventRes, complianceRes] = await Promise.all([
        fetch("/api/student/document-requests", { cache: "no-store" }),
        linkedStudent ? fetch("/api/student/event-proposals", { cache: "no-store" }) : null,
        fetch("/api/doc-types?scope=requestable", { cache: "no-store" }),
        fetch("/api/courses", { cache: "no-store" }),
        linkedStudent ? fetch("/api/student/organizations", { cache: "no-store" }) : null,
        linkedStudent ? fetch("/api/student/post-event-reports", { cache: "no-store" }).catch(() => ({ ok: false, json: async () => ({}) })) : null,
        linkedStudent ? fetch("/api/student/compliance", { cache: "no-store" }).catch(() => ({ ok: false, json: async () => ({}) })) : null,
      ]);
      const parseJsonSafe = async (res) => {
        if (!res) return {};
        try {
          return await res.json();
        } catch {
          return { ok: false, error: res.statusText ? `Server returned ${res.status} (${res.statusText})` : `Server error (${res.status})` };
        }
      };

      const [requestJson, proposalJson, typesJson, coursesJson, orgsJson, postEventJson, complianceJson] = await Promise.all([
        parseJsonSafe(requestRes),
        parseJsonSafe(proposalRes),
        parseJsonSafe(typesRes),
        parseJsonSafe(coursesRes),
        parseJsonSafe(orgsRes),
        postEventRes?.ok ? parseJsonSafe(postEventRes) : {},
        complianceRes?.ok ? parseJsonSafe(complianceRes) : {},
      ]);
      if (!requestRes.ok || !requestJson?.ok || (linkedStudent && (!proposalRes?.ok || !proposalJson?.ok))) {
        throw new Error(requestJson?.error || proposalJson?.error || "Unable to load student records.");
      }
      setComplianceData(complianceJson?.ok ? complianceJson.data : null);
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
      setPostEventReports(postEventJson?.data?.reports || []);
      setPendingPostEvents(postEventJson?.data?.pendingEvents || []);
      setData({ requests: requestJson?.data?.requests || [], documents: requestJson?.data?.documents || [], proposals: proposalJson?.data || [] });
    } finally {
      setHasLoaded(true);
      setLoading(false);
    }
  }, [router]);

  const handlePaymentProofUpload = useCallback(async (requestId, file) => {
    if (file.size > 10 * 1024 * 1024) {
      showToast(
        "File Limit Exceeded",
        "Payment proof exceeds the 10 MB limit. Please compress the file or upload a JPEG or PNG receipt.",
        true
      );
      return;
    }
    setPaymentUploadRequestId(requestId);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch(`/api/document-requests/${requestId}/attachments`, { method: "POST", body: formData });
      const json = await response.json().catch(() => null);
      if (!response.ok || !json?.ok) throw new Error(json?.error || "Unable to upload payment proof.");
      showToast("Payment Proof Uploaded", "Your official receipt has been attached and submitted for Registrar verification.");
      await load();
    } catch (error) {
      showToast(
        formatErrorMessage(error, {
          title: "Receipt Upload Failed",
          description: "Could not upload your payment receipt. Please verify your connection and try again.",
        }),
        true
      );
    } finally {
      setPaymentUploadRequestId(null);
    }
  }, [load, showToast]);

  useEffect(() => {
    const timer = setTimeout(() => {
      load().catch((error) => {
        showToast(
          formatErrorMessage(error, {
            title: "Unable to Load Records",
            description: "Could not retrieve your document requests. Please check your network connection and refresh.",
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
    event.preventDefault(); setRequestSubmitting(true);
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
        showToast("Client Type Required", "Please select whether you are requesting as a Student, Alumni, or Parent/Guardian.", true);
        return;
      }
      if (clientType === "Parent") {
        if (!studentNo) {
          showToast("Student Number Required", "Please enter the student number of your child or ward.", true);
          return;
        }
        if (!requesterName) {
          showToast("Requester Name Required", "Please enter your full legal name as the requesting parent or legal guardian.", true);
          return;
        }
        if (!requesterRelationship) {
          showToast("Relationship Required", "Please select your relationship to the student.", true);
          return;
        }
        const hasSpa = attachments.some(
          (a) => a.file && a.attachmentType === "spa"
        );
        const hasValidId = attachments.some(
          (a) => a.file && a.attachmentType === "valid_id"
        );
        if (!hasSpa || !hasValidId) {
          showToast("Authorization Documents Required", "Attach a signed authorization letter or SPA and a valid government ID. Select the matching category for each file.", true);
          return;
        }
      }
      if (clientType === "Alumni" && !studentNo && !courseCode) {
        showToast("Academic Program Required", "Please select your degree program or course to assist records retrieval.", true);
        return;
      }
      if (clientType === "Student" && !studentNo) {
        showToast("Student Number Required", "Enter your student number so the Registrar can locate your record.", true);
        return;
      }
      if (!docType) {
        showToast("Document Type Required", "Please select the specific document type you are requesting.", true);
        return;
      }
      if (!notes || notes.trim().length < 5) {
        showToast("Purpose Description Required", "Please provide a detailed purpose or intended use of the requested document (at least 5 characters).", true);
        return;
      }
      if (requesterContact) {
        const phoneCheck = PhoneSchema.safeParse(requesterContact);
        if (!phoneCheck.success) {
          showToast("Invalid Contact Number", "Please enter a valid Philippine mobile number (e.g. 09171234567 or +639171234567).", true);
          return;
        }
      }
      if (studentNo) {
        const snCheck = StudentNoSchema.safeParse(studentNo);
        if (!snCheck.success) {
          showToast("Invalid Student Number", "Please provide a valid Student Number (e.g. 2024-00123-SJ-0).", true);
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
          formatErrorMessage(json || json?.error || "Unable to submit request.", {
            title: "Request Submission Failed",
            description: "The Registrar portal was unable to save your request. Please check your entries and try again.",
          }),
          true
        );
        return;
      }
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
      showToast("Document Request Submitted", "Your request has been forwarded to the Registrar for evaluation.");
      await load();
      if (json.data) {
        setFeedbackRequest(json.data);
        setFeedbackInitialRating(0);
        setFeedbackModalOpen(true);
      }
    } catch (error) {
      showToast(
        formatErrorMessage(error, {
          title: "Request Submission Failed",
          description: "Could not submit your document request. Please check your network connection and retry.",
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
    if (!proposalForm.eventDate) {
      showToast("Event Date Required", "Select the event date before submitting.", true);
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
          formatErrorMessage(json || json?.error || "Unable to submit proposal.", {
            title: "Proposal Submission Failed",
            description: "OSAS could not accept the event proposal. Please check requirements and retry.",
          }),
          true
        );
        return;
      }
      setProposalForm({ title: "", eventDate: "", file: null });
      if (revisionTargetProposal) {
        setRevisionTargetProposal(null);
        setIsFormOpen(false);
        showToast("Revised Proposal Submitted", "Your updated proposal has been routed to OSAS under the same record.");
      } else {
        showToast("Event Proposal Submitted", "Your proposal has been routed to OSAS for evaluation.");
      }
      await load();
    } catch (error) {
      showToast(
        formatErrorMessage(error, {
          title: "Proposal Submission Failed",
          description: "Could not submit event proposal. Please check your network connection and retry.",
        }),
        true
      );
    } finally { setProposalSubmitting(false); }
  }

  function startProposalRevision(proposal) {
    const organizationId = String(proposal?.organization_id || "");
    const authorizedOrganization = myOrganizations.find((org) => String(org.organization_id) === organizationId);
    if (!authorizedOrganization) {
      showToast("Organization Authorization Required", "Contact OSAS to confirm that you can submit for this organization.", true);
      return;
    }
    handleOsasOrganizationChange(organizationId);
    setProposalForm({
      title: proposal.title || "",
      eventDate: proposal.event_date ? String(proposal.event_date).slice(0, 10) : "",
      file: null,
    });
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
      setProposalForm({ title: "", eventDate: "", file: null });
    }
  }

  async function submitPostEventReport(event) {
    event.preventDefault();
    setPostEventSubmitting(true);
    try {
      const selectedOrg = selectedOsasOrganization;
      if (!selectedOrg) {
        throw new Error("Select an authorized organization before submitting a post-event report.");
      }
      if (!postEventForm.eventProposalId) {
        throw new Error("Please select an approved event proposal.");
      }
      if (!postEventForm.narrativeFile) {
        throw new Error("Please upload the Post-Event Narrative Report PDF.");
      }
      const maxPostEventPdfBytes = 25 * 1024 * 1024;
      if (!postEventForm.narrativeFile.size || postEventForm.narrativeFile.size > maxPostEventPdfBytes) {
        throw new Error("Narrative report PDF exceeds the 25 MB limit. Please compress the file.");
      }
      if (postEventForm.liquidationFile && (!postEventForm.liquidationFile.size || postEventForm.liquidationFile.size > maxPostEventPdfBytes)) {
        throw new Error("Liquidation report PDF exceeds the 25 MB limit. Please compress the file.");
      }
      const form = new FormData();
      form.set("eventProposalId", postEventForm.eventProposalId);
      form.set("organizationId", selectedOrg.organization_id);
      form.set("actualAttendance", postEventForm.actualAttendance || "0");
      form.set("totalExpenses", postEventForm.totalExpenses || "0.00");
      form.set("narrativeFile", postEventForm.narrativeFile);
      if (postEventForm.liquidationFile) {
        form.set("liquidationFile", postEventForm.liquidationFile);
      }

      const res = await fetch("/api/student/post-event-reports", { method: "POST", body: form });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        showToast(
          formatErrorMessage(json || json?.error || "Unable to submit post-event report.", {
            title: "Report Submission Failed",
            description: "OSAS was unable to save the report. Please check the uploaded files and try again.",
          }),
          true
        );
        return;
      }
      setPostEventForm({
        eventProposalId: "",
        actualAttendance: "",
        totalExpenses: "",
        narrativeFile: null,
        liquidationFile: null,
      });
      showToast("Post-Event Report Submitted", "Your Post-Event Narrative and Liquidation report has been received by OSAS.");
      await load();
    } catch (error) {
      showToast(
        formatErrorMessage(error, {
          title: "Report Submission Failed",
          description: "Could not upload post-event report. Please check file sizes and connection.",
        }),
        true
      );
    } finally {
      setPostEventSubmitting(false);
    }
  }

  const loadCblData = useCallback(async (orgId) => {
    if (!orgId) return;
    setCblLoading(true);
    try {
      const res = await fetch(`/api/student/organizations/${orgId}/bylaws`, { cache: "no-store" });
      const json = await res.json();
      if (res.ok && json.ok) {
        setCblOrgData(json.data?.organization || null);
        setCblVersions(Array.isArray(json.data?.versions) ? json.data.versions : []);
      }
    } catch (err) {
      console.error("Failed to load CBL versions:", err);
    } finally {
      setCblLoading(false);
    }
  }, []);

  useEffect(() => {
    if (osasSubView === "cbl" && selectedOsasOrgId) {
      const timer = setTimeout(() => loadCblData(selectedOsasOrgId), 0);
      return () => clearTimeout(timer);
    }
  }, [osasSubView, selectedOsasOrgId, loadCblData]);

  async function submitCbl(event) {
    event.preventDefault();
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
          formatErrorMessage(json || json?.error || "Unable to submit Constitution & By-Laws.", {
            title: "By-Laws Submission Failed",
            description: "OSAS could not record the new Constitution & By-Laws version. Please try again.",
          }),
          true
        );
        return;
      }
      setCblForm({
        versionTag: "",
        amendmentSummary: "",
        file: null,
      });
      setIsFormOpen(false);
      showToast("By-Laws Submitted", "Your Constitution & By-Laws document has been submitted to OSAS for review.");
      await loadCblData(selectedOrg.organization_id);
    } catch (error) {
      showToast(
        formatErrorMessage(error, {
          title: "By-Laws Submission Failed",
          description: "Could not submit Constitution & By-Laws document. Please verify your file and connection.",
        }),
        true
      );
    } finally {
      setCblSubmitting(false);
    }
  }

  if (!me || (loading && !hasLoaded)) {
    const requestedView = normalizeStudentTab(searchParams?.get("view"));
    return <StudentDashboardSkeleton view={me ? view : requestedView} />;
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
    { type: "header", label: "Academic Records" },
    {
      key: "odrs",
      label: "Document Requests",
      iconClass: " FileUploadIcon",
      badge: readyRequestsCount > 0 ? readyRequestsCount : undefined,
    },
    ...(canViewStudentRecords ? [{
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
    }] : []),
  ];

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    window.location.href = "/login";
  }

  return (
    <TooltipProvider delayDuration={200}>
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
          <main className="relative w-full min-w-0 min-h-0 flex-1 overflow-y-auto bg-slate-50/50 dark:bg-zinc-950/50 flex flex-col">
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
              ) : view === "compliance" ? (
                <StudentComplianceTab authUser={me} onLogout={handleLogout} />
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
                          <span>Document Requests</span>
                          <span className="text-[11px] font-normal tracking-normal text-gray-500 dark:text-zinc-400 tabular-nums">
                            {filteredRequests.length} {filteredRequests.length === 1 ? "record" : "records"}
                            {me?.student_no ? ` · ${me.student_no}` : ""}
                          </span>
                        </div>
                      }
                      description="Request official academic records and track Registrar processing updates."
                      showBorder={false}
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
                            title="Refresh Records"
                          />
                          
                          {!isFormOpen && (
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => setIsFormOpen(true)}
                              className="h-9 shrink-0 px-4 text-xs font-semibold rounded-xl cursor-pointer"
                              title="Open Request Form"
                            >
                              {isParentAccount ? "Request on Behalf of a Student" : "Open Request Form"}
                            </Button>
                          )}
                        </div>
                      }
                    />

                    {/* 2. Inline Non-Modal Request Form Section */}
                    {isFormOpen && (
                      <div className="border-t border-border dark:border-border bg-gray-50/40 dark:bg-zinc-900/20 animate-in fade-in slide-in-from-top-2 duration-fast">
                        {/* Dismissable duplicate ticket reminder alert attached to the line */}
                        {!isDuplicateAlertDismissed && (
                          <div className="flex items-center justify-between gap-3 border-b border-amber-200/90 bg-amber-50/90 dark:border-amber-900/40 dark:bg-amber-950/25 px-5 sm:px-6 py-2.5 text-xs text-amber-900 dark:text-amber-200 animate-in fade-in transition-all">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <CovidInfoIcon size="1em" className="text-[16px] shrink-0 text-amber-600 dark:text-amber-400" />
                              <span className="font-medium text-[11.5px] sm:text-xs leading-normal">
                                Please avoid creating duplicate tickets for the same concern to help us process your request promptly.
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={handleDismissDuplicateAlert}
                              className="shrink-0 p-1 rounded-lg text-amber-700 hover:text-amber-950 hover:bg-amber-100/80 dark:text-amber-400 dark:hover:text-amber-100 dark:hover:bg-amber-900/50 transition-colors cursor-pointer"
                              aria-label="Dismiss notice"
                              title="Dismiss notice"
                            >
                              <Cancel01Icon size="1em" className="text-sm" />
                            </button>
                          </div>
                        )}

                        <div className="p-5 sm:p-6">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border dark:border-border">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-pup-maroon dark:bg-red-950/40 dark:text-red-400">
                                <AddCircleIcon size="1em" className="text-xl" />
                              </div>
                              <div>
                                <h2 className="text-[15px] font-semibold text-gray-900 dark:text-zinc-50">{requestForm.clientType === "Parent" ? "Request on Behalf of a Student" : "New Document Request"}</h2>
                                <p className="text-xs text-gray-500 dark:text-zinc-400">Request an academic document from the Registrar.</p>
                              </div>
                            </div>
                          </div>

                        <form onSubmit={createRequest} className="flex flex-col gap-4 mt-4">
                          {/* Parent / Legal Guardian Compliance Notice */}
                          {requestForm.clientType === "Parent" && (
                            <div className="rounded-xl border border-amber-200/90 bg-amber-50/70 p-3.5 dark:border-amber-900/40 dark:bg-amber-950/20 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
                              <Shield01Icon size="1em" className="text-base text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                              <div className="space-y-1 text-[11px] leading-relaxed">
                                <span className="font-semibold block text-amber-950 dark:text-amber-100">
                                  What you need for this request
                                </span>
                                <ul className="list-disc space-y-1 pl-4">
                                  <li>The student’s student number</li>
                                  <li>A signed authorization letter or Special Power of Attorney (SPA)</li>
                                  <li>A copy of a valid government ID</li>
                                </ul>
                                <p>The Registrar reviews your authorization with the request.</p>
                              </div>
                            </div>
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
                                  {requestForm.clientType === "Parent" ? "Student’s Student Number" : "Student Number"} {requestForm.clientType === "Alumni" ? <span className="text-gray-400 dark:text-zinc-500 font-normal">(optional)</span> : ""}
                                </label>
                              </div>
                              <Input
                                id="student-id-input"
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
                                  Academic Program
                                </label>
                                <Select
                                  id="student-course-select"
                                  value={requestForm.courseCode || ""}
                                  onChange={(e) => setRequestForm({ ...requestForm, courseCode: e.target.value })}
                                  className="h-10 w-full rounded-xl text-xs font-normal border border-border dark:border-border bg-white dark:bg-zinc-800 shadow-none text-gray-800 dark:text-zinc-100 focus-visible:outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus-visible:border-red-500/80 dark:focus-visible:ring-red-500/80"
                                >
                                  <option value="">Select degree program...</option>
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
                                Document Type
                              </label>
                              <Select
                                id="student-document-type"
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
                                <p className="mt-1 text-xs text-amber-600">No active requestable Registrar document types are available.</p>
                              ) : (
                                <p className="mt-1.5 text-[11px] text-gray-500 dark:text-zinc-400">
                                  Only university-issued credentials and certifications may be requested here.
                                  {canViewStudentRecords && requestForm.clientType === "Student" && " For enrollment records, open Document Checklist."}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Parent / Legal Guardian Specific Identity Fields */}
                          {requestForm.clientType === "Parent" && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
                              <div className="min-w-0">
                                <label htmlFor="parent-name-input" className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-zinc-200">
                                  Parent / Guardian Full Name
                                </label>
                                <Input
                                  id="parent-name-input"
                                  type="text"
                                  placeholder="e.g. Maria Santos Dela Cruz"
                                  value={requestForm.requesterName || ""}
                                  onChange={(e) => setRequestForm({ ...requestForm, requesterName: e.target.value })}
                                  required
                                  className="h-10 w-full rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 px-3 text-xs text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 shadow-none outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus-visible:border-red-500/80 dark:focus-visible:ring-red-500/80"
                                />
                              </div>

                              <div className="min-w-0">
                                <label htmlFor="parent-relationship-select" className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-zinc-200">
                                  Relationship to Student
                                </label>
                                <Select
                                  id="parent-relationship-select"
                                  value={requestForm.requesterRelationship}
                                  onChange={(e) => setRequestForm({ ...requestForm, requesterRelationship: e.target.value })}
                                  className="h-10 w-full rounded-xl text-xs font-normal border border-border dark:border-border bg-white dark:bg-zinc-800 shadow-none text-gray-800 dark:text-zinc-100 focus-visible:outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus-visible:border-red-500/80 dark:focus-visible:ring-red-500/80"
                                >
                                  <option value="" disabled>Select a relationship</option>
                                  <option value="Mother">Mother</option>
                                  <option value="Father">Father</option>
                                  <option value="Legal Guardian">Legal Guardian</option>
                                  <option value="Authorized Representative">Authorized Representative</option>
                                </Select>
                              </div>

                              <div className="min-w-0">
                                <label htmlFor="parent-contact-input" className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-zinc-200">
                                  Contact / Mobile Number <span className="text-gray-400 dark:text-zinc-500 font-normal">(optional)</span>
                                </label>
                                <Input
                                  id="parent-contact-input"
                                  type="text"
                                  placeholder="e.g. 0917-123-4567"
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
                              Description / Purpose
                            </label>
                            <Textarea
                              id="student-request-description"
                              required
                              rows={2}
                              className="min-h-[72px] resize-none"
                              placeholder="Provide the purpose of your request (e.g. employment verification, board exam, transfer credentials, etc.)"
                              value={requestForm.notes}
                              minLength={5}
                              maxLength={1000}
                              onChange={(e) => setRequestForm({ ...requestForm, notes: e.target.value })}
                            />
                          </div>

                          {/* Supporting Documents & Attachments Dropzone */}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <label className="text-xs font-semibold text-gray-700 dark:text-zinc-200 flex items-center gap-1.5">
                                <span>Supporting Documents & Attachments</span>
                                {requestForm.clientType === "Parent" ? (
                                  <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400">(SPA & Valid ID required)</span>
                                ) : (
                                  <span className="text-xs text-gray-400 dark:text-zinc-500 font-normal">(optional)</span>
                                )}
                              </label>
                              <span className="text-[11px] font-semibold text-pup-maroon dark:text-red-400">
                                {requestForm.attachments.length}/5 files
                              </span>
                            </div>

                            <FileAttachmentDropzone
                              animateCards={false}
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
                          </div>

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
                                onClick={() => setIsFormOpen(false)}
                                className="w-full sm:w-auto h-9 px-4 text-xs font-semibold rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"
                              >
                                Hide
                              </Button>
                              <Button
                                type="submit"
                                size="sm"
                                disabled={requestSubmitting || docTypes.length === 0}
                                title="Submit Request"
                                className="w-full sm:w-auto h-9 px-4 gap-2 flex items-center justify-center cursor-pointer border-0"
                              >
                                {requestSubmitting ? (
                                  <>
                                    <Loading01Icon size="1em"  className="animate-spin text-sm"></Loading01Icon>
                                    Submitting...
                                  </>
                                ) : (
                                  "Submit Request"
                                )}
                              </Button>
                            </div>
                          </div>
                        </form>
                        </div>
                      </div>
                    )}

                    {/* 3. Toolbar & Request History Header */}
                    <DataViewToolbar label="Request history search and controls" className="border-t border-border dark:border-border p-4 sm:px-5 sm:py-3 gap-2 bg-white dark:bg-card flex flex-wrap items-center justify-between select-none">
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
                          placeholder="Search ticket, document, notes..."
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
                    {requestActiveChips.length > 0 && (
                      <TableActiveFilterChips
                        chips={requestActiveChips}
                        onClearAll={() => {
                          setRequestSearch("");
                          setRequestFilterRules([]);
                          setRequestStartDate("");
                          setRequestEndDate("");
                          setCurrentPage(1);
                        }}
                        className="border-t border-border dark:border-border bg-white dark:bg-card px-6 py-2.5"
                      />
                    )}

                    {/* 5. Request History List / Empty State */}
                    {hasLoaded && sortedRequests.length === 0 ? (
                      <div className="rounded-b-2xl flex-1 flex flex-col items-center justify-center min-h-[420px] w-full border-t border-border dark:border-border">
                        <Empty>
                          <EmptyHeader>
                            <EmptyMedia>{hasActiveFilters ? <EmptySearch01Icon size="1em" /> : <EmptyInboxIcon size="1em" />}</EmptyMedia>
                            <EmptyTitle>
                              {hasActiveFilters ? "No Matches Found" : "No Document Requests Yet"}
                            </EmptyTitle>
                            <EmptyDescription>
                              {hasActiveFilters
                                ? "Try adjusting your search query or status filter."
                                : "You haven't submitted any document requests yet. Click the button below to submit your first request."}
                            </EmptyDescription>
                          </EmptyHeader>
                          <EmptyContent>
                            {hasActiveFilters ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setRequestSearch("");
                                  setRequestFilters({ status: [], doc_type: [] });
                                  setCurrentPage(1);
                                }}
                                title="Reset Filters"
                                className="flex h-9 items-center justify-center gap-2 rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 px-4 text-xs font-semibold text-gray-700 dark:text-zinc-200 shadow-xs transition-all hover:bg-gray-50 dark:hover:bg-zinc-700 active:scale-95 cursor-pointer"
                              >
                                Reset Filters
                              </Button>
                            ) : (
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => setIsFormOpen(true)}
                                title="Open Request Form"
                                className="flex h-9 px-4 disabled:opacity-50 cursor-pointer border-0"
                              >
                                Open Request Form
                              </Button>
                            )}
                          </EmptyContent>
                        </Empty>
                      </div>
                    ) : (
                      <div className="w-full flex-1 border-t border-border dark:border-border divide-y divide-border dark:divide-border bg-white dark:bg-card font-jakarta">
                        {loading && !hasLoaded ? (
                          <StudentRequestsTableRowsSkeleton rowCount={Math.min(itemsPerPage || 6, 6)} />
                        ) : groupedPaginatedRequests.map((group) => {
                          const isGrouped = Boolean(group.label && requestGroupBy !== "none");
                          const isCollapsed = Boolean(collapsedRequestGroups[group.key]);

                          return (
                            <section key={group.key || "root"} className="flex flex-col">
                              {isGrouped && (
                                <button
                                  type="button"
                                  onClick={() => toggleRequestGroup(group.key)}
                                  aria-expanded={!isCollapsed}
                                  className="flex w-full items-center justify-between border-b border-border bg-gray-50/80 px-5 py-2.5 text-left transition-colors hover:bg-gray-100/60 dark:border-border dark:bg-zinc-900/60 dark:hover:bg-zinc-800/40"
                                >
                                  <span className="flex min-w-0 items-center gap-2.5">
                                    <ArrowDown01Icon size="1em" className={cn("shrink-0 text-sm text-gray-400 transition-transform dark:text-zinc-500", isCollapsed && "-rotate-90")} />
                                    <span className="truncate text-xs font-semibold text-gray-900 dark:text-zinc-100">{group.label}</span>
                                    <span className={cn(BADGE_BASE, BADGE_PALETTES.slate)}>{group.items.length}</span>
                                  </span>
                                  <span className="text-[11px] font-medium text-gray-400 dark:text-zinc-500">{isCollapsed ? "Expand" : "Collapse"}</span>
                                </button>
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
                                        if (event.key === "Enter" || event.key === " ") {
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
                                        <span className="min-w-[70px] shrink-0 select-none font-sans text-xs font-medium tabular-nums text-gray-500 dark:text-zinc-400">{item.id}</span>
                                        <span className="max-w-[200px] shrink-0 truncate text-xs font-medium text-gray-900 transition-colors group-hover:text-[#800000] dark:text-zinc-100 dark:group-hover:text-red-400 sm:max-w-[320px] sm:text-sm lg:max-w-md">
                                          {item.doc_type || "Document Request"}
                                        </span>
                                        {item.client_type === "Parent" && (
                                          <span className={cn(BADGE_BASE, BADGE_PALETTES.amber)}>Parent/Guardian</span>
                                        )}
                                        {(Number(item.attachment_count) > 0 || (Array.isArray(item.attachments) && item.attachments.length > 0)) && (
                                          <span
                                            className={cn(BADGE_BASE, BADGE_PALETTES.slate, "shrink-0 tabular-nums")}
                                            title={`${item.attachment_count || item.attachments?.length} attachment(s)`}
                                          >
                                            <Attachment01Icon size="1em" className="text-[11px]" />
                                            {item.attachment_count || item.attachments?.length}
                                          </span>
                                        )}
                                        <span className="hidden truncate text-xs font-normal text-gray-400 dark:text-zinc-500 md:inline">
                                          — {item.notes ? <NarrativeText text={item.notes} mode="compact" /> : "Document request"}
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
                                                aria-label={item.feedback ? `Rated ${item.feedback.rating}/5 stars. Click to edit feedback.` : "Rate Service"}
                                                className={cn("table-action-button rounded-lg active:scale-95 cursor-pointer", item.feedback ? "text-amber-500 hover:text-amber-600 dark:text-amber-400" : "text-gray-400 hover:text-amber-500")}
                                              >
                                                <StarIcon size="1em" className="text-[15px]" />
                                              </button>
                                            </TooltipTrigger>
                                            <TooltipContent>{item.feedback ? `Rated ${item.feedback.rating}/5 stars. Click to edit.` : "Rate Service"}</TooltipContent>
                                          </Tooltip>
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <button
                                                type="button"
                                                onClick={() => setSelectedRequestForDetail(item)}
                                                aria-label="View Request Updates Timeline"
                                                className="table-action-button rounded-lg text-gray-500 hover:text-pup-maroon dark:text-zinc-400 dark:hover:text-red-400 active:scale-95 cursor-pointer"
                                              >
                                                <Time01Icon size="1em" className="text-[15px]" />
                                              </button>
                                            </TooltipTrigger>
                                            <TooltipContent>View Timeline</TooltipContent>
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
                        <span>OSAS Submissions</span>
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
                    showBorder={false}
                    className="p-6"
                    titleClassName="text-[18px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50"
                    descriptionClassName="text-[13px] font-normal text-gray-500 dark:text-zinc-400 mt-[4px]"
                    actions={
                      <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto">
                        {myOrganizations.length > 1 ? (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                type="button"
                                aria-label={`Choose organization. Current organization: ${selectedOsasOrganization?.organization_name || "none selected"}.`}
                                disabled={Boolean(revisionTargetProposal)}
                                className="group flex h-10 max-w-72 min-w-0 items-center gap-2 rounded-full border border-black/[0.06] bg-white py-1 pl-1 pr-3 text-left shadow-[0_1px_2px_rgba(0,0,0,0.02)] transition-colors hover:bg-black/[0.03] disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-zinc-900 dark:hover:bg-white/[0.05]"
                              >
                                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-black/[0.04] text-gray-600 dark:bg-white/[0.07] dark:text-zinc-300">
                                  <Building01Icon size={16} />
                                </span>
                                <span className="min-w-0 flex-1 truncate text-xs font-semibold text-gray-800 dark:text-zinc-100">
                                  {selectedOsasOrganization?.organization_name || "Choose organization"}
                                </span>
                                <ArrowDown01Icon size={14} className="shrink-0 text-gray-400 transition-colors group-hover:text-gray-600 dark:text-zinc-500 dark:group-hover:text-zinc-300" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" sideOffset={6} className="w-80">
                              {myOrganizations.map((org) => {
                                const isSelected = String(org.organization_id) === String(selectedOsasOrgId);
                                return (
                                  <DropdownMenuItem
                                    key={org.organization_id}
                                    onClick={() => handleOsasOrganizationChange(String(org.organization_id))}
                                    className="min-h-12 px-2 py-2"
                                  >
                                    <Building01Icon size={16} className="shrink-0 text-gray-500 dark:text-zinc-400" />
                                    <span className="flex min-w-0 flex-1 flex-col">
                                      <span className="truncate">{org.organization_name}{org.acronym ? ` (${org.acronym})` : ""}</span>
                                      <span className="truncate text-[10px] font-normal text-gray-500 dark:text-zinc-400">{org.officer_position}</span>
                                    </span>
                                    {isSelected && <Tick01Icon size={16} className="shrink-0 text-blue-600 dark:text-blue-300" />}
                                  </DropdownMenuItem>
                                );
                              })}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        ) : myOrganizations.length === 1 ? (
                          <div className="flex h-10 max-w-72 min-w-0 items-center gap-2 rounded-full border border-black/[0.06] bg-white py-1 pl-1 pr-3 dark:border-white/10 dark:bg-zinc-900">
                            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-black/[0.04] text-gray-600 dark:bg-white/[0.07] dark:text-zinc-300">
                              <Building01Icon size={16} />
                            </span>
                            <span className="truncate text-xs font-semibold text-gray-800 dark:text-zinc-100">
                              {selectedOsasOrganization?.organization_name || "Organization"}
                            </span>
                          </div>
                        ) : null}
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
                          title="Refresh Records"
                        />
                        
                        {!isFormOpen && (
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => setIsFormOpen(true)}
                            disabled={!selectedOsasOrganization}
                            title={!selectedOsasOrganization ? "Select an organization above to continue" : osasSubView === "proposals" ? "Open Proposal Form" : osasSubView === "post_event" ? "Open Report Form" : "Open CBL Form"}
                            className={cn(
                              "h-9 shrink-0 px-4 text-xs font-semibold rounded-xl cursor-pointer disabled:opacity-50",
                              !selectedOsasOrganization && "opacity-50 cursor-not-allowed"
                            )}
                          >
                              {osasSubView === "proposals" ? "Open Proposal Form" : osasSubView === "post_event" ? "Open Report Form" : "Open CBL Form"}
                          </Button>
                        )}
                      </div>
                    }
                  />

                  {myOrganizations.length === 0 && (
                    <div className="flex items-center justify-between gap-3 border-b border-amber-200/90 bg-amber-50/90 dark:border-amber-900/40 dark:bg-amber-950/25 px-5 sm:px-6 py-2.5 text-xs text-amber-950 dark:text-amber-200 animate-in fade-in transition-all">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <CovidInfoIcon size="1em" className="text-[16px] shrink-0 text-amber-600 dark:text-amber-400" />
                        <span className="font-medium text-[11.5px] sm:text-xs leading-normal">
                          Officer authorization required: Only student officers authorized for a recognized organization may submit proposals, reports, or charter documents. Contact OSAS to authorize your account.
                        </span>
                      </div>
                    </div>
                  )}

                  {/* OSAS Stream Switcher */}
                  <div className="border-b border-border/80 dark:border-white/10 bg-white dark:bg-card px-6 py-2.5 overflow-x-auto scrollbar-none">
                    <SegmentedControl
                      value={osasSubView}
                      onValueChange={setOsasSubView}
                      variant="capsule"
                      className="w-max"
                      items={[
                        {
                          value: "proposals",
                          label: "Event Proposals",
                          icon: <Calendar01Icon size="1em" className="text-sm" />,
                          badge: organizationProposals.length,
                        },
                        {
                          value: "post_event",
                          label: "Post-Event & Liquidation",
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

                  {selectedOsasOrganization && isFormOpen && (
                    <div
                      role="status"
                      className="flex w-full items-start gap-2.5 border-b border-blue-200 bg-blue-50/80 px-5 py-3 text-xs text-blue-900 dark:border-blue-900/50 dark:bg-blue-950/25 dark:text-blue-200 sm:px-6"
                    >
                      <Building01Icon size={16} className="mt-0.5 shrink-0 text-blue-600 dark:text-blue-300" />
                      <p>
                        You’re currently submitting for <span className="font-semibold">{selectedOsasOrganization.organization_name}</span>.
                        <span className="ml-1 text-blue-800/80 dark:text-blue-200/80">
                          New proposals, reports, and charter submissions will be associated with this organization.
                        </span>
                      </p>
                    </div>
                  )}

                  <ContentSwap
                    id={`osas-${osasSubView}`}
                    className="flex flex-[1_0_auto] flex-col w-full"
                  >
                  {/* STREAM 1: EVENT PROPOSALS */}
                  {osasSubView === "proposals" && (
                    <>
                      {/* Inline Proposal Form Section */}
                      {isFormOpen && selectedOsasOrganization && (
                        <div className="border-t border-border dark:border-border p-5 sm:p-6 bg-gray-50/40 dark:bg-zinc-900/20 animate-in fade-in slide-in-from-top-2 duration-fast">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border dark:border-border">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-pup-maroon dark:bg-red-950/40 dark:text-red-400">
                                <AddCircleIcon size="1em" className="text-xl" />
                              </div>
                              <div>
                                <h2 className="text-[15px] font-semibold text-gray-900 dark:text-zinc-50">
                                  {revisionTargetProposal ? "Revise Event Proposal" : "New Event Proposal"}
                                </h2>
                                <p className="text-xs text-gray-500 dark:text-zinc-400">
                                  {revisionTargetProposal
                                    ? `Update the proposal requested by OSAS · Submitting for ${selectedOsasOrganization.organization_name}`
                                    : `Upload a PDF proposal for OSAS review and evaluation · Submitting for ${selectedOsasOrganization.organization_name}`}
                                </p>
                              </div>
                            </div>
                          </div>

                          <form onSubmit={submitProposal} className="flex flex-col gap-4 mt-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="min-w-0">
                                <label htmlFor="osas-event-title" className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-zinc-200">
                                  Event Title
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
                                  Event Date
                                </label>
                                <Popover open={eventDatePickerOpen} onOpenChange={setEventDatePickerOpen}>
                                  <PopoverTrigger asChild>
                                    <Button
                                      id="osas-event-date"
                                      type="button"
                                      variant="outline"
                                      aria-label="Event date"
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
                                      defaultMonth={parseDateLocal(proposalForm.eventDate)}
                                      onSelect={(date) => {
                                        if (!date) return;
                                        setProposalForm((current) => ({ ...current, eventDate: formatDateIso(date) }));
                                        setEventDatePickerOpen(false);
                                      }}
                                    />
                                  </PopoverContent>
                                </Popover>
                              </div>
                            </div>

                            <div>
                              <label className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-zinc-200">
                                Proposal PDF
                              </label>
                              <FileAttachmentDropzone
                                animateCards={false}
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
                                  {revisionTargetProposal ? "Cancel Revision" : "Hide"}
                                </Button>
                                <Button
                                  type="submit"
                                  size="sm"
                                  disabled={proposalSubmitting || (Boolean(revisionTargetProposal) && !proposalForm.file)}
                                  title={revisionTargetProposal ? "Submit Revised Proposal" : "Submit Proposal"}
                                  className="w-full sm:w-auto h-9 px-4 gap-2 flex items-center justify-center cursor-pointer border-0"
                                >
                                  {proposalSubmitting ? (
                                    <>
                                      <Loading01Icon size="1em" className="animate-spin text-sm"></Loading01Icon>
                                      {revisionTargetProposal ? "Submitting Revision..." : "Submitting..."}
                                    </>
                                  ) : (
                                    revisionTargetProposal ? "Submit Revised Proposal" : "Submit Proposal"
                                  )}
                                </Button>
                              </div>
                            </div>
                          </form>
                        </div>
                      )}

                      {/* Proposals History Toolbar */}
                      <DataViewToolbar label="Event proposals search and controls" className="border-t border-border dark:border-border p-4 sm:px-5 sm:py-3 gap-2 bg-white dark:bg-card flex flex-wrap items-center justify-between select-none">
                        {/* Left: DashboardSearch */}
                        <div className="flex min-w-0 items-center gap-2">
                          <DashboardSearch
                            value={proposalSearch}
                            onChange={(val) => setProposalSearch(val)}
                            count={filteredProposals.length}
                            loading={loading}
                            placeholder="Search proposals..."
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
                      {proposalActiveChips.length > 0 && (
                        <TableActiveFilterChips
                          chips={proposalActiveChips}
                          onClearAll={() => {
                            setProposalSearch("");
                            setProposalFilterRules([]);
                            setProposalStartDate("");
                            setProposalEndDate("");
                          }}
                          className="border-t border-border dark:border-border bg-white dark:bg-card px-6 py-2.5"
                        />
                      )}

                      {/* Proposals List */}
                      <div className="border-t border-border dark:border-border flex-1">
                        {loading && !hasLoaded ? (
                          <div className="p-5">
                            <StudentOsasProposalsListSkeleton count={3} />
                          </div>
                        ) : organizationProposals.length === 0 ? (
                          <div className="rounded-b-2xl flex-1 flex flex-col items-center justify-center min-h-[420px] w-full">
                            <Empty>
                              <EmptyHeader>
                                <EmptyMedia><EmptyFile02Icon size="1em" /></EmptyMedia>
                                <EmptyTitle>
                                  {selectedOsasOrganization
                                    ? "No Event Proposals Yet"
                                    : myOrganizations.length === 0
                                    ? "No Authorized Organization"
                                    : "Choose an Organization"}
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
                                    title="Open Proposal Form"
                                    className="flex h-9 px-4 cursor-pointer border-0"
                                  >
                                    Open Proposal Form
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
                                  No Matches Found
                                </EmptyTitle>
                                <EmptyDescription>
                                  Try adjusting your search query or filter criteria.
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
                                  title="Reset Filters"
                                  className="h-9 px-4 text-xs font-semibold rounded-xl"
                                >
                                  Reset Filters
                                </Button>
                              </EmptyContent>
                            </Empty>
                          </div>
                        ) : (
                          <div className="p-5 space-y-4">
                            {groupedProposals.map((group) => (
                              <div key={group.key || "all"} className="space-y-3">
                                {group.label && (
                                  <div className="flex items-center gap-2 px-1 text-xs font-semibold text-gray-700 dark:text-zinc-300">
                                    <span className="font-bold">{group.label}</span>
                                    <span className="text-muted-foreground font-normal">({group.items.length})</span>
                                  </div>
                                )}
                                {group.items.map((item) => {
                                  const latestUpdate = item.updates?.[item.updates.length - 1];
                                  return (
                                  <article
                                    key={item.id}
                                    onClick={() => setSelectedProposalForDetail(item)}
                                    className="group rounded-xl border border-border p-4 dark:border-border hover:bg-gray-50/50 dark:hover:bg-white/2 transition-colors cursor-pointer select-none"
                                  >
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                      <h3 className="text-[14px] font-medium text-[#111111] dark:text-zinc-100 group-hover:text-pup-maroon dark:group-hover:text-red-400 transition-colors">
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
                                      <p className="text-[13px] font-normal text-[#8E8E93] dark:text-zinc-400">
                                        {item.organization_name} · {formatProposalEventDate(item.event_date)}
                                      </p>
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
                                          <div className="line-clamp-2 text-xs leading-relaxed text-gray-600 dark:text-zinc-400">
                                            <NarrativeText text={latestUpdate.message || "Status updated by OSAS"} mode="compact" />
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
                        <div className="flex items-center justify-between gap-3 border-b border-amber-200/90 bg-amber-50/90 dark:border-amber-900/40 dark:bg-amber-950/25 px-5 sm:px-6 py-2.5 text-xs text-amber-900 dark:text-amber-200 animate-in fade-in transition-all">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <Alert01Icon size="1em" className="text-[16px] shrink-0 text-amber-600 dark:text-amber-400" />
                            <span className="font-medium text-[11.5px] sm:text-xs leading-normal">
                              <strong className="font-semibold text-amber-950 dark:text-amber-100">Pending Post-Event Compliance:</strong> You have{" "}
                              <strong>{organizationPendingPostEvents.length}</strong> approved event(s) requiring accomplishment narrative reports and financial liquidation.
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={handleDismissPostEventAlert}
                            className="shrink-0 p-1 rounded-full text-amber-700 hover:text-amber-950 hover:bg-amber-100/80 dark:text-amber-400 dark:hover:text-amber-100 dark:hover:bg-amber-900/50 transition-colors cursor-pointer"
                            aria-label="Dismiss notice"
                            title="Dismiss notice"
                          >
                            <Cancel01Icon size="1em" className="text-sm" />
                          </button>
                        </div>
                      )}

                      {/* Post-Event Submission Form */}
                      {isFormOpen && selectedOsasOrganization && (
                        <div className="border-t border-border dark:border-border p-5 sm:p-6 bg-gray-50/40 dark:bg-zinc-900/20 animate-in fade-in slide-in-from-top-2 duration-fast">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border dark:border-border">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-pup-maroon dark:bg-red-950/40 dark:text-red-400">
                                <ClipboardIcon size="1em" className="text-xl" />
                              </div>
                              <div>
                                <h2 className="text-[15px] font-semibold text-gray-900 dark:text-zinc-50">New Post-Event & Liquidation Report</h2>
                                <p className="text-xs text-gray-500 dark:text-zinc-400">
                                  Submit accomplishment documentation, attendance figures, and liquidation receipts for an approved event · Submitting for {selectedOsasOrganization.organization_name}
                                </p>
                              </div>
                            </div>
                          </div>

                          <form onSubmit={submitPostEventReport} className="flex flex-col gap-4 mt-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              <div className="min-w-0">
                                <label className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-zinc-200">
                                  Approved Event Proposal
                                </label>
                                <Select
                                  value={postEventForm.eventProposalId}
                                  onChange={(e) => {
                                    const pId = e.target.value;
                                    setPostEventForm((prev) => ({ ...prev, eventProposalId: pId }));
                                  }}
                                  className="h-10 w-full rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 text-xs text-gray-900 dark:text-zinc-100 shadow-none"
                                >
                                  <option value="">Select an approved event...</option>
                                  {organizationProposals.filter((p) => p.status === "Approved").map((p) => (
                                    <option key={p.id} value={p.id}>
                                      {p.title} ({formatProposalEventDate(p.event_date)}) : {p.organization_name}
                                    </option>
                                  ))}
                                </Select>
                              </div>

                              <div className="min-w-0">
                                <label className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-zinc-200">
                                  Actual Attendees Count <span className="text-gray-400 dark:text-zinc-500 font-normal">(optional)</span>
                                </label>
                                <Input
                                  type="number"
                                  min="0"
                                  placeholder="e.g. 150"
                                  value={postEventForm.actualAttendance}
                                  onChange={(e) => setPostEventForm({ ...postEventForm, actualAttendance: e.target.value })}
                                  className="h-10 w-full rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 px-3 text-xs text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 shadow-none outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus-visible:border-red-500/80 dark:focus-visible:ring-red-500/80"
                                />
                              </div>

                              <div className="min-w-0">
                                <label className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-zinc-200">
                                  Total Expenses Liquidated (PHP) <span className="text-gray-400 dark:text-zinc-500 font-normal">(optional)</span>
                                </label>
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  placeholder="e.g. 5200.00"
                                  value={postEventForm.totalExpenses}
                                  onChange={(e) => setPostEventForm({ ...postEventForm, totalExpenses: e.target.value })}
                                  className="h-10 w-full rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 px-3 text-xs text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 shadow-none outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus-visible:border-red-500/80 dark:focus-visible:ring-red-500/80"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-zinc-200">
                                  Narrative Accomplishment Report (PDF)
                                </label>
                                <FileAttachmentDropzone
                                  animateCards={false}
                                  value={postEventForm.narrativeFile ? { file: postEventForm.narrativeFile, original_filename: postEventForm.narrativeFile.name, size_bytes: postEventForm.narrativeFile.size } : null}
                                  onChange={(item) => setPostEventForm({ ...postEventForm, narrativeFile: item?.file || null })}
                                  mode="single"
                                  accept="application/pdf"
                                  title="Drop narrative report PDF here, or browse"
                                  subtitle="Official narrative report (PDF up to 25 MB)"
                                  maxSizeBytes={25 * 1024 * 1024}
                                />
                              </div>

                              <div>
                                <label className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-zinc-200">
                                  Financial Liquidation & Receipts (PDF) <span className="text-gray-400 dark:text-zinc-500 font-normal">(optional)</span>
                                </label>
                                <FileAttachmentDropzone
                                  animateCards={false}
                                  value={postEventForm.liquidationFile ? { file: postEventForm.liquidationFile, original_filename: postEventForm.liquidationFile.name, size_bytes: postEventForm.liquidationFile.size } : null}
                                  onChange={(item) => setPostEventForm({ ...postEventForm, liquidationFile: item?.file || null })}
                                  mode="single"
                                  accept="application/pdf"
                                  title="Drop liquidation receipts PDF here, or browse"
                                  subtitle="Optional liquidation statement (PDF up to 25 MB)"
                                  maxSizeBytes={25 * 1024 * 1024}
                                />
                              </div>
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
                                  onClick={() => setIsFormOpen(false)}
                                  className="w-full sm:w-auto h-9 px-4 text-xs font-semibold rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"
                                >
                                  Hide
                                </Button>
                                <Button
                                  type="submit"
                                  size="sm"
                                  disabled={postEventSubmitting}
                                  title="Submit Post-Event Report"
                                  className="w-full sm:w-auto h-9 px-4 gap-2 flex items-center justify-center cursor-pointer border-0"
                                >
                                  {postEventSubmitting ? (
                                    <>
                                      <Loading01Icon size="1em" className="animate-spin text-sm" />
                                      Submitting...
                                    </>
                                  ) : (
                                    "Submit Post-Event Report"
                                  )}
                                </Button>
                              </div>
                            </div>
                          </form>
                        </div>
                      )}

                      {/* Post-Event Reports History Toolbar */}
                      <DataViewToolbar label="Post-event reports search and controls" className="border-t border-border dark:border-border p-4 sm:px-5 sm:py-3 gap-2 bg-white dark:bg-card flex flex-wrap items-center justify-between select-none">
                        <div className="flex min-w-0 items-center gap-2">
                          <DashboardSearch
                            value={postEventSearch}
                            onChange={(val) => setPostEventSearch(val)}
                            count={filteredPostEventReports.length}
                            loading={loading}
                            placeholder="Search reports..."
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

                      {postEventActiveChips.length > 0 && (
                        <TableActiveFilterChips
                          chips={postEventActiveChips}
                          onClearAll={() => {
                            setPostEventSearch("");
                            setPostEventFilterRules([]);
                            setPostEventStartDate("");
                            setPostEventEndDate("");
                          }}
                          className="border-t border-border dark:border-border bg-white dark:bg-card px-6 py-2.5"
                        />
                      )}

                      <div className="border-t border-border dark:border-border flex-1">
                        {loading && !hasLoaded ? (
                          <div className="p-5">
                            <StudentOsasProposalsListSkeleton count={3} />
                          </div>
                        ) : organizationPostEventReports.length === 0 ? (
                          <div className="rounded-b-2xl flex-1 flex flex-col items-center justify-center min-h-[420px] w-full">
                            <Empty>
                              <EmptyHeader>
                                <EmptyMedia><EmptyClipboardIcon size="1em" /></EmptyMedia>
                                <EmptyTitle>
                                  {selectedOsasOrganization
                                    ? "No Post-Event Reports Yet"
                                    : myOrganizations.length === 0
                                    ? "No Authorized Organization"
                                    : "Choose an Organization"}
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
                                    title="Open Report Form"
                                    className="flex h-9 px-4 cursor-pointer border-0"
                                  >
                                    Open Report Form
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
                                  No Matches Found
                                </EmptyTitle>
                                <EmptyDescription>
                                  Try adjusting your search query or filter criteria.
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
                                  title="Reset Filters"
                                  className="h-9 px-4 text-xs font-semibold rounded-xl"
                                >
                                  Reset Filters
                                </Button>
                              </EmptyContent>
                            </Empty>
                          </div>
                        ) : (
                          <div className="p-5 space-y-4">
                            {groupedPostEventReports.map((group) => (
                              <div key={group.key || "all"} className="space-y-3">
                                {group.label && (
                                  <div className="flex items-center gap-2 px-1 text-xs font-semibold text-gray-700 dark:text-zinc-300">
                                    <span className="font-bold">{group.label}</span>
                                    <span className="text-muted-foreground font-normal">({group.items.length})</span>
                                  </div>
                                )}
                                {group.items.map((report) => (
                                  <article
                                    key={report.id}
                                    onClick={() => setSelectedPostEventReportForDetail(report)}
                                    className="group rounded-xl border border-border p-4 dark:border-border hover:bg-gray-50/50 dark:hover:bg-white/2 transition-colors cursor-pointer select-none"
                                  >
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                      <h3 className="text-[14px] font-medium text-[#111111] dark:text-zinc-100 group-hover:text-pup-maroon dark:group-hover:text-red-400 transition-colors">
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
                      {isFormOpen && selectedOsasOrganization && (
                        <div className="border-t border-border dark:border-border p-5 sm:p-6 bg-gray-50/40 dark:bg-zinc-900/20 animate-in fade-in slide-in-from-top-2 duration-fast">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border dark:border-border">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-pup-maroon dark:bg-red-950/40 dark:text-red-400">
                                <BookOpen01Icon size="1em" className="text-xl" />
                              </div>
                              <div>
                                <h2 className="text-[15px] font-semibold text-gray-900 dark:text-zinc-50">New Constitution & By-Laws Submission</h2>
                                <p className="text-xs text-gray-500 dark:text-zinc-400">
                                  Submit a ratified charter, baseline document, or amendment for OSAS review and archival · Submitting for {selectedOsasOrganization.organization_name}
                                </p>
                              </div>
                            </div>
                          </div>

                          <form onSubmit={submitCbl} className="flex flex-col gap-4 mt-4">
                            {/* 1. Version Title / Tag */}
                            <div className="min-w-0">
                              <label className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-zinc-200">
                                Version Title / Tag
                              </label>
                              <Input
                                placeholder="e.g. 2026 Ratified Charter, CBL Amendment 2"
                                value={cblForm.versionTag}
                                onChange={(e) => setCblForm({ ...cblForm, versionTag: e.target.value })}
                                required
                                className="h-10 w-full rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 px-3 text-xs text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 shadow-none outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon"
                              />
                            </div>

                            {/* 2. Summary of Amendments / Notes for OSAS */}
                            <div className="min-w-0">
                              <label htmlFor="cbl-amendment-summary" className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-zinc-200">
                                Summary of Amendments / Notes for OSAS <span className="text-gray-400 dark:text-zinc-500 font-normal">(optional)</span>
                              </label>
                              <Textarea
                                id="cbl-amendment-summary"
                                placeholder="Describe the amendments made, articles updated, or context of this ratification..."
                                value={cblForm.amendmentSummary}
                                onChange={(e) => setCblForm({ ...cblForm, amendmentSummary: e.target.value })}
                                rows={3}
                                className="resize-y"
                              />
                            </div>

                            {/* 3. Official PDF Document Attachment */}
                            <div className="min-w-0">
                              <label className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-zinc-200">
                                Official PDF Document
                              </label>
                              <FileAttachmentDropzone
                                animateCards={false}
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
                                      <span>Submitting...</span>
                                    </>
                                  ) : (
                                    <span>Submit Constitution & By-Laws</span>
                                  )}
                                </Button>
                              </div>
                            </div>
                          </form>
                        </div>
                      )}

                      {/* Current Charter Status and Document */}
                      <div className={cn("border-t border-border dark:border-border p-5 sm:p-6 bg-gray-50/40 dark:bg-zinc-900/30", !selectedOsasOrganization && "hidden")}>
                        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-center lg:gap-8">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-sm font-bold text-gray-900 dark:text-zinc-100">
                                Current Active Charter
                              </h3>
                              {cblLoading ? (
                                <span className={cn(BADGE_BASE, BADGE_PALETTES.gray)}>Checking Status</span>
                              ) : cblOrgData?.hasBylaws ? (
                                <span className={cn(BADGE_BASE, BADGE_PALETTES.emerald)}>
                                  Active & Ratified
                                </span>
                              ) : (
                                <span className={cn(BADGE_BASE, BADGE_PALETTES.amber)}>
                                  Not Yet Archived
                                </span>
                              )}
                            </div>
                            <p className="mt-1 text-xs text-gray-500 dark:text-zinc-400">
                              {cblLoading
                                ? `Checking the charter on file for ${selectedOsasOrganization?.organization_name || "this organization"}.`
                                : cblOrgData?.hasBylaws
                                ? `Official Constitution & By-Laws on file for ${cblOrgData.name}.`
                                : `No ratified Constitution & By-Laws on file for ${cblOrgData?.name || selectedOsasOrganization?.organization_name || "this organization"}.`}
                            </p>
                            {!cblLoading && cblOrgData?.hasBylaws && cblOrgData.updatedAt && (
                              <p className="mt-3 text-[11px] font-medium text-gray-500 dark:text-zinc-400">
                                Last updated <span className="tabular-nums text-gray-700 dark:text-zinc-300">{formatPHDateTime(cblOrgData.updatedAt)}</span>
                              </p>
                            )}
                          </div>

                          {cblLoading ? (
                            <Skeleton className="h-[88px] w-full rounded-xl" />
                          ) : cblOrgData?.hasBylaws && selectedOsasOrgId ? (
                            <div className="flex min-w-0 flex-col gap-4 rounded-xl border border-border/80 bg-white p-4 dark:border-border dark:bg-zinc-900 sm:flex-row sm:items-center sm:justify-between">
                              <div className="flex min-w-0 items-center gap-3">
                                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-red-50 text-pup-maroon dark:bg-red-950/40 dark:text-red-400">
                                  <File02Icon size={18} aria-hidden="true" />
                                </span>
                                <div className="min-w-0">
                                  <p className="text-[11px] font-semibold text-gray-500 dark:text-zinc-400">
                                    Active charter document
                                  </p>
                                  <p
                                    className="mt-0.5 truncate text-xs font-semibold text-gray-900 dark:text-zinc-100"
                                    title={cblOrgData.originalFilename || "Constitution-and-By-Laws.pdf"}
                                  >
                                    {cblOrgData.originalFilename || "Constitution-and-By-Laws.pdf"}
                                  </p>
                                </div>
                              </div>
                              <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleOpenPdfPreview(null, {
                                    url: `/api/student/organizations/${selectedOsasOrgId}/bylaws?file=1`,
                                    title: `${cblOrgData.name}: Constitution & By-Laws`,
                                    subtitle: "Official ratified charter on file with OSAS.",
                                    studentName: me?.name || "Student Officer",
                                    docType: "Constitution & By-Laws",
                                    originalFilename: cblOrgData.originalFilename || "Constitution-and-By-Laws.pdf",
                                  })}
                                  className="h-9 rounded-xl px-4 text-xs font-semibold"
                                >
                                  View Current Charter
                                </Button>
                                <a
                                  href={`/api/student/organizations/${selectedOsasOrgId}/bylaws?file=1`}
                                  download={cblOrgData.originalFilename || "Constitution-and-By-Laws.pdf"}
                                  className="inline-flex h-9 items-center justify-center rounded-xl border border-border bg-white px-4 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-border dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                                >
                                  Download PDF
                                </a>
                              </div>
                            </div>
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
                                  Open CBL Form
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
                            placeholder="Search charters..."
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

                      {cblActiveChips.length > 0 && selectedOsasOrganization && (
                        <TableActiveFilterChips
                          chips={cblActiveChips}
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
                        {cblLoading ? (
                          <div className="p-5">
                            <StudentOsasProposalsListSkeleton count={3} />
                          </div>
                        ) : cblVersions.length === 0 ? (
                          <div className="rounded-b-2xl flex-1 flex flex-col items-center justify-center min-h-[420px] w-full">
                            <Empty>
                              <EmptyHeader>
                                <EmptyMedia><EmptyBookOpen01Icon size="1em" /></EmptyMedia>
                                <EmptyTitle>
                                  No CBL Submissions Yet
                                </EmptyTitle>
                                <EmptyDescription>
                                  Click the button below to submit your organization&apos;s Constitution & By-Laws or proposed amendments.
                                </EmptyDescription>
                              </EmptyHeader>
                              {selectedOsasOrganization && !isFormOpen && (
                                <EmptyContent>
                                  <Button
                                    type="button"
                                    size="sm"
                                    onClick={() => setIsFormOpen(true)}
                                    title="Open CBL Form"
                                    className="flex h-9 px-4 cursor-pointer border-0"
                                  >
                                    Open CBL Form
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
                                  No Matches Found
                                </EmptyTitle>
                                <EmptyDescription>
                                  Try adjusting your search query or filter criteria.
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
                                  title="Reset Filters"
                                  className="h-9 px-4 text-xs font-semibold rounded-xl"
                                >
                                  Reset Filters
                                </Button>
                              </EmptyContent>
                            </Empty>
                          </div>
                        ) : (
                          <div className="p-5 space-y-4">
                            {groupedCblVersions.map((group) => (
                              <div key={group.key || "all"} className="space-y-3">
                                {group.label && (
                                  <div className="flex items-center gap-2 px-1 text-xs font-semibold text-gray-700 dark:text-zinc-300">
                                    <span className="font-bold">{group.label}</span>
                                    <span className="text-muted-foreground font-normal">({group.items.length})</span>
                                  </div>
                                )}
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
                <SheetTitle>
                  Document Request Details
                </SheetTitle>
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

                <button
                  type="button"
                  onClick={() => setSelectedRequestForDetail(null)}
                  className="size-8 rounded-full bg-black/[0.04] hover:bg-black/[0.08] dark:bg-white/[0.08] dark:hover:bg-white/[0.14] text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-100 flex items-center justify-center transition-all cursor-pointer active:scale-95 border border-black/[0.04] dark:border-white/[0.08] shadow-2xs"
                  aria-label="Close"
                  title="Close"
                >
                  <Cancel01Icon size="1em" className="text-sm" />
                </button>
              </div>
            </div>
          </SheetHeader>

          {/* Line-Attached Edge-to-Edge Status Notice */}
          <div
            className={cn(
              "flex items-center gap-2.5 px-6 py-2.5 text-xs border-b transition-colors shrink-0",
              selectedRequestForDetail?.status === "Ready"
                ? "border-emerald-200/90 bg-emerald-50/90 text-emerald-950 dark:border-emerald-900/40 dark:bg-emerald-950/25 dark:text-emerald-200"
                : selectedRequestForDetail?.status === "PendingPayment" || selectedRequestForDetail?.status === "Deficient"
                ? "border-amber-200/90 bg-amber-50/90 text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/25 dark:text-amber-200"
                : selectedRequestForDetail?.status === "Completed"
                ? "border-emerald-200/90 bg-emerald-50/90 text-emerald-950 dark:border-emerald-900/40 dark:bg-emerald-950/25 dark:text-emerald-200"
                : selectedRequestForDetail?.status === "Cancelled" || selectedRequestForDetail?.status === "Declined"
                ? "border-rose-200/90 bg-rose-50/90 text-rose-950 dark:border-rose-900/40 dark:bg-rose-950/25 dark:text-rose-200"
                : "border-blue-200/90 bg-blue-50/90 text-blue-950 dark:border-blue-900/40 dark:bg-blue-950/25 dark:text-blue-200"
            )}
          >
            <AppIcon
              className={cn(
                " text-[15px] shrink-0",
                selectedRequestForDetail?.status === "Ready" || selectedRequestForDetail?.status === "Completed"
                  ? "Shield01Icon text-emerald-600 dark:text-emerald-400"
                  : selectedRequestForDetail?.status === "PendingPayment" || selectedRequestForDetail?.status === "Deficient"
                  ? "Alert01Icon text-amber-600 dark:text-amber-400"
                  : selectedRequestForDetail?.status === "Cancelled" || selectedRequestForDetail?.status === "Declined"
                  ? "CancelCircleIcon text-rose-600 dark:text-rose-400"
                  : "Clock01Icon text-blue-600 dark:text-blue-400"
              )}
            />
            <span className="font-medium text-[11.5px] sm:text-xs leading-normal">
              <strong className="font-semibold">
                {selectedRequestForDetail?.status === "Ready"
                  ? "Ready for Claiming:"
                  : selectedRequestForDetail?.status === "PendingPayment"
                  ? "Payment Slip Required:"
                  : selectedRequestForDetail?.status === "Deficient"
                  ? "Action Required:"
                  : selectedRequestForDetail?.status === "Completed"
                  ? "Request Completed:"
                  : selectedRequestForDetail?.status === "InProgress"
                  ? "Processing In Progress:"
                  : "Under Review:"}
              </strong>{" "}
              {selectedRequestForDetail?.status === "Ready"
                ? "Official authenticated credential is ready for pickup at Registrar Window 1."
                : selectedRequestForDetail?.status === "PendingPayment"
                ? "Please upload your official receipt or payment slip below to initiate document preparation."
                : selectedRequestForDetail?.status === "Deficient"
                ? "Please review feedback from the Registrar to resolve requirement deficiencies."
                : selectedRequestForDetail?.status === "Completed"
                ? "Document was successfully claimed and recorded in University Archives."
                : selectedRequestForDetail?.status === "InProgress"
                ? "Registrar staff is currently preparing and authenticating your document."
                : "Your request is queued for verification by the Office of the Campus Registrar."}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin">
            {/* Request Summary Strip (Unboxed) */}
            <div className="flex items-start gap-3.5 pb-4 border-b border-border/80 dark:border-border">
              <div className="w-11 h-11 rounded-full bg-pup-maroon/10 text-pup-maroon dark:bg-red-950/40 dark:text-red-400 flex items-center justify-center text-lg shrink-0 font-bold mt-0.5 shadow-2xs">
                <File02Icon size={16}  />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className={cn(BADGE_BASE, BADGE_PALETTES.slate, "font-sans tabular-nums")}>
                    Request {selectedRequestForDetail?.id}
                  </span>
                  <StatusBadge status={selectedRequestForDetail?.status} />
                </div>
                <h3 className="text-base font-bold text-gray-900 dark:text-zinc-100 leading-snug break-words">
                  {selectedRequestForDetail?.doc_type}
                </h3>
                <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1">
                  Submitted on {selectedRequestForDetail?.created_at ? formatPHDateTime(selectedRequestForDetail.created_at) : "N/A"}
                </p>
              </div>
            </div>

            {/* Essential Request Specification (Unboxed InfoRow List) */}
            <div className="space-y-2">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500">
                Request Specification
              </h4>
              <div className="divide-y divide-gray-100/70 dark:divide-zinc-800/50">
                <InfoRow icon="Building01Icon" label="Verifying Office" value="Office of the Campus Registrar" />
                <InfoRow icon="Tag01Icon" label="Client Classification" value={selectedRequestForDetail?.client_type || "Enrolled Student"} />
                {selectedRequestForDetail?.status === "Ready" && (
                  <InfoRow icon="Door01Icon" label="Claiming Window" value="Window 1 — Releasing (Room 102)" />
                )}
                {selectedRequestForDetail?.status === "Ready" && (
                  <InfoRow icon="Clock01Icon" label="Window Hours" value="Mon – Fri, 8:00 AM – 5:00 PM (Bring Valid ID)" />
                )}
                {selectedRequestForDetail?.status === "Completed" && selectedRequestForDetail?.updated_at && (
                  <InfoRow icon="CalendarCheckIn01Icon" label="Claimed On" value={formatPHDateTime(selectedRequestForDetail.updated_at)} />
                )}
              </div>
            </div>

            {/* Purpose / Description (Unboxed) */}
            {selectedRequestForDetail?.notes && (
              <div className="space-y-1.5 pt-3 border-t border-gray-100 dark:border-zinc-800">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500">
                  Purpose / Notes
                </h4>
                <div className="text-xs text-gray-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">
                  <NarrativeText text={selectedRequestForDetail.notes} mode="full" />
                </div>
              </div>
            )}

            {/* Parent / Legal Guardian Information (Unboxed) */}
            {selectedRequestForDetail?.client_type === "Parent" && (
              <div className="space-y-2 pt-3 border-t border-gray-100 dark:border-zinc-800">
                <div className="flex items-center justify-between">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500">
                    Parent / Representative Authorization
                  </h4>
                  {selectedRequestForDetail.spa_verified ? (
                    <span className={cn(BADGE_BASE, BADGE_PALETTES.emerald)}>
                      SPA Verified
                    </span>
                  ) : (
                    <span className={cn(BADGE_BASE, BADGE_PALETTES.amber)}>
                      SPA Pending
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] text-gray-400 block font-medium uppercase">Representative</span>
                    <span className="font-semibold text-gray-800 dark:text-zinc-200 truncate block">
                      {selectedRequestForDetail.requester_name || "N/A"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 block font-medium uppercase">Relationship</span>
                    <span className="font-semibold text-gray-800 dark:text-zinc-200 truncate block">
                      {selectedRequestForDetail.requester_relationship || "Legal Guardian"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 block font-medium uppercase">Contact</span>
                    <span className="font-semibold text-gray-800 dark:text-zinc-200 truncate block">
                      {selectedRequestForDetail.requester_contact || "N/A"}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Experience Rating & Feedback (Unboxed) */}
            {selectedRequestForDetail?.feedback ? (
              <div className="space-y-2 pt-3 border-t border-gray-100 dark:border-zinc-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <StarIcon size="1em" className="text-amber-500 text-xs" />
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500">
                      Your Experience Rating
                    </h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setFeedbackRequest(selectedRequestForDetail);
                      setFeedbackInitialRating(selectedRequestForDetail.feedback?.rating || 0);
                      setFeedbackModalOpen(true);
                    }}
                    title="Edit Feedback"
                    className="text-[11px] font-semibold text-pup-maroon hover:underline dark:text-red-400 cursor-pointer"
                  >
                    Edit Feedback
                  </button>
                </div>

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
                        className={cn(BADGE_BASE, BADGE_PALETTES.slate)}
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
              </div>
            ) : (!selectedRequestForDetail?.feedback && (selectedRequestForDetail?.status === "Ready" || selectedRequestForDetail?.status === "Completed")) ? (
              <div className="flex items-center justify-between gap-3 pt-3 border-t border-gray-100 dark:border-zinc-800">
                <div>
                  <h4 className="text-xs font-semibold text-gray-800 dark:text-zinc-200">
                    Experience Feedback
                  </h4>
                  <p className="text-[11px] text-gray-500 dark:text-zinc-400">
                    Help improve registrar services by rating this request.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setFeedbackRequest(selectedRequestForDetail);
                    setFeedbackInitialRating(0);
                    setFeedbackModalOpen(true);
                  }}
                  title="Rate Experience"
                  className="h-8 px-3 text-xs font-semibold rounded-lg border border-border dark:border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all shrink-0"
                >
                  Rate Service
                </Button>
              </div>
            ) : null}

            {/* Payment Proof Upload Notice (if PendingPayment) */}
            {selectedRequestForDetail?.status === "PendingPayment" && (
              <div className="space-y-2 pt-3 border-t border-gray-100 dark:border-zinc-800">
                <div className="flex items-center gap-2 mb-1">
                  <AppIcon className=" Invoice01Icon text-amber-700 dark:text-amber-400 text-base" />
                  <h4 className="text-xs font-semibold text-amber-950 dark:text-amber-100">
                    Payment proof required
                  </h4>
                </div>
                <p className="text-xs text-amber-800 dark:text-amber-300">
                  Drop your receipt or payment confirmation slip here or browse to upload (PDF, PNG, JPG, or WEBP up to 10 MB).
                </p>
                <FileAttachmentDropzone
                  animateCards={false}
                  mode="single"
                  accept=".pdf,.png,.jpg,.jpeg,.webp"
                  title="Drop receipt or payment slip here, or browse"
                  subtitle="PDF, PNG, JPG, or WEBP up to 10 MB"
                  isUploading={paymentUploadRequestId === selectedRequestForDetail.id}
                  uploadProgress={paymentUploadRequestId === selectedRequestForDetail.id ? 65 : null}
                  onChange={(item) => {
                    if (item?.file) {
                      handlePaymentProofUpload(selectedRequestForDetail.id, item.file);
                    }
                  }}
                />
              </div>
            )}

            {/* Attached Supporting Documents (Unboxed) */}
            {Array.isArray(selectedRequestForDetail?.attachments) && selectedRequestForDetail.attachments.length > 0 && (
              <div className="space-y-2 pt-3 border-t border-gray-100 dark:border-zinc-800">
                <div className="flex items-center justify-between">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500">
                    Attached Documents ({selectedRequestForDetail.attachments.length})
                  </h4>
                </div>
                <div className="flex flex-wrap items-start gap-3">
                  {selectedRequestForDetail.attachments.map((att) => {
                    const fileUrl = att.url || `/api/document-requests/${selectedRequestForDetail.id}/attachments/${att.id}`;
                    return (
                      <AttachedFileCard
                        key={att.id}
                        item={{ ...att, url: fileUrl }}
                        readOnly={true}
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
                </div>
              </div>
            )}

            <div>
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-400 mb-3 flex items-center justify-between">
                <span>Processing Timeline & Updates</span>
                <span className="text-[11px] font-normal text-gray-400">
                  {selectedRequestForDetail?.updates?.length || 0} {selectedRequestForDetail?.updates?.length === 1 ? "update" : "updates"}
                </span>
              </h4>

              {selectedRequestForDetail?.updates && selectedRequestForDetail.updates.length > 0 ? (
                <div className="relative space-y-4">
                  {selectedRequestForDetail.updates.length > 1 && (
                    <div className="absolute left-2.5 top-2.5 bottom-2.5 w-0.5 -translate-x-1/2 bg-gray-200 dark:bg-zinc-800" />
                  )}
                  {selectedRequestForDetail.updates.map((upd, idx) => {
                    const isConsecutiveSameStatus =
                      idx > 0 && upd.status === selectedRequestForDetail.updates[idx - 1].status;
                    const formatStatusLabel = (st) => {
                      if (st === "InProgress") return "In Progress";
                      if (st === "Deficient") return "Action Required";
                      if (st === "PendingPayment") return "Pending Payment";
                      if (st === "Ready") return "Ready for Claiming";
                      return st;
                    };

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
                              {isConsecutiveSameStatus ? "Follow-Up Notice" : formatStatusLabel(upd.status)}
                            </span>
                            {isConsecutiveSameStatus && (
                              <StatusBadge status={upd.status} />
                            )}
                          </div>
                          {upd.created_at && (
                            <span className="text-[11px] text-gray-400 dark:text-zinc-500 font-sans tabular-nums">
                              {formatPHDateTime(upd.created_at)}
                            </span>
                          )}
                        </div>
                        <div className="mt-1 text-xs text-gray-600 dark:text-zinc-400 leading-normal">
                          <NarrativeText text={upd.message || "Status updated by Registrar"} mode="full" />
                        </div>
                      </div>
                    );
                  })}

                  {/* Fallback active indicator if ticket status is ahead of logged updates */}
                  {selectedRequestForDetail?.status &&
                    selectedRequestForDetail.status !== "Pending" &&
                    !selectedRequestForDetail.updates?.some((u) => u.status === selectedRequestForDetail.status) && (
                      <div className="relative pl-7">
                        <div className="absolute left-2.5 top-1 h-3.5 w-3.5 -translate-x-1/2 rounded-full border-2 border-white dark:border-border bg-emerald-600 shadow-xs ring-2 ring-emerald-600/20" />
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-gray-900 dark:text-zinc-100">
                              {selectedRequestForDetail.status === "InProgress"
                                ? "In Progress"
                                : selectedRequestForDetail.status === "Deficient"
                                ? "Action Required"
                                : selectedRequestForDetail.status === "PendingPayment"
                                ? "Pending Payment"
                                : selectedRequestForDetail.status === "Ready"
                                ? "Ready for Claiming"
                                : selectedRequestForDetail.status}
                            </span>
                            <span className={cn(BADGE_BASE, BADGE_PALETTES.emerald)}>
                              Current Active Status
                            </span>
                          </div>
                        </div>
                        <div className="mt-1 text-xs text-gray-600 dark:text-zinc-400 leading-normal">
                          <NarrativeText
                            text={`Your document request has been updated to ${selectedRequestForDetail.status === "InProgress" ? "In Progress" : selectedRequestForDetail.status === "Deficient" ? "Action Required" : selectedRequestForDetail.status === "PendingPayment" ? "Pending Payment" : selectedRequestForDetail.status === "Ready" ? "Ready for Claiming" : selectedRequestForDetail.status} by the Registrar.`}
                            mode="full"
                          />
                        </div>
                      </div>
                    )}
                </div>
              ) : (
                <EmptyState
                  variant="compact"
                  title="No Updates Posted Yet"
                  description="Your request is queued for review by the Registrar."
                />
              )}
            </div>
          </div>

          <SheetFooter className="shrink-0 p-4 px-6 flex flex-row items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedRequestForDetail(null)}
              className="h-9 px-4 text-xs font-semibold rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"
            >
              Close
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* OSAS Proposal Details & Timeline: Sheet Slide-Over */}
      <Sheet
        open={Boolean(selectedProposalForDetail)}
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

                <button
                  type="button"
                  onClick={() => setSelectedProposalForDetail(null)}
                  className="size-8 rounded-full bg-black/[0.04] hover:bg-black/[0.08] dark:bg-white/[0.08] dark:hover:bg-white/[0.14] text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-100 flex items-center justify-center transition-all cursor-pointer active:scale-95 border border-black/[0.04] dark:border-white/[0.08] shadow-2xs"
                  aria-label="Close"
                  title="Close"
                >
                  <Cancel01Icon size="1em" className="text-sm" />
                </button>
              </div>
            </div>
          </SheetHeader>

          {/* Line-Attached Edge-to-Edge Status Notice */}
          <div
            className={cn(
              "flex items-center gap-2.5 px-6 py-2.5 text-xs border-b transition-colors shrink-0",
              selectedProposalStatus === "Approved"
                ? "border-emerald-200/90 bg-emerald-50/90 text-emerald-950 dark:border-emerald-900/40 dark:bg-emerald-950/25 dark:text-emerald-200"
                : selectedProposalStatus === "Needs Revision"
                ? "border-amber-200/90 bg-amber-50/90 text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/25 dark:text-amber-200"
                : selectedProposalStatus === "Declined"
                ? "border-rose-200/90 bg-rose-50/90 text-rose-950 dark:border-rose-900/40 dark:bg-rose-950/25 dark:text-rose-200"
                : "border-blue-200/90 bg-blue-50/90 text-blue-950 dark:border-blue-900/40 dark:bg-blue-950/25 dark:text-blue-200"
            )}
          >
            <AppIcon
              className={cn(
                " text-[15px] shrink-0",
                selectedProposalStatus === "Approved"
                  ? "Shield01Icon text-emerald-600 dark:text-emerald-400"
                  : selectedProposalStatus === "Needs Revision"
                  ? "Alert01Icon text-amber-600 dark:text-amber-400"
                  : selectedProposalStatus === "Declined"
                  ? "CancelCircleIcon text-rose-600 dark:text-rose-400"
                  : "Clock01Icon text-blue-600 dark:text-blue-400"
              )}
            />
            <span className="font-medium text-[11.5px] sm:text-xs leading-normal">
              <strong className="font-semibold">
                {selectedProposalStatus === "Approved"
                  ? "Proposal Sanctioned:"
                  : selectedProposalStatus === "Needs Revision"
                  ? "Revision Required:"
                  : selectedProposalStatus === "Declined"
                  ? "Proposal Declined:"
                  : "Under OSAS Evaluation:"}
              </strong>{" "}
              {selectedProposalStatus === "Approved"
                ? "Official event proposal has been sanctioned and cleared by the Office of Student Affairs."
                : selectedProposalStatus === "Needs Revision"
                ? "Please review the evaluator notes in the timeline and re-upload an updated event proposal."
                : selectedProposalStatus === "Declined"
                ? "This event proposal was not approved for campus staging."
                : "Your proposal is undergoing administrative and safety review by OSAS."}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin">
            {/* Proposal Summary Strip (Unboxed) */}
            <div className="flex items-start gap-3.5 pb-4 border-b border-border/80 dark:border-border">
              <div className="w-11 h-11 rounded-full bg-pup-maroon/10 text-pup-maroon dark:bg-red-950/40 dark:text-red-400 flex items-center justify-center text-lg shrink-0 font-bold mt-0.5 shadow-2xs">
                <CalendarCheckIn01Icon size={16}  />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className={cn(BADGE_BASE, BADGE_PALETTES.slate, "font-sans tabular-nums")}>
                    Proposal {selectedProposalForDetail?.id}
                  </span>
                  <StatusBadge status={selectedProposalForDetail?.status} />
                </div>
                <h3 className="text-base font-bold text-gray-900 dark:text-zinc-100 leading-snug break-words">
                  {selectedProposalForDetail?.title}
                </h3>
                <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1">
                  Submitted on {selectedProposalForDetail?.created_at ? formatPHDateTime(selectedProposalForDetail.created_at) : "N/A"}
                </p>
              </div>
            </div>

            {/* Proposal Specification (Unboxed InfoRow List) */}
            <div className="space-y-2">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500">
                Proposal Specification
              </h4>
              <div className="divide-y divide-gray-100/70 dark:divide-zinc-800/50">
                <InfoRow icon="Building01Icon" label="Organization" value={selectedProposalForDetail?.organization_name || "Student Organization"} />
                <InfoRow icon="Calendar01Icon" label="Target Event Date" value={formatProposalEventDate(selectedProposalForDetail?.event_date)} />
                <InfoRow icon="PieChartIcon" label="Evaluation Stage">
                  <StatusBadge status={selectedProposalForDetail?.status} />
                </InfoRow>
              </div>
            </div>

            {/* Attached PDF Proposal File (Unboxed Sleek Row) */}
            {selectedProposalForDetail?.original_filename && (
              <div className="space-y-2 pt-3 border-t border-gray-100 dark:border-zinc-800">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500">
                  Attached Proposal Document
                </h4>
                <div className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-gray-50/70 dark:bg-zinc-800/40 border border-border/70 dark:border-border/60">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-50 text-pup-maroon dark:bg-red-950/40 dark:text-red-400">
                      <File02Icon size="1em" className="text-base" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-gray-900 dark:text-zinc-100 truncate" title={selectedProposalForDetail.original_filename}>
                        {selectedProposalForDetail.original_filename}
                      </p>
                      {selectedProposalForDetail?.size_bytes && (
                        <p className="text-[10px] text-gray-400 dark:text-zinc-500 font-sans tabular-nums">
                          {(selectedProposalForDetail.size_bytes / 1024).toFixed(1)} KB · Proposal PDF
                        </p>
                      )}
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenPdfPreview(selectedProposalForDetail)}
                    className="shrink-0 h-8 px-3 rounded-lg text-xs font-semibold border border-border dark:border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 cursor-pointer shadow-xs active:scale-95 transition-all"
                  >
                    <ViewIcon size="1em" className="text-xs mr-1" />
                    <span>{PDF_ACTION_LABELS.preview}</span>
                  </Button>
                </div>
              </div>
            )}

            {selectedProposalForDetail?.versions?.length > 0 && (
              <details className="rounded-xl border border-border/70 dark:border-border/60 bg-gray-50/70 dark:bg-zinc-800/40">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2.5 text-xs font-semibold text-gray-700 dark:text-zinc-200">
                  <span>Submitted PDF versions</span>
                  <span className="font-sans tabular-nums text-[11px] font-medium text-gray-500 dark:text-zinc-400">
                    {selectedProposalForDetail.versions.length}
                  </span>
                </summary>
                <div className="space-y-2 px-3 pb-3">
                  {[...selectedProposalForDetail.versions].reverse().map((version, index) => (
                    <div key={version.id} className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-white px-2.5 py-2 dark:bg-zinc-900/40">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-gray-800 dark:text-zinc-100">
                          Revision {version.revision_number}{index === 0 ? " · Current" : ""}
                        </p>
                        <p className="truncate text-[11px] text-gray-500 dark:text-zinc-400" title={version.original_filename}>
                          {version.original_filename} · {formatPHDateTime(version.created_at)}
                        </p>
                      </div>
                      {version.file_pruned_at ? (
                        <span className="shrink-0 text-[10px] font-medium text-gray-400 dark:text-zinc-500">PDF removed after approval</span>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenPdfPreview(null, {
                            url: `/api/student/event-proposals/${selectedProposalForDetail.id}?file=1&revisionId=${version.id}`,
                            title: `${selectedProposalForDetail.title} · Revision ${version.revision_number}`,
                            subtitle: `Submitted for ${selectedProposalForDetail.organization_name || "OSAS"}.`,
                            studentName: me?.name || "Student",
                            docType: "Event Proposal",
                            originalFilename: version.original_filename || "Proposal.pdf",
                          })}
                          className="h-8 shrink-0 rounded-lg px-3 text-xs"
                        >
                          <ViewIcon size="1em" className="mr-1 text-xs" />
                          Preview
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </details>
            )}

            {/* Review Timeline & Updates */}
            <div>
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-400 mb-3 flex items-center justify-between">
                <span>Evaluation Timeline & Updates</span>
                <span className="text-[11px] font-normal text-gray-400">
                  {selectedProposalForDetail?.updates?.length || 0} {selectedProposalForDetail?.updates?.length === 1 ? "update" : "updates"}
                </span>
              </h4>

              {selectedProposalForDetail?.updates && selectedProposalForDetail.updates.length > 0 ? (
                <div className="relative space-y-4">
                  {selectedProposalForDetail.updates.length > 1 && (
                    <div className="absolute left-2.5 top-2.5 bottom-2.5 w-0.5 -translate-x-1/2 bg-gray-200 dark:bg-zinc-800" />
                  )}
                  {selectedProposalForDetail.updates.map((upd, idx) => {
                    const isConsecutiveSameStatus =
                      idx > 0 && upd.status === selectedProposalForDetail.updates[idx - 1].status;

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
                              <StatusBadge status={upd.status} />
                            )}
                          </div>
                          {upd.created_at && (
                            <span className="text-[11px] text-gray-400 dark:text-zinc-500 font-sans tabular-nums">
                              {formatPHDateTime(upd.created_at)}
                            </span>
                          )}
                        </div>
                        <div className="mt-1 text-xs text-gray-600 dark:text-zinc-400 leading-normal">
                          <NarrativeText text={upd.message || "Status updated by OSAS"} mode="full" />
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
            </div>
          </div>

          <SheetFooter className="shrink-0 p-4 px-6 flex flex-row items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedProposalForDetail(null)}
              className="h-9 px-4 text-xs font-semibold rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"
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
                <SheetTitle>Post-Event Report Details</SheetTitle>
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

                <button
                  type="button"
                  onClick={() => setSelectedPostEventReportForDetail(null)}
                  className="size-8 rounded-full bg-black/[0.04] hover:bg-black/[0.08] dark:bg-white/[0.08] dark:hover:bg-white/[0.14] text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-100 flex items-center justify-center transition-all cursor-pointer active:scale-95 border border-black/[0.04] dark:border-white/[0.08] shadow-2xs"
                  aria-label="Close"
                  title="Close"
                >
                  <Cancel01Icon size="1em" className="text-sm" />
                </button>
              </div>
            </div>
          </SheetHeader>

          {selectedPostEventReportForDetail && (
            <>
              <div
                className={cn(
                  "flex items-center gap-2.5 px-6 py-2.5 text-xs border-b transition-colors shrink-0",
                  selectedPostEventReportForDetail.status === "Cleared"
                    ? "border-emerald-200/90 bg-emerald-50/90 text-emerald-950 dark:border-emerald-900/40 dark:bg-emerald-950/25 dark:text-emerald-200"
                    : selectedPostEventReportForDetail.status === "Needs Revision"
                    ? "border-amber-200/90 bg-amber-50/90 text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/25 dark:text-amber-200"
                    : selectedPostEventReportForDetail.status === "Declined"
                    ? "border-rose-200/90 bg-rose-50/90 text-rose-950 dark:border-rose-900/40 dark:bg-rose-950/25 dark:text-rose-200"
                    : "border-blue-200/90 bg-blue-50/90 text-blue-950 dark:border-blue-900/40 dark:bg-blue-950/25 dark:text-blue-200"
                )}
              >
                <Shield01Icon
                  size="1em"
                  className={cn(
                    "text-[15px] shrink-0",
                    selectedPostEventReportForDetail.status === "Cleared"
                      ? "text-emerald-600 dark:text-emerald-400"
                      : selectedPostEventReportForDetail.status === "Needs Revision"
                      ? "text-amber-600 dark:text-amber-400"
                      : selectedPostEventReportForDetail.status === "Declined"
                      ? "text-rose-600 dark:text-rose-400"
                      : "text-blue-600 dark:text-blue-400"
                  )}
                />
                <span className="font-medium text-[11.5px] sm:text-xs leading-normal">
                  <strong className="font-semibold">
                    {selectedPostEventReportForDetail.status === "Cleared"
                      ? "Post-Event Report Cleared:"
                      : selectedPostEventReportForDetail.status === "Needs Revision"
                      ? "Revision Required:"
                      : selectedPostEventReportForDetail.status === "Declined"
                      ? "Post-Event Report Declined:"
                      : selectedPostEventReportForDetail.status === "Under Review"
                      ? "Under OSAS Review:"
                      : "Post-Event Report Submitted:"}
                  </strong>{" "}
                  {selectedPostEventReportForDetail.status === "Cleared"
                    ? "OSAS has cleared the submitted narrative and liquidation report."
                    : selectedPostEventReportForDetail.status === "Needs Revision"
                    ? "OSAS requested changes to this post-event report."
                    : selectedPostEventReportForDetail.status === "Declined"
                    ? "OSAS declined this post-event report."
                    : selectedPostEventReportForDetail.status === "Under Review"
                    ? "OSAS is reviewing your post-event report and liquidation documents."
                    : "Your report has been received by OSAS."}
                </span>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin">
                <div className="flex items-start gap-3.5 pb-4 border-b border-border/80 dark:border-border">
                  <div className="w-11 h-11 rounded-full bg-pup-maroon/10 text-pup-maroon dark:bg-red-950/40 dark:text-red-400 flex items-center justify-center text-lg shrink-0 font-bold mt-0.5 shadow-2xs">
                    <ClipboardIcon size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={cn(BADGE_BASE, BADGE_PALETTES.slate, "font-sans tabular-nums")}>
                        Report {selectedPostEventReportForDetail.id}
                      </span>
                      <StatusBadge status={selectedPostEventReportForDetail.status} />
                    </div>
                    <h3 className="text-base font-bold text-gray-900 dark:text-zinc-100 leading-snug break-words">
                      {selectedPostEventReportForDetail.event_title}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1">
                      Submitted on {selectedPostEventReportForDetail.created_at ? formatPHDateTime(selectedPostEventReportForDetail.created_at) : "N/A"}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500">
                    Post-Event Specification
                  </h4>
                  <div className="divide-y divide-gray-100/70 dark:divide-zinc-800/50">
                    <InfoRow icon="Building01Icon" label="Organization" value={selectedPostEventReportForDetail.organization_name} />
                    <InfoRow icon="Calendar01Icon" label="Event Date" value={formatProposalEventDate(selectedPostEventReportForDetail.event_date)} />
                    {selectedPostEventReportForDetail.venue && (
                      <InfoRow icon="Location01Icon" label="Venue" value={selectedPostEventReportForDetail.venue} />
                    )}
                    <InfoRow icon="UserIcon" label="Submitter" value={selectedPostEventReportForDetail.student_name || selectedPostEventReportForDetail.submitted_by_email || me?.name} />
                    <InfoRow icon="UserSearch01Icon" label="Actual Attendance" value={`${Number(selectedPostEventReportForDetail.actual_attendance ?? selectedPostEventReportForDetail.actual_attendees ?? 0).toLocaleString()} attendees`} />
                    <InfoRow icon="Coins01Icon" label="Liquidated Spend" value={`₱${Number(selectedPostEventReportForDetail.total_expenses ?? selectedPostEventReportForDetail.actual_expenses ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`} />
                    {selectedPostEventReportForDetail.event_proposal_id && (
                      <InfoRow icon="CalendarCheckIn01Icon" label="Event Proposal" value={`Proposal #${selectedPostEventReportForDetail.event_proposal_id}`} />
                    )}
                    <InfoRow icon="PieChartIcon" label="Clearance Status">
                      <StatusBadge status={selectedPostEventReportForDetail.status} />
                    </InfoRow>
                  </div>
                </div>

                {selectedPostEventReportForDetail.narrative_summary && (
                  <div className="space-y-2 pt-3 border-t border-gray-100 dark:border-zinc-800">
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500">
                      Accomplishment Summary
                    </h4>
                    <div className="text-xs text-gray-700 dark:text-zinc-300 leading-relaxed">
                      <NarrativeText text={selectedPostEventReportForDetail.narrative_summary} mode="full" />
                    </div>
                  </div>
                )}

                {selectedPostEventReportForDetail.review_note && (
                  <div className="space-y-2 pt-3 border-t border-gray-100 dark:border-zinc-800">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500">
                        OSAS Review Note
                      </h4>
                      <span className="text-[11px] text-gray-500 dark:text-zinc-400">
                        {selectedPostEventReportForDetail.reviewer_name || "OSAS"}
                        {selectedPostEventReportForDetail.reviewed_at && ` · ${formatPHDateTime(selectedPostEventReportForDetail.reviewed_at)}`}
                      </span>
                    </div>
                    <div className="text-xs text-gray-700 dark:text-zinc-300 leading-relaxed">
                      <NarrativeText text={selectedPostEventReportForDetail.review_note} mode="full" />
                    </div>
                  </div>
                )}

                <div className="space-y-2 pt-3 border-t border-gray-100 dark:border-zinc-800">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500">
                    Submitted Documents
                  </h4>
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
                      <div key={file.key} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-gray-50/70 dark:bg-zinc-800/40 border border-border/70 dark:border-border/60">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-50 text-pup-maroon dark:bg-red-950/40 dark:text-red-400">
                            <File02Icon size={16} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-gray-900 dark:text-zinc-100">{file.label}</p>
                            <p className="text-[11px] text-gray-500 dark:text-zinc-400 truncate" title={file.filename || "No file attached"}>
                              {file.filename || "No file attached"}
                            </p>
                          </div>
                        </div>
                        {file.storageFilename ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenPdfPreview(null, {
                              url: `/api/student/post-event-reports/${selectedPostEventReportForDetail.id}?file=${file.key}`,
                              title: `${file.label}: ${selectedPostEventReportForDetail.event_title}`,
                              subtitle: `Submitted by ${selectedPostEventReportForDetail.submitted_by_email || me?.email || "Student Officer"}`,
                              studentName: me?.name || "Student",
                              docType: file.docType,
                              originalFilename: file.filename || `${file.key}.pdf`,
                            })}
                            className="h-8 shrink-0 px-3 rounded-lg text-xs font-semibold border border-border dark:border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 cursor-pointer shadow-xs active:scale-95 transition-all"
                          >
                            View {file.key === "narrative" ? "Narrative" : "Liquidation"}
                          </Button>
                        ) : (
                          <span className="text-[11px] text-gray-400 dark:text-zinc-500 italic shrink-0">No file</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <SheetFooter className="shrink-0 p-4 px-6 flex flex-row items-center justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedPostEventReportForDetail(null)}
                  className="h-9 px-4 text-xs font-semibold rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"
                >
                  Close
                </Button>
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* OSAS Constitution & By-Laws Details: Sheet Slide-Over */}
      <Sheet
        open={Boolean(selectedCblVersionForDetail)}
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
                <SheetTitle>Constitution &amp; By-Laws Details</SheetTitle>
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

                <button
                  type="button"
                  onClick={() => setSelectedCblVersionForDetail(null)}
                  className="size-8 rounded-full bg-black/[0.04] hover:bg-black/[0.08] dark:bg-white/[0.08] dark:hover:bg-white/[0.14] text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-100 flex items-center justify-center transition-all cursor-pointer active:scale-95 border border-black/[0.04] dark:border-white/[0.08] shadow-2xs"
                  aria-label="Close"
                  title="Close"
                >
                  <Cancel01Icon size="1em" className="text-sm" />
                </button>
              </div>
            </div>
          </SheetHeader>

          {selectedCblVersionForDetail && (
            <>
              <div
                className={cn(
                  "flex items-center gap-2.5 px-6 py-2.5 text-xs border-b transition-colors shrink-0",
                  selectedCblVersionForDetail.status === "Approved"
                    ? "border-emerald-200/90 bg-emerald-50/90 text-emerald-950 dark:border-emerald-900/40 dark:bg-emerald-950/25 dark:text-emerald-200"
                    : selectedCblVersionForDetail.status === "Needs Revision"
                    ? "border-amber-200/90 bg-amber-50/90 text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/25 dark:text-amber-200"
                    : selectedCblVersionForDetail.status === "Declined"
                    ? "border-rose-200/90 bg-rose-50/90 text-rose-950 dark:border-rose-900/40 dark:bg-rose-950/25 dark:text-rose-200"
                    : selectedCblVersionForDetail.status === "Superseded"
                    ? "border-gray-200/90 bg-gray-50/90 text-gray-800 dark:border-zinc-800 dark:bg-zinc-900/70 dark:text-zinc-200"
                    : "border-blue-200/90 bg-blue-50/90 text-blue-950 dark:border-blue-900/40 dark:bg-blue-950/25 dark:text-blue-200"
                )}
              >
                <BookBookmark01Icon
                  size="1em"
                  className={cn(
                    "text-[15px] shrink-0",
                    selectedCblVersionForDetail.status === "Approved"
                      ? "text-emerald-600 dark:text-emerald-400"
                      : selectedCblVersionForDetail.status === "Needs Revision"
                      ? "text-amber-600 dark:text-amber-400"
                      : selectedCblVersionForDetail.status === "Declined"
                      ? "text-rose-600 dark:text-rose-400"
                      : selectedCblVersionForDetail.status === "Superseded"
                      ? "text-gray-500 dark:text-zinc-400"
                      : "text-blue-600 dark:text-blue-400"
                  )}
                />
                <span className="font-medium text-[11.5px] sm:text-xs leading-normal">
                  <strong className="font-semibold">
                    {selectedCblVersionForDetail.status === "Approved"
                      ? "Charter Approved:"
                      : selectedCblVersionForDetail.status === "Needs Revision"
                      ? "Revision Requested:"
                      : selectedCblVersionForDetail.status === "Declined"
                      ? "Submission Declined:"
                      : selectedCblVersionForDetail.status === "Superseded"
                      ? "Superseded:"
                      : "Pending OSAS Review:"}
                  </strong>{" "}
                  {selectedCblVersionForDetail.status === "Approved"
                    ? "OSAS approved this Constitution & By-Laws version."
                    : selectedCblVersionForDetail.status === "Needs Revision"
                    ? "OSAS requested changes to this charter submission."
                    : selectedCblVersionForDetail.status === "Declined"
                    ? "OSAS did not approve this charter version."
                    : selectedCblVersionForDetail.status === "Superseded"
                    ? "A newer approved charter version has replaced this submission."
                    : "This charter submission is awaiting review."}
                </span>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin">
                <div className="flex items-start gap-3.5 pb-4 border-b border-border/80 dark:border-border">
                  <div className="w-11 h-11 rounded-full bg-pup-maroon/10 text-pup-maroon dark:bg-red-950/40 dark:text-red-400 flex items-center justify-center text-lg shrink-0 font-bold mt-0.5 shadow-2xs">
                    <BookBookmark01Icon size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={cn(BADGE_BASE, BADGE_PALETTES.slate, "font-sans tabular-nums")}>
                        {selectedCblVersionForDetail.version_tag || `v${selectedCblVersionForDetail.version_number || "1.0"}`}
                      </span>
                      <StatusBadge status={selectedCblVersionForDetail.status} />
                    </div>
                    <h3 className="text-base font-bold text-gray-900 dark:text-zinc-100 leading-snug break-words">
                      Constitution &amp; By-Laws
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1">
                      Submitted on {selectedCblVersionForDetail.created_at ? formatPHDateTime(selectedCblVersionForDetail.created_at) : "N/A"}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500">
                    Charter Specification
                  </h4>
                  <div className="divide-y divide-gray-100/70 dark:divide-zinc-800/50">
                    <InfoRow icon="Building01Icon" label="Organization" value={selectedOsasOrganization?.organization_name || cblOrgData?.name} />
                    <InfoRow icon="BookBookmark01Icon" label="Version" value={selectedCblVersionForDetail.version_tag || `v${selectedCblVersionForDetail.version_number || "1.0"}`} />
                    {selectedCblVersionForDetail.effective_date && (
                      <InfoRow icon="Calendar01Icon" label="Effective Date" value={formatProposalEventDate(selectedCblVersionForDetail.effective_date)} />
                    )}
                    <InfoRow icon="PieChartIcon" label="Review Status">
                      <StatusBadge status={selectedCblVersionForDetail.status} />
                    </InfoRow>
                    <InfoRow icon="UserIcon" label="Submitted By" value={selectedCblVersionForDetail.submitted_by_name || selectedCblVersionForDetail.submitted_by_email || "Student Officer"} />
                    {selectedCblVersionForDetail.submitted_by_student_no && (
                      <InfoRow icon="IdIcon" label="Student Number" value={selectedCblVersionForDetail.submitted_by_student_no} />
                    )}
                    {selectedCblVersionForDetail.size_bytes && (
                      <InfoRow icon="File02Icon" label="File Size" value={`${(selectedCblVersionForDetail.size_bytes / 1024).toFixed(1)} KB`} />
                    )}
                  </div>
                </div>

                <div className="space-y-2 pt-3 border-t border-gray-100 dark:border-zinc-800">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500">
                    Amendment Summary
                  </h4>
                  <div className="text-xs text-gray-700 dark:text-zinc-300 leading-relaxed">
                    <NarrativeText text={selectedCblVersionForDetail.amendment_summary || "No amendment summary was provided."} mode="full" />
                  </div>
                </div>

                {selectedCblVersionForDetail.review_notes && (
                  <div className="space-y-2 pt-3 border-t border-gray-100 dark:border-zinc-800">
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500">
                      OSAS Review Feedback
                    </h4>
                    <div className="text-xs text-gray-700 dark:text-zinc-300 leading-relaxed">
                      <NarrativeText text={selectedCblVersionForDetail.review_notes} mode="full" />
                    </div>
                  </div>
                )}

                <div className="space-y-2 pt-3 border-t border-gray-100 dark:border-zinc-800">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500">
                    Submitted Document
                  </h4>
                  <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-gray-50/70 dark:bg-zinc-800/40 border border-border/70 dark:border-border/60">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-50 text-pup-maroon dark:bg-red-950/40 dark:text-red-400">
                        <File02Icon size={16} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-gray-900 dark:text-zinc-100">Constitution &amp; By-Laws PDF</p>
                        <p className="text-[11px] text-gray-500 dark:text-zinc-400 truncate" title={selectedCblVersionForDetail.original_filename || "No file attached"}>
                          {selectedCblVersionForDetail.original_filename || "No file attached"}
                        </p>
                      </div>
                    </div>
                    {selectedCblVersionForDetail.storage_filename && selectedOsasOrgId ? (
                      <div className="flex shrink-0 items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenPdfPreview(null, {
                            url: `/api/student/organizations/${selectedOsasOrgId}/bylaws?file=1&versionId=${selectedCblVersionForDetail.id}`,
                            title: `${cblOrgData?.name || "Organization"}: ${selectedCblVersionForDetail.version_tag || "CBL"}`,
                            subtitle: `Submitted by ${selectedCblVersionForDetail.submitted_by_name || selectedCblVersionForDetail.submitted_by_email || "Student Officer"}. Status: ${selectedCblVersionForDetail.status}`,
                            studentName: selectedCblVersionForDetail.submitted_by_name || me?.name || "Student",
                            docType: "Constitution & By-Laws",
                            originalFilename: selectedCblVersionForDetail.original_filename || "Constitution-and-By-Laws.pdf",
                          })}
                          className="h-8 shrink-0 px-3 rounded-lg text-xs font-semibold border border-border dark:border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 cursor-pointer shadow-xs active:scale-95 transition-all"
                        >
                          View Document
                        </Button>
                        <a
                          href={`/api/student/organizations/${selectedOsasOrgId}/bylaws?file=1&versionId=${selectedCblVersionForDetail.id}`}
                          download={selectedCblVersionForDetail.original_filename || "Constitution-and-By-Laws.pdf"}
                          aria-label="Download Constitution & By-Laws document"
                          title="Download Constitution & By-Laws document"
                          className="inline-flex size-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-pup-maroon dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-red-400 transition-colors"
                        >
                          <Download01Icon size={16} aria-hidden="true" />
                        </a>
                      </div>
                    ) : (
                      <span className="text-[11px] text-gray-400 dark:text-zinc-500 italic shrink-0">No file</span>
                    )}
                  </div>
                </div>
              </div>

              <SheetFooter className="shrink-0 p-4 px-6 flex flex-row items-center justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedCblVersionForDetail(null)}
                  className="h-9 px-4 text-xs font-semibold rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"
                >
                  Close
                </Button>
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
  const fallback = <StudentDashboardSkeleton view={normalizeStudentTab(searchParams?.get("view"))} />;

  return (
    <Suspense fallback={fallback}>
      <StudentDashboard />
    </Suspense>
  );
}

export default function StudentPage() {
  return (
    <Suspense fallback={<StudentDashboardSkeleton view={null} />}>
      <StudentPageWithView />
    </Suspense>
  );
}
