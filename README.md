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
