import {
  Activity,
  Archive,
  Bell,
  BrainCircuit,
  BriefcaseBusiness,
  ChevronDown,
  CircleHelp,
  Database,
  FileSearch,
  FileText,
  Fingerprint,
  Gauge,
  GitBranch,
  Layers3,
  LogOut,
  Menu,
  Network,
  Plus,
  Search,
  Settings2,
  Shield,
  ShieldAlert,
  Target,
  UserRound,
  X,
} from "lucide-react";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { fetchWorkspaceIdentity, type WorkspaceIdentity } from "@/lib/deeptrace";
import { Button } from "@/components/ui/button";

type SessionStatus =
  | "initializing"
  | "checking-auth"
  | "loading-profile"
  | "resolving-workspace"
  | "ready"
  | "unauthenticated"
  | "no-workspace"
  | "error";

type SessionState = {
  status: SessionStatus;
  user: { id: string; email?: string | undefined } | null;
  identity: WorkspaceIdentity | null;
  error: string | null;
};

type SessionContextValue = SessionState & { retry: () => void };

const SESSION_OPERATION_TIMEOUT_MS = 15_000;

const SessionContext = createContext<SessionContextValue>({
  status: "initializing",
  user: null,
  identity: null,
  error: null,
  retry: () => {},
});

export function useDeepTraceSession() {
  return useContext(SessionContext);
}

