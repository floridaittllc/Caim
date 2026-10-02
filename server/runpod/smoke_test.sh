#!/usr/bin/env bash
# Minimal curl check of the grammar route. Usage:
#   RUNPOD_API_KEY=... ./smoke_test.sh <endpoint-id>
#   CAIM_API_KEY=... CAIM_BASE_URL=https://<pod-id>-8000.proxy.runpod.net/v1 ./smoke_test.sh
set -euo pipefail

API_KEY="${CAIM_API_KEY:-${RUNPOD_API_KEY:-}}"
if [[ -z "$API_KEY" ]]; then
  echo "Set CAIM_API_KEY or RUNPOD_API_KEY" >&2
  exit 1
fi
if [[ -n "${CAIM_BASE_URL:-}" ]]; then
  BASE_URL="${CAIM_BASE_URL%/}"
elif [[ -n "${1:-}" ]]; then
  BASE_URL="https://api.runpod.ai/v2/$1/openai/v1"
else
  echo "Pass an endpoint id or set CAIM_BASE_URL" >&2
  exit 1
fi
MODEL="${CAIM_MODEL:-caim-grammar}"

curl -sS --max-time 300 "$BASE_URL/chat/completions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $API_KEY" \
  -d @- <<JSON
{
  "model": "$MODEL",
  "temperature": 0,
  "max_tokens": 256,
  "response_format": {"type": "json_object"},
  "messages": [
    {"role": "system", "content": "Find grammar and spelling mistakes. Return ONLY JSON: {\"issues\":[{\"start\":0,\"end\":0,\"original\":\"\",\"replacement\":\"\",\"category\":\"grammar\",\"explanation\":\"\"}]}"},
    {"role": "user", "content": "Text:\nTheir going to the libary tomorow."}
  ]
}
JSON
echo
