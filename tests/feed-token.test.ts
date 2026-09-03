import { describe, expect, it } from "vitest";
import { createFeedToken, hashFeedToken, isFeedToken } from "@/lib/feed-token";

describe("personal feed tokens", () => {
  it("creates a 256-bit URL-safe token and stores only its SHA-256 hash", () => {
    const token = createFeedToken();
    expect(isFeedToken(token)).toBe(true);
    expect(token).toHaveLength(43);
    expect(hashFeedToken(token)).toMatch(/^[a-f0-9]{64}$/);
    expect(hashFeedToken(token)).not.toContain(token);
  });

  it("rejects malformed URL tokens", () => {
    expect(isFeedToken("short")).toBe(false);
    expect(isFeedToken(`${"a".repeat(42)}!`)).toBe(false);
  });
});
