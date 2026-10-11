import {
  Activity, Archive, Bell, BookOpen, BrainCircuit, BriefcaseBusiness, Bug,
  ChevronDown, CircleHelp, Database, FileSearch, FileText, Fingerprint, Gauge,
  GitBranch, Layers3, LogOut, Menu, Network, Plus, Search, Settings2, Shield,
  ShieldAlert, Target, UserRound, X,
} from "lucide-react";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { fetchWorkspaceIdentity, type WorkspaceIdentity } from "@/lib/deeptrace";
import { Button } from "@/components/ui/button";

type SessionState = {
  status: "checking" | "signed-out" | "signed-in" | "error";
  user: { id: string; email?: string } | null;
  identity: WorkspaceIdentity | null;
  error: string | null;
};

const SessionContext = createContext<SessionState>({
  status: "checking", user: null, identity: null, error: null,
});

export function useDeepTraceSession() {
  return useContext(SessionContext);
}

const navigation = [
  { section: "COMMAND CENTER", items: [{ label: "Command Center", to: "/", icon: Gauge }] },
  { section: "INVESTIGATIONS", items: [
    { label: "Cases", to: "/cases", icon: BriefcaseBusiness },
    { label: "New Investigation", to: "/cases/new", icon: Plus },
    { label: "Evidence Vault", to: "/evidence", icon: Archive },
  ] },
  { section: "INTELLIGENCE", items: [
    { label: "Threat Graph", to: "/graph", icon: Network },
    { label: "Timeline", to: "/timeline", icon: Activity },
    { label: "Campaign Intelligence", to: "/campaigns", icon: Layers3 },
    { label: "Investigation Copilot", to: "/copilot", icon: BrainCircuit },
    { label: "ATT&CK Intelligence", to: "/attack", icon: ShieldAlert },
  ] },
  { section: "REPORTING", items: [
    { label: "Findings", to: "/findings", icon: FileSearch },
    { label: "Reports", to: "/reports", icon: FileText },
  ] },
  { section: "SYSTEM", items: [
    { label: "Data Sources", to: "/data-sources", icon: Database },
    { label: "Audit Log", to: "/audit-log", icon: Fingerprint },
    { label: "Settings", to: "/settings", icon: Settings2 },
  ] },
] as const;

