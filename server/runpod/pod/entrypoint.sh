#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${VLLM_API_KEY:-}" ]]; then
  echo "VLLM_API_KEY must be set; the Pod proxy URL is public." >&2
  exit 1
fi

args=(
  "$MODEL_NAME"
  --served-model-name "$SERVED_MODEL_NAME"
  --host 0.0.0.0
  --port "$PORT"
  --max-model-len "$MAX_MODEL_LEN"
  --gpu-memory-utilization "$GPU_MEMORY_UTILIZATION"
  --max-num-seqs "$MAX_NUM_SEQS"
  --enable-prefix-caching
)
if [[ "${MODEL_NAME,,}" == *awq* ]]; then
  args+=(--quantization awq)
fi

# vLLM reads VLLM_API_KEY from the environment and requires it as a Bearer token.
exec vllm serve "${args[@]}" "$@"
