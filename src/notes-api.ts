export interface Note {
  id: number;
  text: string;
  created_at: string;
}

function isNote(value: unknown): value is Note {
  if (typeof value !== "object" || value === null) return false;
  const note = value as Record<string, unknown>;
  return typeof note.id === "number" && Number.isSafeInteger(note.id) && note.id > 0 &&
    typeof note.text === "string" && note.text.length > 0 && Array.from(note.text).length <= 2000 && !note.text.includes("\0") &&
    typeof note.created_at === "string" && Number.isFinite(Date.parse(note.created_at));
}

export async function getNotes(fetcher: typeof fetch = fetch): Promise<Note[]> {
  const response = await fetcher("/api/notes", {
    headers: { Accept: "application/json" }, signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error(`Notes returned HTTP ${response.status}`);
  const body: unknown = await response.json();
  if (!Array.isArray(body) || body.length > 100 || !body.every(isNote) ||
      new Set(body.map((note) => note.id)).size !== body.length) {
    throw new Error("Invalid notes response");
  }
  return body;
}

export async function createNote(text: string, fetcher: typeof fetch = fetch): Promise<Note> {
  text = text.trim();
  if (!text || text.includes("\0") || Array.from(text).length > 2000) throw new Error("Invalid note text");
  const response = await fetcher("/api/notes", {
    method: "POST", headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({ text }), signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error(`Notes returned HTTP ${response.status}`);
  const body: unknown = await response.json();
  if (!isNote(body)) throw new Error("Invalid created note response");
  return body;
}
