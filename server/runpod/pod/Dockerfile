# Always-on CAIm grammar server for a RunPod GPU Pod (vLLM OpenAI server).
# Build:  docker build -t <you>/caim-grammar-pod:latest server/runpod/pod
# Run on a Pod with a 24 GB GPU, HTTP port 8000 exposed and a volume at /workspace.
FROM vllm/vllm-openai:v0.30.0

ENV MODEL_NAME=Qwen/Qwen2.5-7B-Instruct \
    SERVED_MODEL_NAME=caim-grammar \
    MAX_MODEL_LEN=4096 \
    GPU_MEMORY_UTILIZATION=0.92 \
    MAX_NUM_SEQS=32 \
    PORT=8000 \
    HF_HOME=/workspace/hf

COPY entrypoint.sh /usr/local/bin/caim-entrypoint.sh
RUN chmod +x /usr/local/bin/caim-entrypoint.sh

EXPOSE 8000
ENTRYPOINT ["/usr/local/bin/caim-entrypoint.sh"]
