export interface BackendVersion {
  service: string;
  version: string;
}

function isBackendVersion(value: unknown): value is BackendVersion {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return typeof candidate.service === "string" && typeof candidate.version === "string";
}

export async function getBackendVersion(fetcher: typeof fetch = fetch): Promise<BackendVersion> {
  const response = await fetcher("/api/version", {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Backend returned HTTP ${response.status}`);
  }

  const body: unknown = await response.json();
  if (!isBackendVersion(body)) {
    throw new Error("Backend returned an invalid version response");
  }

  return body;
}
