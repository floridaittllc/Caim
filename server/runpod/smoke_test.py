#!/usr/bin/env python3
"""Smoke-test a CAIm grammar endpoint (RunPod Serverless vLLM worker or a vLLM Pod).

Standard library only. Examples:

    RUNPOD_API_KEY=... python3 smoke_test.py --endpoint-id abc123xyz
    CAIM_API_KEY=... python3 smoke_test.py --base-url https://<pod-id>-8000.proxy.runpod.net/v1

Exits non-zero when the endpoint is unreachable or returns unusable JSON.
"""

import argparse
import http.client
import json
import os
import pathlib
import re
import sys
import time
import urllib.error
import urllib.request

PROMPTS = json.loads((pathlib.Path(__file__).parent / "prompts.json").read_text())
SAMPLE = "Their going to the libary tomorow, and me and him was planning to meet they're."


def normalize_base_url(raw):
    """Same rules as OpenAICompatibleEndpoint.normalizedBaseURL in CAImKeyboardCore."""
    url = raw.strip().rstrip("/")
    if re.fullmatch(r"[A-Za-z0-9]+", url):
        return f"https://api.runpod.ai/v2/{url}/openai/v1"
    if "://" not in url:
        url = "https://" + url
    if url.endswith("/chat/completions"):
        url = url[: -len("/chat/completions")]
    if re.search(r"/v2/[^/]+$", url):
        url = url + "/openai/v1"
    return url


def base_url_from_args(args):
    if args.base_url:
        return normalize_base_url(args.base_url)
    if args.endpoint_id:
        return normalize_base_url(args.endpoint_id)
    sys.exit("Pass --base-url or --endpoint-id")


def post_json(url, api_key, payload, timeout):
    request = urllib.request.Request(
        url,
        data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {api_key}"},
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=timeout) as response:
        return json.loads(response.read())


def chat(base_url, api_key, model, system, user, schema_name, schema, max_tokens, temperature, use_schema, timeout):
    payload = {
        "model": model,
        "temperature": temperature,
        "max_tokens": max_tokens,
        "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}],
    }
    if use_schema:
        payload["response_format"] = {
            "type": "json_schema",
            "json_schema": {"name": schema_name, "schema": schema, "strict": True},
        }
    started = time.monotonic()
    body = post_json(f"{base_url}/chat/completions", api_key, payload, timeout)
    elapsed_ms = int((time.monotonic() - started) * 1000)
    content = body["choices"][0]["message"]["content"]
    return json.loads(strip_fences(content)), elapsed_ms, body.get("model")


def strip_fences(content):
    text = content.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[1] if "\n" in text else ""
        text = text.rsplit("```", 1)[0]
    return text.strip()


def check_grammar(args, base_url, api_key):
    spec = PROMPTS["grammar"]
    result, elapsed_ms, model = chat(
        base_url,
        api_key,
        args.model,
        spec["system"],
        spec["userTemplate"].replace("{{text}}", SAMPLE),
        "grammar_issues",
        spec["schema"],
        spec["maxTokens"],
        spec["temperature"],
        not args.no_schema,
        args.timeout,
    )
    issues = result.get("issues")
    if not isinstance(issues, list) or not issues:
        raise SystemExit(f"FAIL grammar: expected a non-empty issues list, got {result!r}")
    exact = 0
    for issue in issues:
        start, end, original = issue.get("start"), issue.get("end"), issue.get("original", "")
        if isinstance(start, int) and isinstance(end, int) and SAMPLE[start:end] == original:
            exact += 1
        located = original and original in SAMPLE
        print(
            f"  - [{issue.get('category')}] {original!r} -> {issue.get('replacement')!r}"
            f" ({'offsets ok' if SAMPLE[start:end] == original else 'located by text' if located else 'unlocatable'})"
        )
    print(f"PASS grammar: {len(issues)} issues, {exact} with exact offsets, {elapsed_ms} ms, model={model}")


def check_rewrites(args, base_url, api_key):
    spec = PROMPTS["rewrite"]
    modes = args.modes.split(",") if args.modes else list(spec["modes"].keys())
    for mode in modes:
        user = spec["userTemplate"].replace("{{instruction}}", spec["modes"][mode]).replace("{{text}}", SAMPLE)
        result, elapsed_ms, _ = chat(
            base_url,
            api_key,
            args.model,
            spec["system"],
            user,
            "rewrite",
            spec["schema"],
            spec["maxTokens"],
            spec["temperature"],
            not args.no_schema,
            args.timeout,
        )
        rewritten = result.get("rewritten")
        if not isinstance(rewritten, str) or not rewritten.strip():
            raise SystemExit(f"FAIL rewrite[{mode}]: {result!r}")
        print(f"PASS rewrite[{mode}] {elapsed_ms} ms: {rewritten}")


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--base-url", help="OpenAI-compatible base URL, e.g. https://api.runpod.ai/v2/<id>/openai/v1")
    parser.add_argument("--endpoint-id", help="RunPod Serverless endpoint id")
    parser.add_argument("--api-key", help="Defaults to $CAIM_API_KEY, then $RUNPOD_API_KEY")
    parser.add_argument("--model", default=PROMPTS["servedModelName"])
    parser.add_argument("--timeout", type=float, default=300, help="Seconds; serverless cold starts can take minutes")
    parser.add_argument("--no-schema", action="store_true", help="Skip response_format json_schema")
    parser.add_argument("--modes", help="Comma-separated rewrite modes (default: all)")
    parser.add_argument("--grammar-only", action="store_true")
    args = parser.parse_args()

    api_key = args.api_key or os.environ.get("CAIM_API_KEY") or os.environ.get("RUNPOD_API_KEY")
    if not api_key:
        sys.exit("Set --api-key, CAIM_API_KEY or RUNPOD_API_KEY")
    base_url = base_url_from_args(args)
    print(f"Endpoint: {base_url}  model: {args.model}")
    try:
        check_grammar(args, base_url, api_key)
        if not args.grammar_only:
            check_rewrites(args, base_url, api_key)
    except urllib.error.HTTPError as error:
        sys.exit(f"FAIL HTTP {error.code}: {error.read().decode(errors='replace')[:500]}")
    except urllib.error.URLError as error:
        sys.exit(f"FAIL network: {error.reason}")
    except (http.client.HTTPException, ConnectionError, TimeoutError) as error:
        sys.exit(f"FAIL network: {error!r}")
    except (KeyError, IndexError, json.JSONDecodeError) as error:
        sys.exit(f"FAIL unexpected response: {error!r}")


if __name__ == "__main__":
    main()
