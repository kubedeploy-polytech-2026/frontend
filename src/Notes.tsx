import { type FormEvent, useCallback, useEffect, useRef, useState } from "react";

import { createNote, getNotes, type Note } from "./notes-api";

const dateFormat = new Intl.DateTimeFormat("ru-RU", {
  day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
});

export function Notes() {
  const [items, setItems] = useState<Note[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [text, setText] = useState("");
  const [save, setSave] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const request = useRef(0);
  const length = Array.from(text.trim()).length;
  const valid = length > 0 && length <= 2000 && !text.includes("\0");

  const load = useCallback(async () => {
    const current = ++request.current;
    setStatus("loading");
    try {
      const result = await getNotes();
      if (current === request.current) {
        setItems(result);
        setStatus("ready");
      }
    } catch {
      if (current === request.current) setStatus("error");
    }
  }, []);

  useEffect(() => {
    void load();
    return () => { request.current++; };
  }, [load]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!valid || save === "saving" || status !== "ready") return;
    setSave("saving");
    try {
      const note = await createNote(text);
      setItems((previous) => [note, ...previous.filter((item) => item.id !== note.id)].slice(0, 100));
      setText("");
      setSave("saved");
    } catch {
      setSave("error");
    }
  }

  return (
    <section className="notes-section" aria-labelledby="notes-title">
      <div className="notes-heading">
        <div>
          <p className="card-index">ЗАПИСНАЯ КНИЖКА / 01</p>
          <h2 id="notes-title">Заметки</h2>
        </div>
        <button type="button" onClick={() => void load()} disabled={status === "loading" || save === "saving"}>
          {status === "error" ? "Повторить загрузку" : "Обновить список"}
        </button>
      </div>
      <div className="notes-grid">
        <form onSubmit={(event) => void submit(event)} className="note-form">
          <label htmlFor="note-text">Новая заметка</label>
          <textarea id="note-text" rows={6} value={text} disabled={save === "saving"}
            aria-describedby="note-length" aria-invalid={length > 2000}
            placeholder="Что хочется сохранить?"
            onChange={(event) => { setText(event.target.value); setSave("idle"); }} />
          <div className="note-form-footer">
            <span id="note-length" className={length > 2000 ? "offline" : "note-length"}>{length} / 2000</span>
            <button type="submit" disabled={!valid || status !== "ready" || save === "saving"}>
              {save === "saving" ? "Сохраняем…" : "Сохранить заметку"}
            </button>
          </div>
          <p className={`save-feedback ${save === "error" ? "offline" : "online"}`} role="status">
            {save === "saved" && "Заметка сохранена."}
            {save === "error" && "Не удалось сохранить заметку. Попробуйте ещё раз."}
          </p>
        </form>
        <div className="notes-results" aria-busy={status === "loading"}>
          {status === "loading" && <p className="notes-message" role="status">Загружаем записи…</p>}
          {status === "error" && <p className="notes-message offline" role="alert">Не удалось загрузить записи.</p>}
          {status === "ready" && items.length === 0 && <p className="notes-message">Пока нет заметок. Создайте первую.</p>}
          {items.length > 0 && (
            <ul className="notes-list" aria-label="Сохранённые заметки">
              {items.map((note) => (
                <li key={note.id}>
                  <div className="note-meta"><span>#{String(note.id).padStart(3, "0")}</span>
                    <time dateTime={note.created_at}>{dateFormat.format(new Date(note.created_at))}</time>
                  </div>
                  <p>{note.text}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
