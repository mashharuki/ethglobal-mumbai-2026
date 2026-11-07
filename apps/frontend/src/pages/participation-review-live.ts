import { getAddress, isAddress, isHex } from "viem";

import {
  authChallengeResponseSchema,
  type PrivateReviewCase,
  privateReviewCaseSchema,
  reviewCaseIdSchema,
  reviewResponseRequestSchema,
} from "../../../../packages/shared/src/index.ts";

export type WalletProvider = {
  request(input: {
    method: string;
    params?: readonly unknown[];
  }): Promise<unknown>;
};

type Requester = typeof fetch;

export function createPrivateReviewApi(fetcher: Requester = fetch) {
  async function request(
    path: string,
    method = "GET",
    body?: unknown,
    operationId?: string,
  ) {
    const response = await fetcher(`/v1${path}`, {
      method,
      credentials: "same-origin",
      cache: "no-store",
      headers: {
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
        ...(operationId ? { "X-Operation-Id": operationId } : {}),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    if (!response.ok)
      throw new Error(`Private API returned ${response.status}`);
    return response;
  }

  return {
    async createChallenge(address: string) {
      const response = await request("/auth/challenges", "POST", { address });
      return authChallengeResponseSchema.parse(await response.json());
    },
    async createSession(message: string, signature: string): Promise<void> {
      await request("/auth/sessions", "POST", { message, signature });
    },
    async getCase(caseId: string): Promise<PrivateReviewCase> {
      const id = reviewCaseIdSchema.parse(caseId);
      const response = await request(`/review-cases/${encodeURIComponent(id)}`);
      return privateReviewCaseSchema.parse(await response.json());
    },
    async submitCase(
      action: "response" | "appeal",
      review: PrivateReviewCase,
      fixtureId: string,
    ): Promise<void> {
      const body = reviewResponseRequestSchema.parse({
        expectedRevision: review.revision,
        fixtureId,
      });
      const suffix = action === "response" ? "responses" : "appeals";
      await request(
        `/review-cases/${encodeURIComponent(review.caseId)}/${suffix}`,
        "POST",
        body,
        crypto.randomUUID(),
      );
    },
  };
}

export type PrivateReviewApi = ReturnType<typeof createPrivateReviewApi>;

export async function signInForReview(
  api: PrivateReviewApi,
  provider: WalletProvider,
): Promise<string> {
  const chainId = await provider.request({ method: "eth_chainId" });
  if (chainId !== "0xaa36a7") throw new Error("Switch wallet to Sepolia");
  const accounts = await provider.request({ method: "eth_requestAccounts" });
  if (
    !Array.isArray(accounts) ||
    typeof accounts[0] !== "string" ||
    !isAddress(accounts[0])
  ) {
    throw new Error("A wallet account is required");
  }
  const address = getAddress(accounts[0]);
  const challenge = await api.createChallenge(address);
  const signature = await provider.request({
    method: "personal_sign",
    params: [challenge.message, address],
  });
  if (typeof signature !== "string" || !isHex(signature)) {
    throw new Error("Wallet signature was not returned");
  }
  await api.createSession(challenge.message, signature);
  return address;
}
