import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import type { Session } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock("@/lib/supabase", () => ({ supabase: { rpc } }));
import { PRO_ACCESS_REFRESH_MS, useProAccess } from "@/hooks/use-pro-access";

function session(id: string, token = "test-token"): Session {
  return { user: { id, app_metadata: {}, user_metadata: {}, aud: "authenticated", created_at: "2026-11-27" },
    access_token: token, refresh_token: "test-refresh", expires_in: 3600, token_type: "bearer" };
}

describe("Database-authorized PRO access", () => {
  beforeEach(() => { rpc.mockReset(); rpc.mockResolvedValue({ data: true, error: null }); });
  afterEach(() => { cleanup(); vi.useRealTimers(); });

  it("unlocks from the database boolean without demanding active status or a Cakto provider", async () => {
    const { result } = renderHook(() => useProAccess(session("pro-user"), "Dashboard"));
    await waitFor(() => expect(result.current.hasProAccess).toBe(true));
    expect(rpc).toHaveBeenCalledWith("has_active_pro_subscription");
  });

  it("denies access when the database reports an expired or absent entitlement", async () => {
    rpc.mockResolvedValue({ data: false, error: null });
    const { result } = renderHook(() => useProAccess(session("free-user"), "Gestão de Pessoa Física"));
    await waitFor(() => expect(result.current.proAccessLoading).toBe(false));
    expect(result.current.hasProAccess).toBe(false);
  });

  it("fails closed and reports permission errors rather than silently treating them as no subscription", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "permission denied for schema private" } });
    const { result } = renderHook(() => useProAccess(session("pro-user"), "Dashboard"));
    await waitFor(() => expect(result.current.proAccessLoading).toBe(false));
    expect(result.current.hasProAccess).toBe(false);
    expect(result.current.proAccessError.length).toBeGreaterThan(0);
  });

  it("revalidates when the same user signs in with new session credentials", async () => {
    const { result, rerender } = renderHook(({ token }) => useProAccess(session("pro-user", token), "Dashboard"),
      { initialProps: { token: "first-session" } });
    await waitFor(() => expect(result.current.hasProAccess).toBe(true));
    rpc.mockResolvedValue({ data: false, error: null });
    rerender({ token: "new-session" });
    await waitFor(() => expect(rpc).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(result.current.hasProAccess).toBe(false));
  });

  it("does not transfer a previous user's pending response to another user", async () => {
    let resolvePrevious: ((value: { data: boolean; error: null }) => void) | undefined;
    rpc.mockImplementationOnce(() => new Promise(resolve => { resolvePrevious = resolve; }));
    rpc.mockResolvedValue({ data: false, error: null });
    const { result, rerender } = renderHook(({ id }) => useProAccess(session(id), "Dashboard"),
      { initialProps: { id: "pro-user" } });
    rerender({ id: "free-user" });
    await waitFor(() => expect(result.current.proAccessLoading).toBe(false));
    await act(async () => { resolvePrevious?.({ data: true, error: null }); });
    expect(result.current.hasProAccess).toBe(false);
  });

  it("rechecks expiry while the app remains open and cleans up the timer", async () => {
    vi.useFakeTimers();
    const { result, unmount } = renderHook(() => useProAccess(session("pro-user"), "Dashboard"));
    await act(async () => {});
    expect(result.current.hasProAccess).toBe(true);
    rpc.mockResolvedValue({ data: false, error: null });
    await act(async () => { await vi.advanceTimersByTimeAsync(PRO_ACCESS_REFRESH_MS); });
    expect(result.current.hasProAccess).toBe(false);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("rechecks on focus and uses the same authority for business and personal modules", async () => {
    const { result, rerender } = renderHook(({ surface }) => useProAccess(session("pro-user"), surface),
      { initialProps: { surface: "Dashboard" } });
    await waitFor(() => expect(result.current.hasProAccess).toBe(true));
    await act(async () => { window.dispatchEvent(new Event("focus")); });
    expect(rpc).toHaveBeenCalledTimes(2);
    rerender({ surface: "Gestão de Pessoa Física" });
    await waitFor(() => expect(rpc).toHaveBeenCalledTimes(3));
    await waitFor(() => expect(result.current.hasProAccess).toBe(true));
  });

  it("clears access on logout and does not query without a session", async () => {
    const { result, rerender } = renderHook(({ current }: { current: Session | null }) => useProAccess(current, "Dashboard"),
      { initialProps: { current: session("pro-user") as Session | null } });
    await waitFor(() => expect(result.current.hasProAccess).toBe(true));
    rerender({ current: null });
    expect(result.current.hasProAccess).toBe(false);
    expect(rpc).toHaveBeenCalledTimes(1);
  });
});