export function DeepTraceShell({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<SessionState>({ status: "checking", user: null, identity: null, error: null });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    let alive = true;
    const update = async (user: { id: string; email?: string } | null) => {
      if (!user) {
        if (alive) setSession({ status: "signed-out", user: null, identity: null, error: null });
        return;
      }
      try {
        const identity = await fetchWorkspaceIdentity(user.id);
        if (alive) setSession({ status: "signed-in", user, identity, error: null });
      } catch (error) {
        if (alive) setSession({ status: "error", user, identity: null, error: error instanceof Error ? error.message : "Workspace access could not be loaded." });
      }
    };
    void supabase.auth.getUser().then(({ data, error }) => {
      if (error) {
        if (alive) setSession({ status: "signed-out", user: null, identity: null, error: null });
        return;
      }
      const currentUser = data.user ? { id: data.user.id, email: data.user.email } : null;
      void update(currentUser);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      const currentUser = currentSession?.user ? { id: currentSession.user.id, email: currentSession.user.email } : null;
      void update(currentUser);
    });
    return () => {
      alive = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    await navigate({ to: "/auth", replace: true });
  }

  function submitSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void navigate({ to: "/cases", search: { q: globalSearch }, resetScroll: false });
  }

  return (
    <SessionContext.Provider value={session}>
      <div className="app-frame">
        {mobileOpen && <button aria-label="Close navigation" className="nav-scrim" onClick={() => setMobileOpen(false)} />}
        <aside className={`side-rail ${mobileOpen ? "side-rail-open" : ""}`}>
          <Link to="/" className="brand-lockup" onClick={() => setMobileOpen(false)}>
            <span className="brand-mark"><Shield size={19} /></span>
            <span><strong>DEEPTRACE</strong><small>INVESTIGATION SYSTEM</small></span>
          </Link>
          <div className="workspace-switcher">
            <span className="workspace-symbol"><Fingerprint size={17} /></span>
            <span className="workspace-copy"><small>WORKSPACE</small><strong>{session.identity?.organizationName ?? "Workspace"}</strong></span>
            <ChevronDown size={15} className="text-muted-foreground" />
          </div>
          <nav aria-label="Main navigation" className="side-navigation">
            {navigation.map((group) => (
              <section className="nav-group" key={group.section}>
                <p className="nav-section-label">{group.section}</p>
                {group.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link key={item.to} to={item.to} onClick={() => setMobileOpen(false)} activeOptions={{ exact: item.to === "/" }} activeProps={{ className: "nav-link nav-link-active" }} className="nav-link">
                      <Icon size={16} strokeWidth={1.8} /><span>{item.label}</span>
                    </Link>
                  );
                })}
              </section>
            ))}
          </nav>
          <div className="rail-bottom">
            <div className="connection-status"><span className="status-indicator" />{session.status === "signed-in" ? "CLOUD CONNECTED" : session.status === "checking" ? "CHECKING SESSION" : "SIGN IN REQUIRED"}</div>
            <div className="user-strip">
              <span className="user-avatar">{session.user?.email?.slice(0, 1).toUpperCase() ?? "D"}</span>
              <span className="user-details"><strong>{session.user?.email ?? "Investigator"}</strong><small>{session.identity?.role?.replaceAll("_", " ").toUpperCase() ?? "SECURE WORKSPACE"}</small></span>
              {session.user ? <Button variant="ghost" size="icon" title="Sign out" aria-label="Sign out" onClick={() => void signOut()}><LogOut size={15} /></Button> : <Link to="/auth" aria-label="Sign in" title="Sign in" className="rail-user-action"><UserRound size={15} /></Link>}
            </div>
          </div>
          <Button variant="ghost" size="icon" className="mobile-close" aria-label="Close navigation" onClick={() => setMobileOpen(false)}><X size={18} /></Button>
        </aside>
        <div className="main-column">
          <header className="top-bar">
            <div className="top-leading"><Button variant="ghost" size="icon" className="mobile-menu" aria-label="Open navigation" onClick={() => setMobileOpen(true)}><Menu size={18} /></Button><span className="breadcrumb-root">WORKSPACE</span><span className="breadcrumb-separator">/</span><span className="breadcrumb-current">{typeof window === "undefined" ? "COMMAND CENTER" : getPageLabel(window.location.pathname)}</span></div>
            <form className="global-search" onSubmit={submitSearch} role="search"><Search size={15} /><input aria-label="Search investigations" placeholder="Search investigations…" value={globalSearch} onChange={(event) => setGlobalSearch(event.target.value)} /><kbd>↵</kbd></form>
            <div className="top-actions"><span className="secure-chip"><span />SECURE</span><Button variant="ghost" size="icon" aria-label="Notifications" title="Notifications"><Bell size={17} /></Button><Link to="/auth" className="top-user" aria-label={session.user ? "Account" : "Sign in"}><UserRound size={16} /></Link></div>
          </header>
          <main className="main-content">{children}</main>
          <footer className="app-footer"><span><Shield size={13} /> PRIVATE INVESTIGATION WORKSPACE</span><span>DEEPTRACE · PHASE 1</span></footer>
        </div>
      </div>
    </SessionContext.Provider>
  );
}

function getPageLabel(path: string) {
  const exact = navigation.flatMap((group) => group.items).find((item) => item.to === path);
  if (exact) return exact.label.toUpperCase();
  if (path.startsWith("/cases/")) return path.endsWith("/new") ? "NEW INVESTIGATION" : "CASE WORKSPACE";
  return path.split("/").filter(Boolean).at(-1)?.replaceAll("-", " ").toUpperCase() ?? "COMMAND CENTER";
}

export function WorkspaceGate({ children }: { children: ReactNode }) {
  const session = useDeepTraceSession();
  if (session.status === "checking") return <div className="state-panel"><span className="loading-mark" /><p>Establishing secure workspace session…</p></div>;
  if (session.status === "error") return <div className="state-panel state-error"><ShieldAlert size={24} /><h2>Workspace access unavailable</h2><p>{session.error}</p></div>;
  if (session.status !== "signed-in") return <div className="state-panel"><Shield size={25} /><p>Sign in to view organization records.</p><Button asChild><Link to="/auth">Continue to sign in</Link></Button></div>;
  if (!session.identity) return <div className="state-panel"><CircleHelp size={24} /><h2>Workspace not ready</h2><p>Your account does not have an organization role yet. Contact your workspace administrator.</p></div>;
  return <>{children}</>;
}