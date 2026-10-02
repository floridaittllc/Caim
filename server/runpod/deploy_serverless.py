#!/usr/bin/env python3
"""Create a RunPod Serverless endpoint running the official vLLM worker for CAIm.

Requires RUNPOD_API_KEY. Standard library only. Defaults scale to zero
(workersMin=0) so an idle endpoint costs nothing; the first request after an
idle period pays a cold start.

    RUNPOD_API_KEY=... python3 deploy_serverless.py
    RUNPOD_API_KEY=... python3 deploy_serverless.py --model Qwen/Qwen2.5-7B-Instruct-AWQ --gpu "NVIDIA RTX A4000"

Prints the endpoint id and the OpenAI-compatible base URL to paste into the
CAIm app (Settings -> Self-hosted endpoint).
"""

import argparse
import json
import os
import sys
import urllib.error
import urllib.request

REST = "https://rest.runpod.io/v1"
WORKER_IMAGE = "runpod/worker-v1-vllm:v2.28.0"
DEFAULT_MODEL = "Qwen/Qwen2.5-7B-Instruct"
SERVED_MODEL_NAME = "caim-grammar"
# 24 GB cards first; 48 GB cards only as overflow capacity.
DEFAULT_GPUS = [
    "NVIDIA L4",
    "NVIDIA RTX A5000",
    "NVIDIA GeForce RTX 4090",
    "NVIDIA GeForce RTX 3090",
    "NVIDIA RTX A6000",
]


def call(method, path, api_key, payload=None):
    request = urllib.request.Request(
        f"{REST}{path}",
        data=json.dumps(payload).encode() if payload is not None else None,
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {api_key}"},
        method=method,
    )
    try:
        with urllib.request.urlopen(request, timeout=60) as response:
            return json.loads(response.read() or b"null")
    except urllib.error.HTTPError as error:
        sys.exit(f"RunPod API {method} {path} failed: HTTP {error.code} {error.read().decode(errors='replace')[:500]}")


def worker_env(args):
    env = {
        "MODEL_NAME": args.model,
        "OPENAI_SERVED_MODEL_NAME_OVERRIDE": SERVED_MODEL_NAME,
        "MAX_MODEL_LEN": str(args.max_model_len),
        "GPU_MEMORY_UTILIZATION": "0.92",
        "ENABLE_PREFIX_CACHING": "true",
        "MAX_CONCURRENCY": "16",
    }
    if "awq" in args.model.lower():
        env["QUANTIZATION"] = "awq"
    if os.environ.get("HF_TOKEN"):
        env["HF_TOKEN"] = os.environ["HF_TOKEN"]
    return env


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--name", default="caim-grammar")
    parser.add_argument("--model", default=DEFAULT_MODEL)
    parser.add_argument("--gpu", action="append", help="GPU type id; repeat for fallbacks")
    parser.add_argument("--max-model-len", type=int, default=4096)
    parser.add_argument("--workers-min", type=int, default=0, help="Keep >0 only if you accept paying for idle GPUs")
    parser.add_argument("--workers-max", type=int, default=2)
    parser.add_argument("--idle-timeout", type=int, default=60, help="Seconds a worker stays warm after a request")
    parser.add_argument("--dry-run", action="store_true", help="Print the payloads without calling RunPod")
    args = parser.parse_args()

    template = {
        "name": f"{args.name}-vllm",
        "imageName": WORKER_IMAGE,
        "isServerless": True,
        "containerDiskInGb": 40,
        "volumeInGb": 0,
        "env": worker_env(args),
    }
    endpoint = {
        "name": args.name,
        "computeType": "GPU",
        "gpuTypeIds": args.gpu or DEFAULT_GPUS,
        "gpuCount": 1,
        "workersMin": args.workers_min,
        "workersMax": args.workers_max,
        "idleTimeout": args.idle_timeout,
        "flashboot": True,
        "scalerType": "QUEUE_DELAY",
        "scalerValue": 4,
        "executionTimeoutMs": 120000,
    }

    if args.dry_run:
        redacted = dict(template, env={k: ("***" if k == "HF_TOKEN" else v) for k, v in template["env"].items()})
        print(json.dumps({"template": redacted, "endpoint": endpoint}, indent=2))
        return

    api_key = os.environ.get("RUNPOD_API_KEY")
    if not api_key:
        sys.exit("RUNPOD_API_KEY is not set")

    created_template = call("POST", "/templates", api_key, template)
    endpoint["templateId"] = created_template["id"]
    created_endpoint = call("POST", "/endpoints", api_key, endpoint)
    endpoint_id = created_endpoint["id"]
    print(json.dumps({
        "templateId": created_template["id"],
        "endpointId": endpoint_id,
        "baseUrl": f"https://api.runpod.ai/v2/{endpoint_id}/openai/v1",
        "model": SERVED_MODEL_NAME,
    }, indent=2))


if __name__ == "__main__":
    main()
