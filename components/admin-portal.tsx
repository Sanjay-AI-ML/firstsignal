"use client";

import { useEffect, useReducer, useState } from "react";
import Link from "next/link";
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
  AdminOverview,
  AdminPage,
  AdminProfile,
  AdminReport,
  ReportStatus,
} from "@/lib/admin-types";
import { reportStatuses } from "@/lib/admin-types";
import "@/app/admin/admin.css";

type View = "overview" | "reports" | "profiles" | "audit" | "settings";
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
    "Public listings",
    "Review member-listed profiles. Hiding a listing is reversible and requires a reason.",
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
  { id: "audit", label: "Activity", icon: History },
  { id: "settings", label: "Settings", icon: Settings2 },
] as const;
const count = (value: number) => new Intl.NumberFormat("en-IN").format(value);
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
  data: Directory;
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
        <span className="admin-row-avatar" aria-hidden="true">
          {profile.name
            .split(/\s+/)
            .slice(0, 2)
            .map((word) => word[0])
            .join("")}
        </span>
        <div>
          <h3 className="admin-row-title">
            <button onClick={onOpen}>{profile.name}</button>
          </h3>
          <div className="admin-row-meta">
            <Badge tone={profile.hidden ? "warning" : "success"}>
              {profile.hidden ? <EyeOff /> : <Eye />}
              {profile.hidden ? "Operator restriction" : "Listed"}
            </Badge>
            {profile.ownerListed ? (
              <>
                <span>
                  {profile.kind === "startup" ? "Founder" : "Investor"}
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
      ? "Listing hidden"
      : item.action === "profile_restored"
        ? "Listing restored"
        : "Report updated";
  return (
    <li className="admin-audit-row">
      <span className="admin-audit-icon" aria-hidden="true">
        {item.action === "profile_hidden" ? (
          <EyeOff />
        ) : item.action === "profile_restored" ? (
          <Eye />
        ) : (
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
  const [refresh, setRefresh] = useState(0);
  const [detail, setDetail] = useState<
    | { type: "report"; record: AdminReport }
    | { type: "profile"; record: AdminProfile }
    | null
  >(null);
  const [moderate, setModerate] = useState<AdminProfile | null>(null);
  const [reason, setReason] = useState("");
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
    page: String(view === "overview" || view === "settings" ? 1 : page),
  });
  if (view !== "overview" && view !== "settings" && search)
    params.set("q", search);
  if (directoryView === "reports")
    params.set(
      "status",
      view === "overview" || view === "settings" ? "submitted" : status,
    );
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
    setReviewStatus(
      draft?.status ||
        (record.status === "submitted" ? "reviewing" : record.status),
    );
    setReviewNote(draft?.note ?? record.operatorNote ?? "");
    setMutationError("");
    setMutationStatus(0);
  }
  function openProfile(record: AdminProfile) {
    setDetail({ type: "profile", record });
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
      setPage(1);
      if (action.action === "reviewReport")
        setReviewDrafts((drafts) => {
          const next = { ...drafts };
          delete next[action.reportId];
          return next;
        });
      setNotice(
        action.action === "moderateProfile"
          ? action.hidden
            ? "Listing hidden. The profile owner can see the reason, and it is recorded in the activity log."
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
            href={fatal.status === 401 ? "/signin?return_to=%2Fadmin" : "/app"}
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
                        label="Hidden listings"
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
                                  Hide a problematic listing while reviewing it.
                                  Restore it when appropriate.
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
                            ? "Public listings and active restriction records. Private content and fictional examples are excluded."
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
                            ? "No public listings yet"
                            : "No moderation actions yet"
                    }
                    text={
                      search
                        ? "Try another name or keyword, or clear the search to see all records."
                        : view === "reports"
                          ? "Try a different status. New reports will appear when a member submits a concern."
                          : view === "profiles"
                            ? "Member profiles appear here after their owners choose to list them publicly."
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
                : "A summary of information this member chose to list publicly."}
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
                  {detail.record.target && !detail.record.target.hidden && (
                    <div className="admin-detail-actions">
                      <a
                        className="admin-btn"
                        href={`/app?profile=${encodeURIComponent(detail.record.target.id)}#discover`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        View in workspace
                        <ArrowUpRight />
                      </a>
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
                <section className="admin-detail-section">
                  <Badge tone={detail.record.hidden ? "warning" : "success"}>
                    {detail.record.hidden ? <EyeOff /> : <Eye />}
                    {detail.record.hidden ? "Hidden by operator" : "Listed"}
                  </Badge>
                  <h3 style={{ fontSize: "1.25rem", marginTop: 17 }}>
                    {detail.record.name}
                  </h3>
                  <p>{detail.record.tagline}</p>
                  {detail.record.ownerListed ? (
                    <dl className="admin-detail-facts">
                      {[
                        [
                          "Profile type",
                          detail.record.kind === "startup"
                            ? "Founder"
                            : "Investor",
                        ],
                        ["Member name", detail.record.founder],
                        ["Sector", detail.record.sector],
                        ["Stage", detail.record.stage],
                        ["Location", detail.record.city],
                        ["Profile updated", time(detail.record.updated)],
                      ].map(([label, value]) => (
                        <div key={label}>
                          <dt>{label}</dt>
                          <dd>{value || "Not shared"}</dd>
                        </div>
                      ))}
                    </dl>
                  ) : (
                    <p className="admin-detail-note">
                      Owner unlisted. Private profile content is not read or
                      shown here.
                    </p>
                  )}
                  {detail.record.ownerListed && !detail.record.hidden && (
                    <div className="admin-detail-actions">
                      <a
                        className="admin-btn"
                        href={`/app?profile=${encodeURIComponent(detail.record.id)}#discover`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Open public profile
                        <ArrowUpRight />
                      </a>
                    </div>
                  )}
                </section>
                <section className="admin-detail-section">
                  <h3>Listing visibility</h3>
                  <p>
                    {detail.record.hidden
                      ? detail.record.ownerListed
                        ? "This listing is hidden by the operator. Restoring it makes it available again while its owner keeps it listed."
                        : "The profile owner has unlisted this profile. Lifting the operator restriction will leave it private and remove this restriction record from the directory."
                      : "Hiding removes this listing from public discovery and direct public access. It does not delete the profile or its account."}
                  </p>
                  {detail.record.moderationReason && (
                    <>
                      <h4>Last operator reason</h4>
                      <p>{detail.record.moderationReason}</p>
                      <p className="admin-row-meta">
                        {time(detail.record.moderationUpdated)}
                      </p>
                    </>
                  )}
                  <div className="admin-detail-actions">
                    <button
                      className={`admin-btn ${detail.record.hidden ? "admin-btn-primary" : "admin-btn-caution"}`}
                      onClick={() => {
                        setModerate(detail.record);
                        setReason("");
                        setMutationError("");
                        setMutationStatus(0);
                      }}
                    >
                      {detail.record.hidden ? <Eye /> : <EyeOff />}
                      {detail.record.hidden
                        ? detail.record.ownerListed
                          ? "Restore listing"
                          : "Lift restriction"
                        : "Hide listing"}
                    </button>
                  </div>
                  <p className="admin-detail-note">
                    This action is reversible and will be recorded. No
                    notification is sent to the member.
                  </p>
                </section>
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
              : "Hide this listing?"}
          </DialogTitle>
          <DialogDescription>
            {moderate?.hidden
              ? moderate.ownerListed
                ? `${moderate.name} will be available again while its owner keeps it listed. Explain why you are restoring it.`
                : "The operator restriction will be lifted. The profile remains private until its owner chooses to list it. Explain why you are lifting the restriction."
              : `${moderate?.name || "This listing"} will be removed from public discovery and direct access. Explain why you are hiding it.`}
          </DialogDescription>
          <div className="admin-field">
            <label htmlFor="admin-moderation-reason">
              Reason<span aria-label="required">*</span>
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
                  : "Hide listing"}
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
      help: "These moderation actions do not send email. Member notifications require a configured provider and sender.",
      value: config.emailActive ? "Enabled" : "Inactive",
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
