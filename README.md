# KubeDeploy Frontend

Первый экран демонстрационного приложения. Frontend обращается к
`GET /api/version` и показывает доступность и версию backend.

## Запуск

Сначала запустите backend из соседнего репозитория:

```bash
cd ../backend
make image
docker run --rm -p 18080:8080 kubedeploy-backend:v0.1.0
```

В другом терминале установите зависимости и запустите frontend:

```bash
cd ../frontend
make install
make test
make dev
```

Приложение будет доступно по адресу `http://127.0.0.1:5173`. Dev server
проксирует `/api` в backend на `http://127.0.0.1:18080`.

## Сборка

```bash
make build
```

## Контейнер

Требования: запущенный Docker Desktop, `make`, `bash`, `curl` и `python3`.
Для smoke-проверки нужен соседний репозиторий `../backend` с Dockerfile.

```bash
make image
make smoke
```

`make smoke` собирает оба образа, создаёт отдельную временную Docker-сеть,
запускает контейнеры с `--read-only`, `--cap-drop ALL` и
`--security-opt no-new-privileges`. Frontend получает временный `/tmp`.
Проверяются API версии, HTML, JS, вложенный SPA-маршрут, 404 для отсутствующих
ресурсов и 502/503 после остановки backend. Health frontend остаётся доступен.
Контейнеры и сеть удаляются при завершении, в том числе при ошибке.

Параметры можно переопределить:

```bash
make smoke IMAGE=kubedeploy-frontend:local BACKEND_IMAGE=kubedeploy-backend:local BACKEND_DIR=../backend
```

Для ручного запуска с backend, опубликованным на порту `18080` хоста:

```bash
docker run --rm --read-only --tmpfs /tmp:rw,noexec,nosuid,size=16m \
  --cap-drop ALL --security-opt no-new-privileges \
  -e BACKEND_UPSTREAM=host.docker.internal:18080 \
  -p 127.0.0.1:18081:8080 kubedeploy-frontend:v0.1.0
```

## CI и релиз образа

Push в ветку и PR запускают unit-тесты, сборку контейнера, runtime smoke и
Trivy на нативных amd64 и arm64 runners. Исправимые HIGH/CRITICAL уязвимости
останавливают проверку; отчёт доступен в Actions artifacts.

После мерджа этого workflow в `main` создайте тег на текущем коммите `main`:

```bash
git switch main
git pull --ff-only
git tag v0.1.0
git push origin v0.1.0
```

Тег должен иметь вид `vMAJOR.MINOR.PATCH`. Workflow отклоняет тег на коммите,
который не совпадает с текущим `origin/main`. Тег предназначен для одного
релиза: опубликованный тег не следует переносить или переиспользовать.

Обе архитектуры сначала проходят сборку, runtime smoke и Trivy. Только после
успеха обеих проверок publish job получает право записи в GHCR и публикует
те же проверенные образы, без повторной сборки. Общий multi-platform образ:

```text
ghcr.io/kubedeploy-polytech-2026/frontend:v0.1.0
ghcr.io/kubedeploy-polytech-2026/frontend:sha-<полный SHA коммита>
```

Технические теги `v0.1.0-amd64` и `v0.1.0-arm64` содержат соответствующие
platform images. `latest` не публикуется. GitHub Release содержит
`release.json` с revision и digest общего образа, CycloneDX SBOM и Trivy-отчёт
для каждой архитектуры. Provenance подписывается для общего digest, SBOM —
для digest соответствующей архитектуры. Проверка provenance:

```bash
gh attestation verify oci://ghcr.io/kubedeploy-polytech-2026/frontend@sha256:<digest> \
  --repo kubedeploy-polytech-2026/frontend \
  --signer-workflow kubedeploy-polytech-2026/frontend/.github/workflows/release.yml
```

Проверить контейнер локально:

```bash
make image
IMAGE=kubedeploy-frontend:v0.1.0 bash scripts/test-image.sh
```

Caddy 2.11.7 пересобирается со стандартными модулями на Go 1.27.3 с
`golang.org/x/net` 0.60.0: готовый upstream binary содержит более старые
версии с исправимыми HIGH-уязвимостями. В runtime-образ копируется только
пересобранный binary; исходники и Go toolchain остаются в build stage.
