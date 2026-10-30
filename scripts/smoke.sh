#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."
: "${IMAGE:=kubedeploy-frontend:v0.1.0}"
: "${BACKEND_IMAGE:=kubedeploy-backend:v0.1.0}"
: "${BACKEND_DIR:=../backend}"
for tool in docker curl python3; do
  command -v "$tool" >/dev/null || { echo "Required tool: $tool" >&2; exit 1; }
done

docker build --tag "$BACKEND_IMAGE" "$BACKEND_DIR"
work_dir="$(mktemp -d)"
run_id="kubedeploy-frontend-smoke-$$-$RANDOM"
network="$run_id"
frontend="$run_id-frontend"
backend="$run_id-backend"
cleanup() {
  result=$?
  if (( result != 0 )); then
    docker logs "$frontend" >&2 2>/dev/null || true
    docker logs "$backend" >&2 2>/dev/null || true
  fi
  docker rm -f "$frontend" "$backend" >/dev/null 2>&1 || true
  docker network rm "$network" >/dev/null 2>&1 || true
  rm -rf "$work_dir"
}
trap cleanup EXIT

docker network create "$network" >/dev/null
docker run --detach --name "$backend" --network "$network" --network-alias backend \
  --read-only --cap-drop ALL --security-opt no-new-privileges "$BACKEND_IMAGE" >/dev/null
docker run --detach --name "$frontend" --network "$network" \
  --read-only --tmpfs /tmp:rw,noexec,nosuid,size=16m \
  --cap-drop ALL --security-opt no-new-privileges \
  --publish 127.0.0.1::8080 "$IMAGE" >/dev/null
binding="$(docker port "$frontend" 8080/tcp)"
base_url="http://127.0.0.1:${binding##*:}"

ready=false
for ((attempt=0; attempt<30; attempt++)); do
  if curl --fail --silent --max-time 2 "$base_url/api/version" > "$work_dir/version.json"; then
    ready=true
    break
  fi
  sleep 1
done
if [[ "$ready" != true ]]; then
  echo 'Frontend/backend did not become ready within 30 attempts' >&2
  exit 1
fi
python3 - "$work_dir/version.json" <<'PY'
import json
import sys
with open(sys.argv[1]) as response:
    body = json.load(response)
assert body == {"service": "kubedeploy-backend", "version": "0.2.0"}, body
PY

curl --fail --silent --show-error --max-time 5 "$base_url/health" > "$work_dir/health"
[[ "$(cat "$work_dir/health")" == ok ]]
curl --fail --silent --show-error --max-time 5 "$base_url/" > "$work_dir/index.html"
asset="$(python3 - "$work_dir/index.html" <<'PY'
from html.parser import HTMLParser
import sys
class Page(HTMLParser):
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "script" and attrs.get("src", "").startswith("/assets/"):
            print(attrs["src"])
with open(sys.argv[1]) as page:
    Page().feed(page.read())
PY
)"
[[ -n "$asset" && "$asset" != *$'\n'* ]]
curl --fail --silent --show-error --max-time 5 "$base_url$asset" > "$work_dir/asset.js"
[[ -s "$work_dir/asset.js" ]]
curl --fail --silent --show-error --max-time 5 "$base_url/example/nested" > "$work_dir/route.html"
cmp "$work_dir/index.html" "$work_dir/route.html"

status="$(curl --silent --show-error --max-time 5 --output "$work_dir/missing-asset" --write-out '%{http_code}' "$base_url/assets/missing.js")"
[[ "$status" == 404 ]]
for path in /api /api/missing; do
  status="$(curl --silent --show-error --max-time 5 --output "$work_dir/missing-api" --write-out '%{http_code}' "$base_url$path")"
  [[ "$status" == 404 ]]
done
docker stop --time 2 "$backend" >/dev/null
status="$(curl --silent --show-error --max-time 5 --output "$work_dir/unavailable" --write-out '%{http_code}' "$base_url/api/version")"
[[ "$status" == 502 || "$status" == 503 ]]
curl --fail --silent --show-error --max-time 5 "$base_url/health" > "$work_dir/health"
[[ "$(cat "$work_dir/health")" == ok ]]
echo 'Smoke passed: API, static asset, SPA fallback, missing asset/API, backend outage, frontend health'