function withTimeout<T>(promise: PromiseLike<T>, operation: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${operation} did not respond. Check your connection and retry.`));
    }, SESSION_OPERATION_TIMEOUT_MS);

    Promise.resolve(promise).then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

function isExpiredSessionError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "status" in error && error.status === 401;
}

function initializationErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }
  return "Workspace access could not be loaded. Check your connection and retry.";
}

const navigation: {
  section: string;
  items: { label: string; to: string; icon: typeof Gauge }[];
}[] = [
  { section: "COMMAND CENTER", items: [{ label: "Command Center", to: "/", icon: Gauge }] },
  {
    section: "INVESTIGATIONS",
    items: [
      { label: "Cases", to: "/cases", icon: BriefcaseBusiness },
      { label: "New Investigation", to: "/cases/new", icon: Plus },
      { label: "Evidence Vault", to: "/evidence", icon: Archive },
    ],
  },
  {
    section: "INTELLIGENCE",
    items: [
      { label: "Threat Graph", to: "/graph", icon: Network },
      { label: "Timeline", to: "/timeline", icon: Activity },
      { label: "Campaign Intelligence", to: "/campaigns", icon: Layers3 },
      { label: "Investigation Copilot", to: "/copilot", icon: BrainCircuit },
      { label: "ATT&CK Intelligence", to: "/attack", icon: ShieldAlert },
    ],
  },
  {
    section: "REPORTING",
    items: [
      { label: "Findings", to: "/findings", icon: FileSearch },
      { label: "Reports", to: "/reports", icon: FileText },
    ],
  },
  {
    section: "SYSTEM",
    items: [
      { label: "Data Sources", to: "/data-sources", icon: Database },
      { label: "Audit Log", to: "/audit-log", icon: Fingerprint },
      { label: "Settings", to: "/settings", icon: Settings2 },
    ],
  },
];

export function DeepTraceShell({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<SessionState>({
    status: "initializing",
    user: null,
    identity: null,
    error: null,
  });
  const [retryCount, setRetryCount] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  useEffect(() => {
    let alive = true;
    let revision = 0;
    const identityRequests = new Map<string, Promise<WorkspaceIdentity | null>>();

    const loadIdentity = async (userId: string) => {
      const current = identityRequests.get(userId);
      if (current) return current;

      const request = withTimeout(fetchWorkspaceIdentity(userId), "Workspace membership lookup");
      identityRequests.set(userId, request);
      try {
        return await request;
      } finally {
        if (identityRequests.get(userId) === request) identityRequests.delete(userId);
      }
    };

    const resolveSession = async (
      authSession: Session | null | undefined,
      requestRevision: number,
    ) => {
      const isCurrent = () => alive && requestRevision === revision;

      try {
        let currentSession = authSession;
        if (currentSession === undefined) {
          setSession({ status: "checking-auth", user: null, identity: null, error: null });
          const result = await withTimeout(supabase.auth.getSession(), "Authentication check");
          if (result.error) throw result.error;
          currentSession = result.data.session;
        }

        if (!isCurrent()) return;
        if (!currentSession) {
          setSession({ status: "unauthenticated", user: null, identity: null, error: null });
          return;
        }

        const provisionalUser = {
          id: currentSession.user.id,
          email: currentSession.user.email,
        };
        setSession({
          status: "loading-profile",
          user: provisionalUser,
          identity: null,
          error: null,
        });
        const profile = await withTimeout(supabase.auth.getUser(), "Account profile lookup");
        if (!isCurrent()) return;
        if (profile.error) {
          if (isExpiredSessionError(profile.error)) {
            setSession({ status: "unauthenticated", user: null, identity: null, error: null });
          } else {
            setSession({
              status: "error",
              user: provisionalUser,
              identity: null,
              error: initializationErrorMessage(profile.error),
            });
          }
          return;
        }

        if (!profile.data.user) {
          setSession({ status: "unauthenticated", user: null, identity: null, error: null });
          return;
        }

        const user = { id: profile.data.user.id, email: profile.data.user.email };
        setSession({ status: "resolving-workspace", user, identity: null, error: null });
        const identity = await loadIdentity(user.id);
        if (!isCurrent()) return;
        if (!identity) {
          setSession({ status: "no-workspace", user, identity: null, error: null });
          return;
        }
        setSession({ status: "ready", user, identity, error: null });
      } catch (error) {
        if (isCurrent()) {
          setSession({
            status: "error",
            user: authSession?.user
              ? { id: authSession.user.id, email: authSession.user.email }
              : null,
            identity: null,
            error: initializationErrorMessage(error),
          });
        }
      }
    };

    const beginInitialization = (authSession?: Session | null) => {
      const requestRevision = ++revision;
      void resolveSession(authSession, requestRevision);
    };

    let unsubscribe = () => {};
    try {
      const { data: listener } = supabase.auth.onAuthStateChange((event, authSession) => {
        if (event === "INITIAL_SESSION") return;
        const requestRevision = ++revision;
        // Supabase auth callbacks run under its auth lock. Defer follow-up auth
        // requests until the callback has returned to avoid deadlocking that lock.
        setTimeout(() => {
          if (alive && requestRevision === revision)
            void resolveSession(authSession, requestRevision);
        }, 0);
      });
      unsubscribe = () => listener.subscription.unsubscribe();
      beginInitialization();
    } catch (error) {
      setSession({
        status: "error",
        user: null,
        identity: null,
        error: initializationErrorMessage(error),
      });
    }

    return () => {
      alive = false;
      revision++;
      unsubscribe();
    };
  }, [retryCount]);

  const retry = () => {
    setSession({ status: "initializing", user: null, identity: null, error: null });
    setRetryCount((count) => count + 1);
  };

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    await navigate({ to: "/auth", replace: true });
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void navigate({ to: "/cases", search: { q: globalSearch }, resetScroll: false });
  }

  return (
    <SessionContext.Provider value={{ ...session, retry }}>
      <div className="app-frame">
        {mobileOpen && (
          <button
            aria-label="Close navigation"
            className="nav-scrim"
            onClick={() => setMobileOpen(false)}
          />
        )}
        <aside className={`side-rail ${mobileOpen ? "side-rail-open" : ""}`}>
          <Link to="/" className="brand-lockup" onClick={() => setMobileOpen(false)}>
            <img className="brand-logo" src="/deeptrace-logo.png" alt="" aria-hidden="true" />
            <span>
              <strong>DEEPTRACE</strong>
              <small>TRACE THE EVIDENCE</small>
            </span>
          </Link>
          <div className="workspace-switcher">
            <span className="workspace-symbol">
              <Fingerprint size={17} />
            </span>
            <span className="workspace-copy">
              <small>WORKSPACE</small>
              <strong>{session.identity?.organizationName ?? "Workspace"}</strong>
            </span>
            <ChevronDown size={15} className="text-muted-foreground" />
          </div>
          <nav aria-label="Main navigation" className="side-navigation">
            {navigation.map((group) => (
              <section className="nav-group" key={group.section}>
                <p className="nav-section-label">{group.section}</p>
                {group.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={() => setMobileOpen(false)}
                      activeOptions={{ exact: item.to === "/" }}
                      activeProps={{ className: "nav-link nav-link-active" }}
                      className="nav-link"
                    >
                      <Icon size={16} strokeWidth={1.8} />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </section>
            ))}
          </nav>
          <div className="rail-bottom">
            <div className="connection-status">
              <span className="status-indicator" />
              {session.status === "ready"
                ? "CLOUD CONNECTED"
                : isInitializing(session.status)
                  ? "CHECKING SESSION"
                  : session.status === "error"
                    ? "CONNECTION ERROR"
                    : "SIGN IN REQUIRED"}
            </div>
            <div className="user-strip">
              <span className="user-avatar">
                {session.user?.email?.slice(0, 1).toUpperCase() ?? "D"}
              </span>
              <span className="user-details">
                <strong>{session.user?.email ?? "Investigator"}</strong>
                <small>
                  {session.identity?.role?.replaceAll("_", " ").toUpperCase() ?? "SECURE WORKSPACE"}
                </small>
              </span>
              {session.user ? (
                <Button
                  variant="ghost"
                  size="icon"
                  title="Sign out"
                  aria-label="Sign out"
                  onClick={() => void signOut()}
                >
                  <LogOut size={15} />
                </Button>
              ) : (
                <Link to="/auth" aria-label="Sign in" title="Sign in" className="rail-user-action">
                  <UserRound size={15} />
                </Link>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="mobile-close"
            aria-label="Close navigation"
            onClick={() => setMobileOpen(false)}
          >
            <X size={18} />
          </Button>
        </aside>
        <div className="main-column">
          <header className="top-bar">
            <div className="top-leading">
              <Button
                variant="ghost"
                size="icon"
                className="mobile-menu"
                aria-label="Open navigation"
                onClick={() => setMobileOpen(true)}
              >
                <Menu size={18} />
              </Button>
              <span className="breadcrumb-root">WORKSPACE</span>
              <span className="breadcrumb-separator">/</span>
              <span className="breadcrumb-current">{getPageLabel(location.pathname)}</span>
            </div>
            <form className="global-search" onSubmit={submitSearch} role="search">
              <Search size={15} />
              <input
                aria-label="Search investigations"
                placeholder="Search investigations…"
                value={globalSearch}
                onChange={(event) => setGlobalSearch(event.target.value)}
              />
              <kbd>↵</kbd>
            </form>
            <div className="top-actions">
              <span className="secure-chip">
                <span />
                SECURE
              </span>
              <Button variant="ghost" size="icon" aria-label="Notifications" title="Notifications">
                <Bell size={17} />
              </Button>
              <Link
                to="/auth"
                className="top-user"
                aria-label={session.user ? "Account" : "Sign in"}
              >
                <UserRound size={16} />
              </Link>
            </div>
          </header>
          <main className="main-content">{children}</main>
          <footer className="app-footer">
            <span>
              <Shield size={13} /> PRIVATE INVESTIGATION WORKSPACE
            </span>
            <span>TRACE THE EVIDENCE · UNCOVER THE CAMPAIGN</span>
          </footer>
        </div>
      </div>
    </SessionContext.Provider>
  );
}

export function DeepTraceRoute({ children }: { children: ReactNode }) {
  const location = useLocation();
  return location.pathname === "/auth" ? (
    <>{children}</>
  ) : (
    <DeepTraceShell>{children}</DeepTraceShell>
  );
}

function getPageLabel(path: string) {
  const exact = navigation.flatMap((group) => group.items).find((item) => item.to === path);
  if (exact) return exact.label.toUpperCase();
  if (path.startsWith("/cases/"))
    return path.endsWith("/new") ? "NEW INVESTIGATION" : "CASE WORKSPACE";
  return (
    path.split("/").filter(Boolean).at(-1)?.replaceAll("-", " ").toUpperCase() ?? "COMMAND CENTER"
  );
}

export function WorkspaceGate({ children }: { children: ReactNode }) {
  const session = useDeepTraceSession();
  if (isInitializing(session.status)) {
    const message =
      session.status === "loading-profile"
        ? "Loading account profile…"
        : session.status === "resolving-workspace"
          ? "Resolving organization workspace…"
          : "Checking secure session…";
    return (
      <div className="state-panel">
        <span className="loading-mark" />
        <p>{message}</p>
      </div>
    );
  }
  if (session.status === "error")
    return (
      <div className="state-panel state-error">
        <ShieldAlert size={24} />
        <h2>Workspace access unavailable</h2>
        <p>{session.error}</p>
        <Button onClick={session.retry}>Retry workspace connection</Button>
      </div>
    );
  if (session.status === "unauthenticated")
    return (
      <div className="state-panel">
        <Shield size={25} />
        <p>Sign in to view organization records.</p>
        <Button asChild>
          <Link to="/auth">Continue to sign in</Link>
        </Button>
      </div>
    );
  if (session.status === "no-workspace")
    return (
      <div className="state-panel">
        <CircleHelp size={24} />
        <h2>Workspace not ready</h2>
        <p>
          Your account does not have an organization membership yet. Ask a workspace administrator
          to assign your role, then retry.
        </p>
        <Button onClick={session.retry}>Retry workspace check</Button>
      </div>
    );
  return <>{children}</>;
}

function isInitializing(status: SessionStatus) {
  return (
    status === "initializing" ||
    status === "checking-auth" ||
    status === "loading-profile" ||
    status === "resolving-workspace"
  );
}
