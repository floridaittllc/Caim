# CAIm grammar backend on RunPod

The keyboard checks grammar in the background. It tries Apple's on-device model
first (iOS 26, Apple Intelligence devices), then this self-hosted endpoint, then
Grok. This folder deploys the self-hosted part: an OpenAI-compatible vLLM server
on RunPod.

| Path | What it is |
| --- | --- |
| `prompts.json` | Grammar and rewrite prompts plus JSON schemas. `CAImKeyboardCore` and the app's connection test use the same text (a Swift test fails if they drift). |
| `deploy_serverless.py` | Creates a Serverless endpoint with the official vLLM worker via the RunPod REST API. |
| `pod/` | Dockerfile for an always-on GPU Pod running `vllm serve`. |
| `smoke_test.py` | Calls the grammar route and every rewrite mode, validates the JSON. |
| `smoke_test.sh` | One curl request, for a quick look. |

## Model: Qwen2.5-7B-Instruct

- Apache-2.0, no Hugging Face token needed.
- Strong instruction following and JSON output for its size, and good at
  English grammar. vLLM's structured outputs (`response_format: json_schema`)
  keep the reply valid JSON anyway.
- Fits one 24 GB GPU: about 15 GB of bf16 weights, which leaves room for the KV
  cache at `MAX_MODEL_LEN=4096`. Keyboard requests are short, at most about
  400 tokens in and 512 out.
- A grammar check for one sentence takes roughly 0.3–1 s once the worker is warm.

Alternatives: `Qwen/Qwen2.5-7B-Instruct-AWQ` (4-bit, fits a 16 GB card such
as an RTX A4000, slightly lower quality), `Qwen/Qwen2.5-3B-Instruct` (faster
and cheaper, weaker on subtle grammar). Qwen3-8B also works, but its thinking
mode adds latency unless you disable it, so it is not the default.

Every deployment serves the model under the name `caim-grammar`, so the app
setting stays the same when you swap weights.

## Option A: Serverless (default, scales to zero)

You pay only while a worker runs. With `workersMin=0`, the first request after
an idle period waits for a cold start: about 30–90 s with FlashBoot and cached
weights, and several minutes the very first time. During that wait the keyboard
uses the next provider (Grok), so typing never blocks.

### With the script

```bash
export RUNPOD_API_KEY=...            # RunPod console -> Settings -> API Keys
python3 server/runpod/deploy_serverless.py --dry-run   # review the payload
python3 server/runpod/deploy_serverless.py
```

It prints `endpointId` and `baseUrl`
(`https://api.runpod.ai/v2/<endpointId>/openai/v1`). The defaults are:

| Setting | Value | Why |
| --- | --- | --- |
| Image | `runpod/worker-v1-vllm:v2.28.0` (vLLM 0.30.0) | Official worker |
| GPUs | L4, RTX A5000, RTX 4090, RTX 3090, then A6000 | 24 GB cards first |
| `workersMin` / `workersMax` | 0 / 2 | Nothing billed while idle |
| `idleTimeout` | 60 s | Stays warm across bursts of typing |
| Env | `MAX_MODEL_LEN=4096`, `GPU_MEMORY_UTILIZATION=0.92`, `ENABLE_PREFIX_CACHING=true`, `OPENAI_SERVED_MODEL_NAME_OVERRIDE=caim-grammar` | The system prompt is shared, so prefix caching saves prefill time |

To trade money for latency, raise `--idle-timeout` (e.g. 300) or set
`--workers-min 1`. One active worker bills around the clock at the GPU's
active-worker rate. Check current pricing in the RunPod console.

### In the console

1. Open the [vLLM worker in the RunPod Hub](https://console.runpod.io/hub/runpod-workers/worker-vllm) → **Deploy**.
2. Model: `Qwen/Qwen2.5-7B-Instruct`. Under Advanced, set Max Model Length to `4096`.
3. Add the environment variables `OPENAI_SERVED_MODEL_NAME_OVERRIDE=caim-grammar` and `ENABLE_PREFIX_CACHING=true`.
4. Choose a 24 GB GPU, set Min workers to 0, Max workers to 2, Idle timeout to 60 s, and turn FlashBoot on.
5. Create the endpoint and copy its id.

## Option B: Always-on Pod (lowest latency)

There is no cold start, but the GPU bills by the hour while the Pod runs.

```bash
docker build -t <dockerhub-user>/caim-grammar-pod:latest server/runpod/pod
docker push <dockerhub-user>/caim-grammar-pod:latest
```

Create a GPU Pod in the RunPod console (24 GB GPU) from that image:

- Expose HTTP port `8000`.
- Use a 30 GB+ volume at `/workspace`, which caches the weights in `HF_HOME`.
- Set env `VLLM_API_KEY` to a long random string. The proxy URL is public, so
  the server refuses to start without one.
- Optional: `MODEL_NAME`, `MAX_MODEL_LEN`, `MAX_NUM_SEQS`.

The base URL is `https://<pod-id>-8000.proxy.runpod.net/v1`, and the API key is
your `VLLM_API_KEY`. You can also skip the custom image and launch
`vllm/vllm-openai:v0.30.0` directly with the same arguments as
`pod/entrypoint.sh`.

## Smoke test

```bash
# Serverless (the RunPod API key authorizes the request)
RUNPOD_API_KEY=... python3 server/runpod/smoke_test.py --endpoint-id <endpointId>

# Pod
CAIM_API_KEY=<VLLM_API_KEY> python3 server/runpod/smoke_test.py \
  --base-url https://<pod-id>-8000.proxy.runpod.net/v1

# Quick curl
RUNPOD_API_KEY=... server/runpod/smoke_test.sh <endpointId>
```

The default timeout is 300 s so a cold start does not fail the test. Pass
`--grammar-only` for a single request.

## Point the app at it

In the CAIm app, open **Settings → Background grammar**:

- **Endpoint URL**: the base URL above. You can also paste
  `https://api.runpod.ai/v2/<id>` or just the endpoint id; the app adds
  `/openai/v1`.
- **API key**: for Serverless, a RunPod API key; for a Pod, your `VLLM_API_KEY`.
- **Model**: `caim-grammar`.
- Tap **Test connection**.

The app stores these in the App Group (`group.com.caim.keyboard`). The keyboard
reads them when Full Access is on.

Treat the RunPod API key like a password. It can manage your RunPod account,
not just call this endpoint, so it has to live on the phone. Use a key
restricted to this endpoint where RunPod allows it, or put a Pod behind your
own `VLLM_API_KEY` instead.

## API contract

Both routes are `POST {baseUrl}/chat/completions` with
`response_format: {"type": "json_schema", ...}` from `prompts.json`.

Grammar reply:

```json
{"issues":[{"start":0,"end":5,"original":"Their","replacement":"They're","category":"grammar","explanation":"Contraction of they are"}]}
```

Offsets count characters in the submitted text. The client treats `original`
as the source of truth: when the model gets an offset wrong, the client finds
`original` in the text instead, and it drops issues it cannot locate.

Rewrite reply (modes `professional`, `casual`, `shorten`, `expand`, `fix`):

```json
{"rewritten":"...","suggestions":["..."],"corrections":[{"original":"...","suggestion":"...","reason":"..."}]}
```
