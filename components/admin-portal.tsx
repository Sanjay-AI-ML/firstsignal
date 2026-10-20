"use client";
import ProjectIcon from "./project-icon";

import { useEffect, useReducer, useState } from "react";
import Link from "next/link";
import { SignOutButton } from "@/components/auth-form";
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  ClipboardList,
  Eye,
  EyeOff,
  Flag,
  History,
  LayoutDashboard,
  LockKeyhole,
  Mail,
  RefreshCw,
  Search,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  UsersRound,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type {
  AdminAction,
  AdminAudit,
  AdminEmailOperations,
  AdminEmailState,
  AdminOverview,
  AdminPage,
  AdminProfile,
  AdminProfileDetail,
  AdminReport,
  ReportStatus,
} from "@/lib/admin-types";
import { adminEmailStates, reportStatuses } from "@/lib/admin-types";
import "@/app/admin/admin.css";

type View = "overview" | "reports" | "profiles" | "emails" | "audit" | "settings";
type ListingKind = "all" | "startup" | "investor";
type ListingVisibility = "all" | "visible" | "removed";
type Directory = AdminPage<AdminReport | AdminProfile | AdminAudit>;
type Resource<T> = {
  data?: T;
  loading: boolean;
  error: string;
  status: number;
  query: string;
  fetchedAt?: string;
};
type ResourceAction<T> =
  | { type: "start"; query: string }
  | { type: "loaded"; query: string; data: T }
  | { type: "failed"; query: string; error: string; status: number };
