import * as walletApi from "@/api/wallet";
import { useBalance, useTransactions } from "@/hooks/useWallet";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/api/wallet");

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe("useBalance", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns wallet balance on success", async () => {
    const mockWallet = {
      userId: "user-1",
      balance: 500,
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    };
    vi.mocked(walletApi.getBalance).mockResolvedValue(mockWallet);

    const { result } = renderHook(() => useBalance(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.balance).toBe(500);
  });

  it("sets error state on failure", async () => {
    vi.mocked(walletApi.getBalance).mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => useBalance(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe("useTransactions", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns transactions on success", async () => {
    const mockTransactions = [
      {
        id: "tx-1",
        userId: "user-1",
        amount: 100,
        type: "CREDIT" as const,
        createdAt: "2026-01-01T00:00:00Z",
      },
    ];
    vi.mocked(walletApi.getTransactions).mockResolvedValue(mockTransactions);

    const { result } = renderHook(() => useTransactions(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data?.[0].type).toBe("CREDIT");
  });

  it("returns empty array when no transactions", async () => {
    vi.mocked(walletApi.getTransactions).mockResolvedValue([]);

    const { result } = renderHook(() => useTransactions(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(0);
  });
});
