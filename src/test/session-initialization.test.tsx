import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  getUser: vi.fn(),
  onAuthStateChange: vi.fn(),
  signOut: vi.fn(),
  fetchWorkspaceIdentity: vi.fn(),
  authListener: undefined as
    ((event: AuthChangeEvent, session: Session | null) => void) | undefined,
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: mocks.getSession,
      getUser: mocks.getUser,
      onAuthStateChange: mocks.onAuthStateChange,
      signOut: mocks.signOut,
    },
  },
}));

vi.mock("@/lib/deeptrace", () => ({
  fetchWorkspaceIdentity: mocks.fetchWorkspaceIdentity,
}));

vi.mock("@tanstack/react-router", async () => {
  const { createElement } = await import("react");
  return {
    Link: ({
      to,
      children,
      className,
    }: {
      to: string;
      children: React.ReactNode;
      className?: string;
    }) => createElement("a", { href: to, className }, children),
    useLocation: () => ({ pathname: "/" }),
    useNavigate: () => vi.fn(async () => {}),
  };
});

import { DeepTraceShell, WorkspaceGate } from "@/components/deeptrace/app-shell";

const session: Session = {
  access_token: "test-access-token",
  refresh_token: "test-refresh-token",
  expires_in: 3600,
  expires_at: 1_893_456_000,
  token_type: "bearer",
  user: {
    id: "user-1",
    email: "analyst@example.test",
    app_metadata: { provider: "email", providers: ["email"] },
    user_metadata: {},
    aud: "authenticated",
    role: "authenticated",
    created_at: "2026-01-01T00:00:00.000Z",
  },
};
const identity = {
  organizationId: "org-1",
  organizationName: "Investigation Workspace",
  role: "analyst",
};

function renderWorkspace() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <DeepTraceShell>
        <WorkspaceGate>
          <h1>Command Center ready</h1>
        </WorkspaceGate>
      </DeepTraceShell>
    </QueryClientProvider>,
  );
}

describe("workspace session initialization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSession.mockResolvedValue({ data: { session: null }, error: null });
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });
    mocks.onAuthStateChange.mockImplementation(
      (callback: (event: AuthChangeEvent, session: Session | null) => void) => {
        mocks.authListener = callback;
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      },
    );
    mocks.fetchWorkspaceIdentity.mockResolvedValue(identity);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows the unauthenticated state when there is no session", async () => {
    renderWorkspace();

    expect(await screen.findByText("Sign in to view organization records.")).toBeInTheDocument();
    expect(screen.queryByText("Establishing secure workspace session…")).not.toBeInTheDocument();
  });

  it("loads the current account and organization membership", async () => {
    mocks.getSession.mockResolvedValue({ data: { session }, error: null });
    mocks.getUser.mockResolvedValue({ data: { user: session.user }, error: null });
    renderWorkspace();

    expect(
      await screen.findByRole("heading", { name: "Command Center ready" }),
    ).toBeInTheDocument();
    expect(mocks.fetchWorkspaceIdentity).toHaveBeenCalledWith("user-1");
    expect(screen.getByText("CLOUD CONNECTED")).toBeInTheDocument();
  });

  it("shows a recoverable no-workspace state when membership is absent", async () => {
    mocks.getSession.mockResolvedValue({ data: { session }, error: null });
    mocks.getUser.mockResolvedValue({ data: { user: session.user }, error: null });
    mocks.fetchWorkspaceIdentity.mockResolvedValue(null);
    renderWorkspace();

    expect(await screen.findByRole("heading", { name: "Workspace not ready" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry workspace check" })).toBeInTheDocument();
  });

  it("treats an expired session as unauthenticated", async () => {
    mocks.getSession.mockResolvedValue({ data: { session }, error: null });
    mocks.getUser.mockResolvedValue({
      data: { user: null },
      error: { status: 401, message: "Unauthorized" },
    });
    renderWorkspace();

    expect(await screen.findByText("Sign in to view organization records.")).toBeInTheDocument();
  });

  it("reports workspace lookup failures and retries successfully", async () => {
    mocks.getSession.mockResolvedValue({ data: { session }, error: null });
    mocks.getUser.mockResolvedValue({ data: { user: session.user }, error: null });
    mocks.fetchWorkspaceIdentity
      .mockRejectedValueOnce(new Error("Membership lookup failed"))
      .mockResolvedValueOnce(identity);
    renderWorkspace();

    expect(await screen.findByText("Membership lookup failed")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retry workspace connection" }));

    expect(
      await screen.findByRole("heading", { name: "Command Center ready" }),
    ).toBeInTheDocument();
    expect(mocks.fetchWorkspaceIdentity).toHaveBeenCalledTimes(2);
  });

  it("shows an error instead of loading forever when authentication never responds", async () => {
    vi.useFakeTimers();
    mocks.getSession.mockReturnValue(new Promise(() => {}));
    renderWorkspace();

    await act(async () => {
      vi.advanceTimersByTime(15_000);
      await Promise.resolve();
    });

    expect(
      screen.getByText("Authentication check did not respond. Check your connection and retry."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry workspace connection" })).toBeInTheDocument();
  });

  it("handles authentication service rejection as a recoverable error", async () => {
    mocks.getSession.mockRejectedValue(new Error("Auth service unavailable"));
    renderWorkspace();

    expect(await screen.findByText("Auth service unavailable")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry workspace connection" })).toBeInTheDocument();
  });

  it("ignores stale workspace results after sign-out and unsubscribes", async () => {
    let finishIdentity: (value: typeof identity) => void = () => {};
    const unsubscribe = vi.fn();
    mocks.getSession.mockResolvedValue({ data: { session }, error: null });
    mocks.getUser.mockResolvedValue({ data: { user: session.user }, error: null });
    mocks.fetchWorkspaceIdentity.mockReturnValue(
      new Promise((resolve) => {
        finishIdentity = resolve;
      }),
    );
    mocks.onAuthStateChange.mockImplementation(
      (callback: (event: AuthChangeEvent, session: Session | null) => void) => {
        mocks.authListener = callback;
        return { data: { subscription: { unsubscribe } } };
      },
    );
    const view = renderWorkspace();
    expect(await screen.findByText("Resolving organization workspace…")).toBeInTheDocument();

    await act(async () => {
      mocks.authListener?.("SIGNED_OUT", null);
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(screen.getByText("Sign in to view organization records.")).toBeInTheDocument();

    await act(async () => {
      finishIdentity(identity);
    });
    expect(screen.getByText("Sign in to view organization records.")).toBeInTheDocument();

    view.unmount();
    expect(unsubscribe).toHaveBeenCalledOnce();
  });
});