const titles: Record<View, [string, string]> = {
  overview: [
    "A clear view of FindIn.",
    "Review reports, manage public listings and keep track of operator actions.",
  ],
  reports: [
    "Reports",
    "Review member concerns. A report is a request for review, not proof of wrongdoing.",
  ],
  profiles: [
    "Ideas & investor profiles",
    "Review public content, remove unsuitable listings and restore them after review.",
  ],
  emails: [
    "Email outbox operations",
    "Review delivery outcomes and waiting notifications. Automatic retries keep their original safety limits.",
  ],
  audit: [
    "Activity log",
    "A record of moderation actions, their reasons and the owner account that made them.",
  ],
  settings: [
    "Service configuration",
    "Current runtime status. Credentials and access permissions are managed securely outside this portal.",
  ],
};
const labels: Record<ReportStatus, string> = {
  submitted: "New",
  reviewing: "In review",
  resolved: "Resolved",
  dismissed: "Dismissed",
};
const nav = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "reports", label: "Reports", icon: Flag },
  { id: "profiles", label: "Listings", icon: UsersRound },
  { id: "emails", label: "Outbox", icon: Mail },
  { id: "audit", label: "Activity", icon: History },
  { id: "settings", label: "Settings", icon: Settings2 },
] as const;
const count = (value: number) => new Intl.NumberFormat("en-IN").format(value);
const removalReasons = [
  ["spam", "Spam or unrelated promotion", "This listing has been removed because it contains spam or promotion unrelated to a founder idea or investor profile. Please remove that content. It remains removed until an admin reviews it."],
  ["misleading", "Misleading information", "This listing has been removed because important claims need correction or clearer support. Please update the information and distinguish plans from completed work. It remains removed until an admin reviews it."],
  ["inappropriate", "Harmful or inappropriate content", "This listing has been removed because it contains harmful or inappropriate content. Please remove that material. It remains removed until an admin reviews it."],
  ["privacy", "Personal or confidential information", "This listing has been removed because it includes personal or confidential information that should not be public. Please remove that information. It remains removed until an admin reviews it."],
  ["duplicate", "Duplicate listing", "This listing has been removed because it duplicates another listing. Please keep one clear, current profile for the idea or investor."],
] as const;
const restorationReasons = [
  ["corrected", "Content corrected", "The listing has been reviewed and the content that led to its removal has been corrected. The listing restriction has been lifted."],
  ["reviewed", "Review completed", "The listing has been reviewed and there is no longer a reason to keep it removed. The listing restriction has been lifted."],
] as const;
function time(value?: string | null) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Not recorded"
    : date.toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
}
function resourceReducer<T>(
  state: Resource<T>,
  action: ResourceAction<T>,
): Resource<T> {
  if (action.type === "start")
    return {
      ...state,
      data: state.query === action.query ? state.data : undefined,
      query: action.query,
      loading: true,
      error: "",
      status: 0,
    };
  if (action.type === "loaded")
    return {
      data: action.data,
      query: action.query,
      loading: false,
      error: "",
      status: 200,
      fetchedAt: new Date().toISOString(),
    };
  return {
    query: action.query,
    loading: false,
    error: action.error,
    status: action.status,
  };
}
function useAdminResource<T>(query: string, refresh: number, initialData?: T, onPageInvalid?: (page: number) => void) {
  const [state, dispatch] = useReducer(resourceReducer<T>, {
    data: initialData,
    query,
    loading: !initialData,
    error: "",
    status: 0,
  });
  useEffect(() => {
    const controller = new AbortController();
    dispatch({ type: "start", query });
    void (async () => {
      try {
        const response = await fetch(`/api/admin?${query}`, {
          cache: "no-store",
          credentials: "same-origin",
          signal: controller.signal,
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          const message =
            response.status === 401
              ? "Your session has expired. Sign in again to continue."
              : response.status === 403
                ? "This account does not have access to the admin portal."
                : "The admin data could not be loaded. Please try again.";
          if (!controller.signal.aborted)
            dispatch({
              type: "failed",
              query,
              error: message,
              status: response.status,
            });
          return;
        }
        if (onPageInvalid && payload && typeof payload === "object" && "page" in payload && "pages" in payload && typeof payload.page === "number" && typeof payload.pages === "number" && payload.page > Math.max(1, payload.pages)) {
          if (!controller.signal.aborted) onPageInvalid(Math.max(1, payload.pages));
          return;
        }
        if (!controller.signal.aborted)
          dispatch({ type: "loaded", query, data: payload as T });
      } catch {
        if (!controller.signal.aborted)
          dispatch({
            type: "failed",
            query,
            error:
              "The connection failed. Check your connection and try again.",
            status: 0,
          });
      }
    })();
    return () => controller.abort();
  }, [query, refresh, onPageInvalid]);
  return state.query === query
    ? state
    : { query, loading: true, error: "", status: 0 };
}
function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "warning" | "success" | "error" | "info";
}) {
  return <span className={`admin-badge admin-badge-${tone}`}>{children}</span>;
}
function Status({ status }: { status: ReportStatus }) {
  return (
    <Badge
      tone={
        status === "submitted"
          ? "warning"
          : status === "reviewing"
            ? "info"
            : status === "resolved"
              ? "success"
              : "neutral"
      }
    >
      {labels[status]}
    </Badge>
  );
}
function Empty({
  title,
  text,
  reports = false,
}: {
  title: string;
  text: string;
  reports?: boolean;
}) {
  return (
    <div className="admin-empty">
      <span className="admin-empty-art" aria-hidden="true">
        {reports ? <ClipboardList /> : <Search />}
      </span>
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}
function Loading() {
  return (
    <div
      className="admin-loading"
      role="status"
      aria-label="Loading admin data"
    >
      <span className="sr-only">Loading admin data…</span>
      <div className="admin-skeleton" />
      <div className="admin-skeleton" />
      <div className="admin-skeleton" />
    </div>
  );
}
function Pagination({
  data,
  onPage,
}: {
  data: Pick<AdminPage<unknown>, "items" | "page" | "pageSize" | "total" | "pages">;
  onPage: (page: number) => void;
}) {
  return (
    <div className="admin-list-footer">
      <span>
        {data.items.length && data.total
          ? `${count((data.page - 1) * data.pageSize + 1)}–${count(Math.min(data.page * data.pageSize, data.total))} of ${count(data.total)}`
          : "0 results"}
      </span>
      <nav className="admin-pagination" aria-label="Results pages">
        <button
          className="admin-btn"
          disabled={data.page <= 1}
          onClick={() => onPage(data.page - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft />
          <span>Previous</span>
        </button>
        <span>
          {data.page} / {Math.max(1, data.pages)}
        </span>
        <button
          className="admin-btn"
          disabled={data.page >= data.pages}
          onClick={() => onPage(data.page + 1)}
          aria-label="Next page"
        >
          <span>Next</span>
          <ChevronRight />
        </button>
      </nav>
    </div>
  );
}
function ReportRow({
  report,
  onOpen,
}: {
  report: AdminReport;
  onOpen: () => void;
}) {
  return (
    <li className="admin-list-row">
      <div>
        <h3 className="admin-row-title">
          <button onClick={onOpen}>
            {report.target?.name || "Unavailable listing"}
          </button>
        </h3>
        <div className="admin-row-meta">
          <Status status={report.status} />
          <span>{report.reason}</span>
          <span aria-hidden="true">·</span>
          <time dateTime={report.created}>{time(report.created)}</time>
        </div>
        {report.details && (
          <p className="admin-row-excerpt">{report.details}</p>
        )}
      </div>
      <button
        className="admin-btn"
        onClick={onOpen}
        aria-label={`Review report about ${report.target?.name || "unavailable listing"}`}
      >
        Review
        <ArrowUpRight />
      </button>
    </li>
  );
}
function ProfileRow({
  profile,
  onOpen,
}: {
  profile: AdminProfile;
  onOpen: () => void;
}) {
  return (
    <li className="admin-list-row">
      <div className="admin-profile-summary">
        {profile.kind === "startup" ? <ProjectIcon project={profile} size="md" /> : <span className="admin-row-avatar" aria-hidden="true">
          {profile.name
            .split(/\s+/)
            .slice(0, 2)
            .map((word) => word[0])
            .join("")}
        </span>}
        <div>
          <h3 className="admin-row-title">
            <button onClick={onOpen}>{profile.name}</button>
          </h3>
          <div className="admin-row-meta">
            <Badge tone={profile.hidden ? "warning" : "success"}>
              {profile.hidden ? <EyeOff /> : <Eye />}
              {profile.hidden ? "Removed" : "Visible"}
            </Badge>
            {profile.ownerListed ? (
              <>
                <span>
                  {profile.kind === "startup" ? "Founder idea" : "Investor profile"}
                </span>
                <span aria-hidden="true">·</span>
                <span>{profile.city || "Location not shared"}</span>
              </>
            ) : (
              <span>Owner unlisted · Private content not shown</span>
            )}
          </div>
          {profile.ownerListed && (
            <p className="admin-row-excerpt">
              {profile.tagline || profile.sector}
            </p>
          )}
        </div>
      </div>
      <button
        className="admin-btn"
        onClick={onOpen}
        aria-label={`Review listing ${profile.name}`}
      >
        View
        <ArrowUpRight />
      </button>
    </li>
  );
}
function AuditRow({ item }: { item: AdminAudit }) {
  const label =
    item.action === "profile_hidden"
      ? "Listing removed"
      : item.action === "profile_restored"
        ? "Listing restored"
        : item.action === "email_retried" ? "Earlier email retry request" : "Report updated";
  return (
    <li className="admin-audit-row">
      <span className="admin-audit-icon" aria-hidden="true">
        {item.action === "profile_hidden" ? (
          <EyeOff />
        ) : item.action === "profile_restored" ? (
          <Eye />
        ) : item.action === "email_retried" ? <Mail /> : (
          <Flag />
        )}
      </span>
      <div>
        <h3 className="admin-row-title">{label}</h3>
        <div className="admin-row-meta">
          <time dateTime={item.created}>{time(item.created)}</time>
          <span aria-hidden="true">·</span>
          <span>Owner action</span>
        </div>
        <p className="admin-row-meta">
          Target <span className="admin-mono">{item.targetId}</span>
        </p>
        <p className="admin-row-meta">
          By <span className="admin-mono">{item.actor}</span>
        </p>
        <p className="admin-row-meta">
          {item.previousState} → {item.nextState}
        </p>
        <blockquote>{item.reason}</blockquote>
      </div>
    </li>
  );
}

export default function AdminPortal({
  owner,
  initialOverview,
  initialDirectory,
  initialView = "overview",
}: {
  owner: { name: string; id: string };
  initialOverview?: AdminOverview;
  initialDirectory?: Directory;
  initialView?: View;
}) {
  const [view, setView] = useState<View>(initialView);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<ReportStatus>("submitted");
  const [kind, setKind] = useState<ListingKind>("all");
  const [visibility, setVisibility] = useState<ListingVisibility>("all");
  const [refresh, setRefresh] = useState(0);
  const [detail, setDetail] = useState<
    | { type: "report"; record: AdminReport }
    | { type: "profile"; record: Pick<AdminProfile, "id"> }
    | null
  >(null);
  const [moderate, setModerate] = useState<AdminProfile | null>(null);
  const [sourceReport, setSourceReport] = useState<AdminReport | null>(null);
  const [reason, setReason] = useState("");
  const [reasonPreset, setReasonPreset] = useState("");
  const [reviewStatus, setReviewStatus] = useState<ReportStatus>("reviewing");
  const [reviewNote, setReviewNote] = useState("");
  const [reviewDrafts, setReviewDrafts] = useState<
    Record<string, { note: string; status: ReportStatus }>
  >({});
  const [busy, setBusy] = useState(false);
  const [mutationError, setMutationError] = useState("");
  const [mutationStatus, setMutationStatus] = useState(0);
  const [notice, setNotice] = useState("");
  const [accessError, setAccessError] = useState<{status: number; error: string} | null>(null);
  const overview = useAdminResource<AdminOverview>(
    "view=overview",
    refresh,
    initialOverview,
  );
  const directoryView =
    view === "profiles" ? "profiles" : view === "audit" ? "audit" : "reports";
  const params = new URLSearchParams({
    view: directoryView,
    page: String(view === "overview" || view === "settings" || view === "emails" ? 1 : page),
  });
  if (view !== "overview" && view !== "settings" && view !== "emails" && search)
    params.set("q", search);
  if (directoryView === "reports")
    params.set(
      "status",
      view === "overview" || view === "settings" || view === "emails" ? "submitted" : status,
    );
  if (directoryView === "profiles") {
    params.set("kind", kind);
    params.set("visibility", visibility);
  }
  const directory = useAdminResource<Directory>(
    params.toString(),
    refresh,
    initialDirectory,
    setPage,
  );
  const fatal = accessError || [overview, directory].find(
    (resource) => resource.status === 401 || resource.status === 403,
  );
  function go(next: View) {
    setView(next);
    setPage(1);
    setQuery("");
    setSearch("");
    setNotice("");
    setMutationError("");
  }
  function openReport(record: AdminReport) {
    const draft = reviewDrafts[record.id];
    setDetail({ type: "report", record });
    setSourceReport(null);
    setReviewStatus(
      draft?.status ||
        (record.status === "submitted" ? "reviewing" : record.status),
    );
    setReviewNote(draft?.note ?? record.operatorNote ?? "");
    setMutationError("");
    setMutationStatus(0);
  }
  function openProfile(record: Pick<AdminProfile, "id">, report?: AdminReport) {
    setDetail({ type: "profile", record });
    setSourceReport(report || null);
    setMutationError("");
    setMutationStatus(0);
  }
  async function save(action: AdminAction) {
    setBusy(true);
    setMutationError("");
    setMutationStatus(0);
    setNotice("");
    try {
      const response = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(action),
      });
      if (!response.ok) {
        setMutationStatus(response.status);
        setMutationError(
          response.status === 409
            ? "This record has changed since you opened it. Reload the latest records and open it again before trying again. Your unsaved review note is kept in this tab."
            : response.status === 401
              ? "Your session has expired. Sign in again to continue."
              : response.status === 403
                ? "This account no longer has admin access."
                : "The change could not be saved. Your entry has been kept. Please try again.",
        );
        if (response.status === 401 || response.status === 403) {
          setAccessError({ status: response.status, error: response.status === 401 ? "Your session has expired. Sign in again to continue." : "This account no longer has admin access." });
          setDetail(null);
          setModerate(null);
          setReviewNote("");
          setReviewDrafts({});
          setReason("");
          setRefresh((value) => value + 1);
        }
        return;
      }
      setDetail(null);
      setModerate(null);
      setReason("");
      setReviewNote("");
      if (action.action === "reviewReport")
        setReviewDrafts((drafts) => {
          const next = { ...drafts };
          delete next[action.reportId];
          return next;
        });
      setNotice(
        action.action === "moderateProfile"
          ? action.hidden
            ? "Listing removed. The owner can see your reason in their workspace. This action is recorded in Activity."
            : moderate?.ownerListed === false
              ? "Restriction lifted. The profile remains private, and the action is recorded in the activity log."
              : "Listing restored. The action has been recorded in the activity log."
          : "Report updated. Your review note has been recorded in the activity log.",
      );
      setRefresh((value) => value + 1);
    } catch {
      setMutationError(
        "The connection failed. Your entry has been kept. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  const reports =
    directoryView === "reports"
      ? ((directory.data?.items || []) as AdminReport[])
      : [];
  const profiles =
    directoryView === "profiles"
      ? ((directory.data?.items || []) as AdminProfile[])
      : [];
  const audit =
    directoryView === "audit"
      ? ((directory.data?.items || []) as AdminAudit[])
      : [];
  if (fatal)
    return (
      <main className="admin-access-page" id="main-content">
        <section className="admin-access-card">
          <span className="admin-access-icon">
            <LockKeyhole aria-hidden="true" />
          </span>
          <h1>
            {fatal.status === 401 ? "Sign in to continue" : "Access restricted"}
          </h1>
          <p>{fatal.error}</p>
          <a
            className="admin-btn admin-btn-primary"
            href={fatal.status === 401 ? "/admin/signin" : "/app"}
          >
            {fatal.status === 401 ? "Sign in" : "Return to workspace"}
            <ArrowUpRight />
          </a>
        </section>
      </main>
    );
  return (
    <div className="admin-shell">
      <header className="admin-topbar">
        <Link className="admin-brand" href="/">
          <img
            src="/illustrations/findin-mark-64.webp"
            width="34"
            height="34"
            alt=""
          />
          FindIn<span>ADMIN PORTAL</span>
        </Link>
        <div className="admin-topbar-right">
          <a className="admin-back" href="/app">
            <ArrowLeft size={15} aria-hidden="true" />
            Workspace
          </a>
          <div className="admin-identity">
            <span className="admin-avatar" aria-hidden="true">
              {owner.name
                .split(/\s+/)
                .slice(0, 2)
                .map((word) => word[0])
                .join("")}
            </span>
            <div>
              <strong>{owner.name}</strong>
              <small>Owner access</small>
            </div>
          </div>
          <div className="admin-signout"><SignOutButton redirectUrl="/admin/signin" label="Sign out" /></div>
        </div>
      </header>
      <div className="admin-body">
        <aside className="admin-sidebar">
          <div>
            <p className="admin-sidebar-label">MANAGE FINDIN</p>
            <nav className="admin-nav" aria-label="Admin pages">
              {nav.map((item) => (
                <button
                  key={item.id}
                  aria-current={view === item.id ? "page" : undefined}
                  onClick={() => go(item.id)}
                >
                  <item.icon size={18} aria-hidden="true" />
                  <span>{item.label}</span>
                  {item.id === "reports" && !!overview.data?.reports.open && (
                    <span
                      className="admin-nav-count"
                      aria-label={`${overview.data.reports.open} open reports`}
                    >
                      {count(overview.data.reports.open)}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>
          <div className="admin-sidebar-note">
            <ShieldCheck size={21} aria-hidden="true" />
            <strong>Owner-only controls</strong>
            <p>
              Listings, submitted reports and restriction records. Private
              profile content and conversations stay outside this portal.
            </p>
          </div>
        </aside>
        <main className="admin-main" id="main-content">
          <header className="admin-page-header">
            <div>
              <span className="admin-eyebrow">
                <span aria-hidden="true">●</span> OWNER WORKSPACE
              </span>
              <h1>{titles[view][0]}</h1>
              <p>{titles[view][1]}</p>
            </div>
            <div>
              <button
                className="admin-btn admin-refresh"
                onClick={() => {
                  setDetail(null);
                  setModerate(null);
                  setRefresh((value) => value + 1);
                }}
                disabled={overview.loading || directory.loading}
                aria-label="Refresh admin data"
              >
                <RefreshCw aria-hidden="true" />
                <span>Refresh</span>
              </button>
            </div>
          </header>
          {notice && (
            <div
              className="admin-feedback admin-feedback-success"
              role="status"
            >
              <Check size={17} aria-hidden="true" />
              <p>{notice}</p>
            </div>
          )}
          {overview.error && (
            <ErrorNotice
              message={overview.error}
              onRetry={() => setRefresh((value) => value + 1)}
            />
          )}
          {view === "overview" && (
            <>
              {overview.loading && !overview.data ? (
                <Loading />
              ) : (
                overview.data && (
                  <>
                    <div className="admin-metrics">
                      <Metric
                        label="Open reports"
                        value={overview.data.reports.open}
                        help={`${count(overview.data.reports.submitted)} new · ${count(overview.data.reports.reviewing)} in review`}
                        icon={Flag}
                        accent
                      />
                      <Metric
                        label="Visible listings"
                        value={overview.data.profiles.public}
                        help="Member profiles available in discovery"
                        icon={Eye}
                      />
                      <Metric
                        label="Removed listings"
                        value={overview.data.profiles.hidden}
                        help="Owner moderation can be reversed"
                        icon={EyeOff}
                      />
                      <Metric
                        label="Private profiles"
                        value={overview.data.profiles.private}
                        help="Not listed and without an operator restriction"
                        icon={LockKeyhole}
                      />
                    </div>
                    <section className="admin-task-strip" aria-label="Admin shortcuts">
                      <button className="admin-task" onClick={() => { setStatus("submitted"); go("reports"); }}>
                        <Flag aria-hidden="true" /><span><strong>Review member reports</strong><small>{count(overview.data.reports.submitted)} new reports to review</small></span><ArrowUpRight aria-hidden="true" />
                      </button>
                      <button className="admin-task" onClick={() => { setKind("startup"); setVisibility("visible"); go("profiles"); }}>
                        <ClipboardList aria-hidden="true" /><span><strong>Manage founder ideas</strong><small>Read the idea before taking action</small></span><ArrowUpRight aria-hidden="true" />
                      </button>
                      <button className="admin-task" onClick={() => { setKind("all"); setVisibility("removed"); go("profiles"); }}>
                        <EyeOff aria-hidden="true" /><span><strong>Review removed listings</strong><small>Restore content after review</small></span><ArrowUpRight aria-hidden="true" />
                      </button>
                    </section>
                    <div className="admin-overview-columns">
                      <section className="admin-panel">
                        <div className="admin-panel-heading">
                          <div>
                            <h2>New reports</h2>
                            <p>
                              Start with concerns that have not been reviewed.
                            </p>
                          </div>
                          <button
                            className="admin-btn admin-btn-quiet"
                            onClick={() => go("reports")}
                          >
                            View all
                            <ArrowUpRight />
                          </button>
                        </div>
                        {directory.loading ? (
                          <Loading />
                        ) : directory.error ? (
                          <ErrorNotice
                            message={directory.error}
                            onRetry={() => setRefresh((value) => value + 1)}
                          />
                        ) : reports.length ? (
                          <ul className="admin-list">
                            {reports.slice(0, 5).map((report) => (
                              <ReportRow
                                key={report.id}
                                report={report}
                                onOpen={() => openReport(report)}
                              />
                            ))}
                          </ul>
                        ) : (
                          <Empty
                            reports
                            title="No new reports"
                            text="Newly submitted member concerns will appear here. Nothing needs an initial review right now."
                          />
                        )}
                        {reports.length > 5 && (
                          <div className="admin-list-footer">
                            <span>
                              Showing 5 of {count(directory.data?.total || 0)}{" "}
                              new reports
                            </span>
                            <button
                              className="admin-btn admin-btn-quiet"
                              onClick={() => go("reports")}
                            >
                              Open queue
                              <ArrowUpRight />
                            </button>
                          </div>
                        )}
                      </section>
                      <section className="admin-panel">
                        <div className="admin-panel-heading">
                          <h2>Review with care</h2>
                        </div>
                        <div className="admin-panel-content">
                          <div className="admin-principles">
                            <div className="admin-principle">
                              <Eye aria-hidden="true" />
                              <div>
                                <strong>Review what is public</strong>
                                <p>
                                  Profiles contain member-reported information.
                                  A listing is not independently verified.
                                </p>
                              </div>
                            </div>
                            <div className="admin-principle">
                              <SlidersHorizontal aria-hidden="true" />
                              <div>
                                <strong>Choose a reversible action</strong>
                                <p>
                                  Remove unsuitable listings from discovery.
                                  Restore them after review when appropriate.
                                </p>
                              </div>
                            </div>
                            <div className="admin-principle">
                              <History aria-hidden="true" />
                              <div>
                                <strong>Keep a clear record</strong>
                                <p>
                                  Every report review and listing change needs a
                                  reason in the activity log.
                                </p>
                              </div>
                            </div>
                          </div>
                          <p className="admin-low-note">
                            Moderation does not send an email, remove an account
                            or decide an investment outcome.
                          </p>
                        </div>
                      </section>
                    </div>
                    <p className="admin-updated">
                      Data last refreshed {time(overview.fetchedAt)}
                    </p>
                  </>
                )
              )}
            </>
          )}
          {view === "settings" &&
            (overview.loading && !overview.data ? (
              <Loading />
            ) : (
              overview.data && (
                <Configuration configuration={overview.data.configuration} />
              )
            ))}
          {view === "emails" && (
            <EmailOperationsView refresh={refresh} />
          )}
          {(view === "reports" || view === "profiles" || view === "audit") && (
            <>
              <form
                className="admin-toolbar"
                role="search"
                onSubmit={(event) => {
                  event.preventDefault();
                  setSearch(query.trim());
                  setPage(1);
                }}
              >
                <div className="admin-search">
                  <Search aria-hidden="true" />
                  <label className="sr-only" htmlFor="admin-search">
                    {view === "reports"
                      ? "Search reports"
                      : view === "profiles"
                        ? "Search public listings"
                        : "Search activity"}
                  </label>
                  <input
                    id="admin-search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder={
                      view === "reports"
                        ? "Search reports by reason or details…"
                        : view === "profiles"
                          ? "Search name, founder, location or sector…"
                          : "Search actions, target IDs or reasons…"
                    }
                    maxLength={100}
                  />
                  {query && (
                    <button
                      className="admin-search-clear"
                      type="button"
                      onClick={() => {
                        setQuery("");
                        setSearch("");
                        setPage(1);
                      }}
                      aria-label="Clear search"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
                <button className="admin-btn" type="submit">
                  Search
                </button>
                {view === "reports" && (
                  <div className="admin-select-wrap">
                    <label htmlFor="admin-report-status">Status</label>
                    <select
                      id="admin-report-status"
                      value={status}
                      onChange={(event) => {
                        setStatus(event.target.value as ReportStatus);
                        setPage(1);
                      }}
                    >
                      {reportStatuses.map((item) => (
                        <option key={item} value={item}>
                          {labels[item]}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                {view === "profiles" && (
                  <>
                    <div className="admin-select-wrap">
                      <label htmlFor="admin-listing-kind">Type</label>
                      <select id="admin-listing-kind" value={kind} onChange={(event) => { setKind(event.target.value as ListingKind); setPage(1); }}>
                        <option value="all">All listings</option>
                        <option value="startup">Founder ideas</option>
                        <option value="investor">Investor profiles</option>
                      </select>
                    </div>
                    <div className="admin-select-wrap">
                      <label htmlFor="admin-listing-visibility">Visibility</label>
                      <select id="admin-listing-visibility" value={visibility} onChange={(event) => { setVisibility(event.target.value as ListingVisibility); setPage(1); }}>
                        <option value="all">Visible & removed</option>
                        <option value="visible">Visible</option>
                        <option value="removed">Removed</option>
                      </select>
                    </div>
                  </>
                )}
              </form>
              <section className="admin-panel" aria-busy={directory.loading}>
                <div className="admin-panel-heading">
                  <div>
                    <h2>
                      {view === "reports"
                        ? "Member reports"
                        : view === "profiles"
                          ? "Member listings"
                          : "Moderation history"}
                    </h2>
                    <p>
                      {search
                        ? `Results for “${search}”`
                        : view === "reports"
                          ? "Submitted reports remain private to the operator."
                          : view === "profiles"
                            ? "Review founder ideas and investor profiles. Private drafts and fictional examples are excluded."
                            : "Operator actions are recorded with their reasons."}
                    </p>
                  </div>
                  {directory.data && (
                    <Badge>
                      {count(directory.data.total)}{" "}
                      {directory.data.total === 1 ? "record" : "records"}
                    </Badge>
                  )}
                </div>
                {directory.loading ? (
                  <Loading />
                ) : directory.error ? (
                  <ErrorNotice
                    message={directory.error}
                    onRetry={() => setRefresh((value) => value + 1)}
                  />
                ) : directory.data?.items.length ? (
                  <ul className="admin-list">
                    {view === "reports"
                      ? reports.map((report) => (
                          <ReportRow
                            key={report.id}
                            report={report}
                            onOpen={() => openReport(report)}
                          />
                        ))
                      : view === "profiles"
                        ? profiles.map((profile) => (
                            <ProfileRow
                              key={profile.id}
                              profile={profile}
                              onOpen={() => openProfile(profile)}
                            />
                          ))
                        : audit.map((item) => (
                            <AuditRow key={item.id} item={item} />
                          ))}
                  </ul>
                ) : (
                  <Empty
                    reports={view === "reports"}
                    title={
                      search
                        ? "No matching records"
                        : view === "reports"
                          ? "No reports in this view"
                          : view === "profiles"
                            ? "No listings in this view"
                            : "No moderation actions yet"
                    }
                    text={
                      search
                        ? "Try another name or keyword, or clear the search to see all records."
                        : view === "reports"
                          ? "Try a different status. New reports will appear when a member submits a concern."
                          : view === "profiles"
                            ? "Try another type or visibility filter. Member profiles appear after their owners choose to list them publicly."
                            : "Report reviews and listing visibility changes will be recorded here."
                    }
                  />
                )}
                {directory.data && !directory.loading && !directory.error && (
                  <Pagination data={directory.data} onPage={setPage} />
                )}
              </section>
            </>
          )}
        </main>
      </div>
      <Sheet
        open={!!detail}
        onOpenChange={(open) => {
          if (!open && !busy) setDetail(null);
        }}
      >
        <SheetContent
          className="admin-drawer"
          onEscapeKeyDown={(event) => {
            if (busy) event.preventDefault();
          }}
          onInteractOutside={(event) => {
            if (busy) event.preventDefault();
          }}
        >
          <SheetHeader>
            <SheetTitle>
              {detail?.type === "report" ? "Review report" : "Listing details"}
            </SheetTitle>
            <SheetDescription>
              {detail?.type === "report"
                ? "Review the submitted concern and record your decision. Report details are private."
                : "Review the member’s public content and current visibility before taking action."}
            </SheetDescription>
          </SheetHeader>
          <div className="admin-drawer-scroll">
            {detail?.type === "report" ? (
              <>
                <section className="admin-detail-section">
                  <Status status={detail.record.status} />
                  <h3 style={{ marginTop: 16 }}>
                    {detail.record.target?.name || "Unavailable listing"}
                  </h3>
                  <h4>Reported concern</h4>
                  <p>{detail.record.reason}</p>
                  {detail.record.details && (
                    <>
                      <h4>Member’s details</h4>
                      <p>{detail.record.details}</p>
                    </>
                  )}
                  <dl className="admin-detail-facts">
                    <div>
                      <dt>Submitted</dt>
                      <dd>{time(detail.record.created)}</dd>
                    </div>
                    <div>
                      <dt>Last updated</dt>
                      <dd>{time(detail.record.updated)}</dd>
                    </div>
                  </dl>
                  <p className="admin-detail-note">
                    <CircleAlert size={14} aria-hidden="true" />
                    {detail.record.target
                      ? "A reported concern has not been independently confirmed. Review the listing before deciding what to do."
                      : "The target profile is not currently listed. Its private content is not available here. You can still record a report review."}
                  </p>
                  {detail.record.target && (
                    <div className="admin-detail-actions">
                      <button
                        className="admin-btn"
                        onClick={() => detail.record.target && openProfile(detail.record.target, detail.record)}
                      >
                        Review listing
                        <ArrowUpRight />
                      </button>
                    </div>
                  )}
                </section>
                <section className="admin-detail-section">
                  <h3>Your review</h3>
                  <p>
                    Choose a status and explain the decision. This note stays in
                    the operator record and activity log.
                  </p>
                  <div className="admin-field">
                    <label htmlFor="admin-review-status">Status</label>
                    <select
                      id="admin-review-status"
                      value={reviewStatus}
                      disabled={busy}
                      onChange={(event) => {
                        const nextStatus = event.target.value as ReportStatus;
                        setReviewStatus(nextStatus);
                        if (detail?.type === "report")
                          setReviewDrafts((drafts) => ({
                            ...drafts,
                            [detail.record.id]: {
                              note: reviewNote,
                              status: nextStatus,
                            },
                          }));
                      }}
                    >
                      {reportStatuses.map((item) => (
                        <option key={item} value={item}>
                          {labels[item]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="admin-field">
                    <label htmlFor="admin-review-note">
                      Review note<span aria-label="required">*</span>
                    </label>
                    <textarea
                      id="admin-review-note"
                      value={reviewNote}
                      onChange={(event) => {
                        const note = event.target.value;
                        setReviewNote(note);
                        if (detail?.type === "report")
                          setReviewDrafts((drafts) => ({
                            ...drafts,
                            [detail.record.id]: { note, status: reviewStatus },
                          }));
                      }}
                      minLength={10}
                      maxLength={1000}
                      required
                      disabled={busy}
                      aria-describedby="admin-review-help"
                    />
                    <div className="admin-field-help" id="admin-review-help">
                      <span>
                        10–1,000 characters. Do not include confidential
                        information.
                      </span>
                      <span>{reviewNote.length}/1,000</span>
                    </div>
                  </div>
                  {mutationError && (
                    <p className="admin-field-error" role="alert">
                      {mutationError}
                    </p>
                  )}
                  <div className="admin-detail-actions">
                    <button
                      className="admin-btn admin-btn-primary"
                      disabled={
                        busy ||
                        reviewNote.trim().length < 10 ||
                        mutationStatus === 409
                      }
                      onClick={() =>
                        save({
                          action: "reviewReport",
                          reportId: detail.record.id,
                          status: reviewStatus,
                          operatorNote: reviewNote.trim(),
                          expectedVersion: detail.record.version,
                        })
                      }
                    >
                      {busy ? "Saving review…" : "Save review"}
                      <Check />
                    </button>
                    {mutationStatus === 409 && (
                      <button
                        className="admin-btn"
                        onClick={() => {
                          setDetail(null);
                          setRefresh((value) => value + 1);
                        }}
                      >
                        Reload latest records
                        <RefreshCw />
                      </button>
                    )}
                  </div>
                </section>
              </>
            ) : detail?.type === "profile" ? (
              <>
              {sourceReport && <button className="admin-btn admin-review-back" onClick={() => openReport(sourceReport)}><ArrowLeft aria-hidden="true" />Back to report</button>}
              <ProfileReview
                key={detail.record.id}
                profileId={detail.record.id}
                refresh={refresh}
                onModerate={(record) => {
                  setModerate(record);
                  setReason("");
                  setReasonPreset("");
                  setMutationError("");
                  setMutationStatus(0);
                }}
                onAccessError={setAccessError}
              />
              </>
            ) : null}
          </div>
        </SheetContent>
      </Sheet>
      <Dialog
        open={!!moderate}
        onOpenChange={(open) => {
          if (!open && !busy) setModerate(null);
        }}
      >
        <DialogContent
          className="admin-confirm"
          onEscapeKeyDown={(event) => {
            if (busy) event.preventDefault();
          }}
          onInteractOutside={(event) => {
            if (busy) event.preventDefault();
          }}
        >
          <DialogTitle>
            {moderate?.hidden
              ? moderate.ownerListed
                ? "Restore this listing?"
                : "Lift this restriction?"
              : "Remove this listing?"}
          </DialogTitle>
          <DialogDescription>
            {moderate?.hidden
              ? moderate.ownerListed
                ? `${moderate.name} will be available again while its owner keeps it listed. Explain why you are restoring it.`
                : "The operator restriction will be lifted. The profile remains private until its owner chooses to list it. Explain why you are lifting the restriction."
              : `${moderate?.name || "This listing"} will be removed from public discovery and direct access. Its owner can still edit it, but cannot make it visible again until you restore it.`}
          </DialogDescription>
          <div className="admin-field">
            <label htmlFor="admin-reason-preset">Reason starting point</label>
            <select id="admin-reason-preset" value={reasonPreset} disabled={busy} onChange={(event) => {
              const value = event.target.value;
              setReasonPreset(value);
              const presets = moderate?.hidden ? restorationReasons : removalReasons;
              setReason(presets.find(([id]) => id === value)?.[2] || "");
            }}>
              <option value="">Write your own reason</option>
              {(moderate?.hidden ? restorationReasons : removalReasons).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
            </select>
          </div>
          <div className="admin-field">
            <label htmlFor="admin-moderation-reason">
              Reason shown to the owner<span aria-label="required">*</span>
            </label>
            <textarea
              id="admin-moderation-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              required
              minLength={10}
              maxLength={500}
              disabled={busy}
              aria-describedby="admin-moderation-help"
            />
            <div className="admin-field-help" id="admin-moderation-help">
              <span>
                10–500 characters. The profile owner can see this reason. It is
                also saved in the activity log.
              </span>
              <span>{reason.length}/500</span>
            </div>
          </div>
          {mutationError && (
            <p className="admin-field-error" role="alert">
              {mutationError}
            </p>
          )}
          <p className="admin-detail-note">
            Keep confidential report details and reporter information out of
            this reason. The profile and account are retained. No email or
            message is sent.
          </p>
          <div className="admin-confirm-actions">
            <button
              className="admin-btn"
              disabled={busy}
              onClick={() => setModerate(null)}
            >
              Cancel
            </button>
            <button
              className={`admin-btn ${moderate?.hidden ? "admin-btn-primary" : "admin-btn-caution"}`}
              disabled={
                busy || reason.trim().length < 10 || mutationStatus === 409
              }
              onClick={() =>
                moderate &&
                save({
                  action: "moderateProfile",
                  profileId: moderate.id,
                  hidden: !moderate.hidden,
                  reason: reason.trim(),
                  expectedVersion: moderate.version,
                })
              }
            >
              {busy
                ? "Saving…"
                : moderate?.hidden
                  ? moderate.ownerListed
                    ? "Restore listing"
                    : "Lift restriction"
                  : "Remove listing"}
            </button>
          </div>
          {mutationStatus === 409 && (
            <button
              className="admin-btn"
              onClick={() => {
                setModerate(null);
                setDetail(null);
                setRefresh((value) => value + 1);
              }}
            >
              Reload latest records
              <RefreshCw />
            </button>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
function ProfileReview({ profileId, refresh, onModerate, onAccessError }: {
  profileId: string;
  refresh: number;
  onModerate: (profile: AdminProfile) => void;
  onAccessError: (error: { status: number; error: string }) => void;
}) {
  const [retry, setRetry] = useState(0);
  const profile = useAdminResource<AdminProfileDetail>(
    new URLSearchParams({ view: "profile", profileId }).toString(), refresh + retry,
  );
  useEffect(() => {
    if (profile.status === 401 || profile.status === 403)
      onAccessError({ status: profile.status, error: profile.error });
  }, [profile.status, profile.error, onAccessError]);
  if (profile.loading) return <Loading />;
  if (profile.error) return <ErrorNotice message={profile.status === 404 ? "This listing is no longer available for review. Its owner may have made it private." : profile.error} onRetry={() => setRetry((value) => value + 1)} />;
  const record = profile.data;
  if (!record || record.id !== profileId) return null;
  const founder = record.kind === "startup";
  const sections = [
    [founder ? "Ideology" : "Investment interests", record.ideology],
    [founder ? "Proposed solution" : "Investment approach", record.proposedSolution],
    [founder ? "What the founder has learned" : "What the investor looks for", record.learning],
    [founder ? "Next step" : "Additional information", record.nextExperiment],
  ];
  return <>
    <section className="admin-detail-section">
      <div className="admin-review-badges">
        <Badge tone={record.hidden ? "warning" : "success"}>{record.hidden ? <EyeOff /> : <Eye />}{record.hidden ? "Removed from discovery" : "Visible in discovery"}</Badge>
        {!record.redacted && <Badge>{founder ? "Founder idea" : "Investor profile"}</Badge>}
      </div>
      <h3 className="admin-review-name">{record.name}</h3>
      {record.tagline && <p>{record.tagline}</p>}
      {record.redacted ? <p className="admin-detail-note"><LockKeyhole size={14} aria-hidden="true" />The owner has made this profile private. Only its restriction record is shown. Restoring it will leave the profile private.</p> : <>
        <dl className="admin-detail-facts">
          {[["Member name", record.founder], ["Sector", record.sector], ["Stage", record.stage], ["Location", record.city], ["Profile updated", time(record.updated)]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || "Not shared"}</dd></div>)}
        </dl>
        <p className="admin-detail-note">Member-reported content. A public listing is not independent verification of its claims.</p>
      </>}
    </section>
    {!record.redacted && <>
      <section className="admin-detail-section">
        <h3>{founder ? "Read the idea" : "Review the investor profile"}</h3>
        {sections.filter(([, value]) => value).length ? sections.filter(([, value]) => value).map(([label, value]) => <div className="admin-public-copy" key={label}><h4>{label}</h4><p>{value}</p></div>) : <p>No additional public details were shared.</p>}
      </section>
      <section className="admin-detail-section">
        <h3>Recent public progress</h3>
        {record.progress.length ? <ol className="admin-progress-list">{record.progress.map((item) => <li key={item.id}><time dateTime={item.date}>{time(item.date)}</time><h4>{item.title}</h4><p>{item.body}</p></li>)}</ol> : <p>No public progress updates have been shared.</p>}
        {record.progress.length === 20 && <p className="admin-detail-note">Showing the 20 most recent public updates.</p>}
      </section>
    </>}
    <section className="admin-detail-section">
      <h3>Listing controls</h3>
      <p>{record.hidden ? record.ownerListed ? "This listing is removed. Restore it after reviewing the content and the reason for removal." : "Lift this restriction to allow the owner to list the profile again. The profile will remain private until they choose to share it." : "Remove this listing if its content is unsuitable. This removes discovery and direct public access; the profile and account are retained."}</p>
      {record.moderationReason && <><h4>Last moderation reason</h4><p>{record.moderationReason}</p><p className="admin-row-meta">{time(record.moderationUpdated)}</p></>}
      <div className="admin-detail-actions">
        <button className={`admin-btn ${record.hidden ? "admin-btn-primary" : "admin-btn-caution"}`} onClick={() => onModerate(record)}>{record.hidden ? <Eye /> : <EyeOff />}{record.hidden ? record.ownerListed ? "Restore listing" : "Lift restriction" : "Remove listing"}</button>
        {!record.hidden && record.ownerListed && <a className="admin-btn" href={`/app?profile=${encodeURIComponent(record.id)}#discover`} target="_blank" rel="noreferrer">Open public profile<ArrowUpRight /></a>}
      </div>
      <p className="admin-detail-note">A reason and confirmation are required. The owner can read the reason in their workspace. Every change is recorded in Activity; these actions do not send an email.</p>
    </section>
  </>;
}
function ErrorNotice({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="admin-feedback admin-feedback-error" role="alert">
      <CircleAlert size={17} aria-hidden="true" />
      <div>
        <strong>Unable to load data</strong>
        <p>{message}</p>
      </div>
      <button className="admin-btn" onClick={onRetry}>
        Try again
        <RefreshCw />
      </button>
    </div>
  );
}
function Metric({
  label,
  value,
  help,
  icon: Icon,
  accent = false,
}: {
  label: string;
  value: number;
  help: string;
  icon: typeof Flag;
  accent?: boolean;
}) {
  return (
    <section className={`admin-metric ${accent ? "admin-metric-accent" : ""}`}>
      <div className="admin-metric-top">
        <span>{label}</span>
        <Icon aria-hidden="true" />
      </div>
      <strong className="admin-metric-value">{count(value)}</strong>
      <p>{help}</p>
    </section>
  );
}
function Configuration({
  configuration: config,
}: {
  configuration: AdminOverview["configuration"];
}) {
  const items: {
    label: string;
    help: string;
    value: string;
    tone: "success" | "warning" | "info";
  }[] = [
    {
      label: "Owner access",
      help: "Access is granted by the server’s configured Clerk account ID.",
      value: config.adminConfigured ? "Configured" : "Not configured",
      tone: config.adminConfigured ? "success" : "warning",
    },
    {
      label: "Authentication",
      help:
        config.clerkMode === "development"
          ? "Clerk is using development keys. A production instance and domain are still required for launch."
          : "Clerk session verification is enforced by the server.",
      value:
        config.clerkMode === "development"
          ? "Development"
          : config.clerkMode === "production"
            ? "Production"
            : "Not configured",
      tone: config.clerkMode === "production" ? "success" : "warning",
    },
    {
      label: "Application origin",
      help: "The origin is used by server authentication checks.",
      value: config.originConfigured ? "Configured" : "Not configured",
      tone: config.originConfigured ? "success" : "warning",
    },
    {
      label: "Email delivery",
      help: "Checks required settings only. A real delivery test is needed to confirm operation; moderation actions do not send email.",
      value: config.emailActive ? "Settings present" : "Setup incomplete",
      tone: config.emailActive ? "success" : "warning",
    },
    {
      label: "Email provider",
      help: "Provider credentials are checked for presence and are never shown here.",
      value: config.emailProviderConfigured ? "Configured" : "Not configured",
      tone: config.emailProviderConfigured ? "success" : "warning",
    },
    {
      label: "Email sender",
      help: "Presence of a sender does not confirm successful delivery or domain verification.",
      value: config.emailSenderConfigured ? "Configured" : "Not configured",
      tone: config.emailSenderConfigured ? "success" : "warning",
    },
    {
      label: "Email scheduler secret",
      help: "Presence does not confirm that the scheduled Worker has been deployed or is running.",
      value: config.emailAutomationConfigured ? "Present" : "Not configured",
      tone: config.emailAutomationConfigured ? "info" : "warning",
    },
    {
      label: "Delivery receipt secret",
      help: "Presence does not confirm the provider webhook is registered or delivering signed events.",
      value: config.emailReceiptsConfigured ? "Present" : "Not configured",
      tone: config.emailReceiptsConfigured ? "info" : "warning",
    },
  ];
  return (
    <section className="admin-panel">
      <div className="admin-panel-heading">
        <div>
          <h2>Runtime status</h2>
          <p>Configuration checks, without exposing credentials.</p>
        </div>
        <Badge>
          <LockKeyhole />
          Read only
        </Badge>
      </div>
      <p className="admin-config-intro">
        To change credentials, owner access or delivery settings, update the
        deployment’s secure configuration. These checks do not verify provider
        availability, delivery, backups or production readiness.
      </p>
      <dl className="admin-config-list">
        {items.map((item) => (
          <div className="admin-config-row" key={item.label}>
            <dt>
              {item.label}
              <small>{item.help}</small>
            </dt>
            <dd>
              <Badge tone={item.tone}>{item.value}</Badge>
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

const emailStateLabels: Record<AdminEmailState, string> = {
  all: "All states", pending: "Queued", retry: "Waiting to retry", sending: "Sending",
  submitted: "Accepted by provider", delivered: "Accepted by recipient server", delayed: "Delivery delayed",
  bounced: "Bounced", complained: "Reported as unwanted", suppressed: "Blocked by provider",
  failed: "Attempts stopped", expired: "Retry window ended", skipped: "Stopped before sending",
};
const emailKindLabels: Record<string, string> = { introduction: "Introduction", response: "Introduction response", message: "Message", proposal: "Proposal", decision: "Proposal response", legacy: "Earlier notification" };
function EmailOperationsView({ refresh }: { refresh: number }) {
  const [state, setState] = useState<AdminEmailState>("all");
  const [retryKey, setRetryKey] = useState(0);
  const [page, setPage] = useState(1);
  const emails = useAdminResource<AdminEmailOperations>(new URLSearchParams({ view: "emails", page: String(page), emailState: state }).toString(), refresh + retryKey);
  return <>
    <div className="admin-toolbar admin-email-filter">
      <div className="admin-select-wrap">
        <label htmlFor="admin-email-state">Delivery state</label>
        <select id="admin-email-state" value={state} onChange={(event) => { setState(event.target.value as AdminEmailState); setPage(1); }}>
          {adminEmailStates.map(value => <option value={value} key={value}>{emailStateLabels[value]}</option>)}
        </select>
      </div>
      <Badge><LockKeyhole aria-hidden="true" /> Read only</Badge>
    </div>
    {emails.loading && !emails.data ? <Loading /> : emails.error ? <ErrorNotice message={emails.error} onRetry={() => setRetryKey(value => value + 1)} /> : emails.data ? <EmailOperationsPanel data={emails.data} onPage={setPage} /> : null}
  </>;
}
// Pure presentation is shared by the authenticated view and isolated SSR checks.
export function EmailOperationsPanel({ data, onPage }: { data: AdminEmailOperations; onPage: (page: number) => void }) {
  return <div className="admin-email-operations">
    {data.alert ? <div className="admin-feedback admin-feedback-error" role="status"><CircleAlert aria-hidden="true" />
      <p><strong>Queue needs attention.</strong> The oldest queued, retrying or in-progress notification was created {Math.floor((data.queueAgeSeconds ?? 0) / 60)} minutes ago. Review the dispatcher and provider logs. This warning appears in this portal; it does not send an alert.</p>
    </div> : null}
    {data.queueAgeSeconds === null ? <p className="admin-feedback admin-feedback-error" role="status">Waiting age is unavailable. Review dispatcher logs; queue health cannot be confirmed.</p> : null}
    <div className="admin-metrics">
      <Metric label="Waiting or in progress" value={data.backlog} help={`${count(data.retrying)} waiting to retry · ${count(data.sending)} sending`} icon={Mail} accent={!!data.alert} />
      <Metric label="Accepted by recipient server" value={data.delivered} help="A delivery receipt does not confirm inbox placement or reading." icon={Check} />
      <Metric label="Attempts stopped" value={data.failed} help="Failed or expired; delivery may be unconfirmed." icon={CircleAlert} accent={data.failed > 0} />
      <Metric label="Bounced or blocked" value={data.bounced + data.complained + data.suppressed} help={`${count(data.bounced)} bounced · ${count(data.complained)} unwanted · ${count(data.suppressed)} provider-blocked`} icon={EyeOff} />
    </div>
    <section className="admin-panel">
      <div className="admin-panel-heading"><div><h2>Notification delivery history</h2><p>Counts above cover this environment. The state filter applies to the history below.</p></div><Badge>{count(data.records.total)} records</Badge></div>
      <p className="admin-config-intro">Waiting age: {data.queueAgeSeconds === null ? "Unavailable" : data.backlog ? `${Math.floor((data.queueAgeSeconds ?? 0) / 60)} minutes` : "No waiting notifications"}. Provider accepted: {count(data.submitted)}. Retries run automatically within the original consent, attempt and time limits. Recipient addresses and private message contents are hidden.</p>
      {data.records.items.length === 0 ? <Empty title="No matching email records" text="Try another delivery state. Records appear after eligible member activity." /> : <ul className="admin-list">
        {data.records.items.map(item => <li className="admin-list-row admin-email-row" key={item.notificationId}>
          <div><h3 className="admin-row-title">{Object.hasOwn(emailKindLabels, item.kind) ? emailKindLabels[item.kind] : "Notification"}</h3>
            <div className="admin-row-meta"><code>{item.notificationId}</code></div>
            <div className="admin-row-meta">Attempts: {count(item.attempts)} · Updated: {time(item.updated)}</div>
            {item.state === "retry" && item.nextAttemptAt ? <p className="admin-row-meta">Next eligible attempt: {time(item.nextAttemptAt)}</p> : null}
            {item.eventAt ? <p className="admin-row-meta">Latest provider event: {time(item.eventAt)}</p> : null}
            {item.lastError ? <p className="admin-row-excerpt">{item.lastError}</p> : null}
          </div>
          <Badge tone={item.state === "delivered" ? "success" : ["failed", "expired", "bounced", "complained", "suppressed"].includes(item.state) ? "warning" : "info"}>
            {Object.hasOwn(emailStateLabels, item.state) ? emailStateLabels[item.state as AdminEmailState] : "Unrecognized state"}
          </Badge>
        </li>)}
      </ul>}
      <Pagination data={data.records} onPage={onPage} />
    </section>
  </div>;
}
