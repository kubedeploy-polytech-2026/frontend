import { describe, expect, it, vi } from "vitest";

import { getBackendVersion } from "./api";

describe("getBackendVersion", () => {
  it("returns a valid backend version", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ service: "kubedeploy-backend", version: "0.1.0" }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    await expect(getBackendVersion(fetcher)).resolves.toEqual({
      service: "kubedeploy-backend",
      version: "0.1.0",
    });
    expect(fetcher).toHaveBeenCalledWith("/api/version", {
      headers: { Accept: "application/json" },
    });
  });

  it("rejects an invalid response", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ service: "kubedeploy-backend" }), { status: 200 }),
    );

    await expect(getBackendVersion(fetcher)).rejects.toThrow("invalid version response");
  });

  it("reports a backend error", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(null, { status: 503 }));

    await expect(getBackendVersion(fetcher)).rejects.toThrow("HTTP 503");
  });
});
