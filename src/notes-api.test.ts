import { describe, expect, it, vi } from "vitest";

import { createNote, getNotes } from "./notes-api";

const note = { id: 1, text: "Заметка", created_at: "2026-10-30T09:00:00Z" };
const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

describe("notes API", () => {
  it("reads an empty or populated list", async () => {
    for (const items of [[], [note]]) {
      const fetcher = vi.fn().mockResolvedValue(response(items));
      await expect(getNotes(fetcher)).resolves.toEqual(items);
      expect(fetcher).toHaveBeenCalledWith("/api/notes", expect.objectContaining({ headers: { Accept: "application/json" } }));
    }
  });

  it("rejects malformed notes and duplicate identities", async () => {
    for (const body of [null, {}, [{ ...note, id: "1" }], [{ ...note, id: -1 }],
      [{ ...note, text: null }], [{ ...note, created_at: "invalid" }], [note, note]]) {
      await expect(getNotes(vi.fn().mockResolvedValue(response(body)))).rejects.toThrow("Invalid notes response");
    }
  });

  it("sends trimmed text as JSON", async () => {
    const fetcher = vi.fn().mockResolvedValue(response(note, 201));
    await expect(createNote("  Заметка  ", fetcher)).resolves.toEqual(note);
    expect(fetcher).toHaveBeenCalledWith("/api/notes", expect.objectContaining({
      method: "POST", body: JSON.stringify({ text: "Заметка" }),
      headers: { Accept: "application/json", "Content-Type": "application/json" },
    }));
  });

  it("does not submit empty, oversized or invalid text", async () => {
    const fetcher = vi.fn();
    for (const text of ["", " \n ", "bad\0text", "я".repeat(2001)]) {
      await expect(createNote(text, fetcher)).rejects.toThrow("Invalid note text");
    }
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("accepts 2000 Unicode characters", async () => {
    const boundary = { ...note, text: "😀".repeat(2000) };
    await expect(createNote(boundary.text, vi.fn().mockResolvedValue(response(boundary, 201)))).resolves.toEqual(boundary);
  });

  it("reports unavailable storage for reads and writes", async () => {
    const fetcher = vi.fn().mockImplementation(async () => new Response(null, { status: 503 }));
    await expect(getNotes(fetcher)).rejects.toThrow("HTTP 503");
    await expect(createNote("hello", fetcher)).rejects.toThrow("HTTP 503");
  });

  it("rejects an invalid created record", async () => {
    await expect(createNote("hello", vi.fn().mockResolvedValue(response({ text: "hello" }, 201))))
      .rejects.toThrow("Invalid created note response");
  });

  it("propagates network failures without retrying a write", async () => {
    const fetcher = vi.fn().mockRejectedValue(new TypeError("network unavailable"));
    await expect(createNote("hello", fetcher)).rejects.toThrow("network unavailable");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
