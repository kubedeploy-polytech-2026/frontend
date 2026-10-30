import { useCallback, useEffect, useState } from "react";

import { type BackendVersion, getBackendVersion } from "./api";
import { Notes } from "./Notes";

type LoadState =
  | { status: "loading" }
  | { status: "ready"; backend: BackendVersion }
  | { status: "error" };

export function App() {
  const [state, setState] = useState<LoadState>({ status: "loading" });

  const load = useCallback(async () => {
    setState({ status: "loading" });
    try {
      setState({ status: "ready", backend: await getBackendVersion() });
    } catch {
      setState({ status: "error" });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <main className="page-shell">
      <header className="masthead">
        <span className="brand">K/</span>
        <span className="environment">LOCAL ENVIRONMENT</span>
      </header>

      <section className="hero" aria-labelledby="page-title">
        <p className="eyebrow">KUBEDEPLOY / APPLICATION</p>
        <h1 id="page-title">
          Мысли,
          <span>которые остаются.</span>
        </h1>
        <p className="summary">
          Сохраните мысль и вернитесь к ней позже. Записи останутся после
          обновления страницы.
        </p>
      </section>

      <Notes />

      <section className="status-card" aria-labelledby="backend-title" aria-live="polite">
        <div>
          <p className="card-index">SERVICE / 01</p>
          <h2 id="backend-title">Backend</h2>
        </div>

        {state.status === "loading" && <p className="status pending">Проверяем соединение…</p>}

        {state.status === "ready" && (
          <div className="service-result">
            <p className="status online"><span aria-hidden="true" />Доступен</p>
            <dl>
              <div><dt>Сервис</dt><dd>{state.backend.service}</dd></div>
              <div><dt>Версия</dt><dd>{state.backend.version}</dd></div>
            </dl>
          </div>
        )}

        {state.status === "error" && (
          <div className="service-result">
            <p className="status offline">Backend недоступен</p>
            <button type="button" onClick={() => void load()}>Повторить проверку</button>
          </div>
        )}
      </section>

      <footer>GIT → BUILD → VERIFY → DEPLOY</footer>
    </main>
  );
}
