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

Контейнер, кластерное развертывание и release workflow добавляются отдельными
изменениями после проверки локального приложения.
