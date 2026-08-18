#!/usr/bin/env python3
"""Generate the 7s fashion clip via DashScope Wan (animate-move + optional i2v)."""
from __future__ import annotations

import argparse
import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent
ASSETS = ROOT / "assets"
PROMPT = (ROOT / "prompts" / "03-i2v.md").read_text(encoding="utf-8").strip()
ENV_FILE = ROOT.parent / ".env.local"


def load_env_file(path: Path) -> None:
    if not path.is_file():
        return
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        name, value = line.split("=", 1)
        os.environ.setdefault(name.strip(), value.strip().strip("'\""))


load_env_file(ENV_FILE)
BASE = os.environ.get("DASHSCOPE_BASE_URL", "https://dashscope.aliyuncs.com/api/v1")


def api_key() -> str:
    key = os.environ.get("DASHSCOPE_API_KEY", "").strip()
    if not key:
        raise SystemExit(
            "DASHSCOPE_API_KEY is not set. Export a Bailian key, then rerun:\n"
            "  DASHSCOPE_API_KEY=sk-... python3 dsh_workspace/generate_fashion_video.py"
        )
    return key


def request(method: str, url: str, key: str, body=None, extra_headers=None, timeout=120):
    headers = {"Authorization": f"Bearer {key}"}
    data = None
    if body is not None:
        headers["Content-Type"] = "application/json"
        data = json.dumps(body).encode("utf-8")
    if extra_headers:
        headers.update(extra_headers)
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", "replace")
        raise SystemExit(f"HTTP {exc.code} {url}\n{detail}") from exc


def upload(key: str, model: str, path: Path) -> str:
    # DashScope temp OSS: getPolicy then multipart POST. Ceiling = 48h URL.
    policy_url = f"{BASE}/uploads?{urllib.parse.urlencode({'action': 'getPolicy', 'model': model})}"
    policy = request("GET", policy_url, key)["data"]
    boundary = "----dshboundary"
    stem = path.stem.encode("ascii", "ignore").decode() or "upload"
    filename = f"{stem}{path.suffix}"
    oss_key = f"{policy['upload_dir']}/{filename}"
    fields = [
        ("OSSAccessKeyId", policy["oss_access_key_id"]),
        ("Signature", policy["signature"]),
        ("policy", policy["policy"]),
        ("x-oss-object-acl", policy["x_oss_object_acl"]),
        ("x-oss-forbid-overwrite", policy["x_oss_forbid_overwrite"]),
        ("key", oss_key),
        ("success_action_status", "200"),
    ]
    chunks = []
    for name, value in fields:
        chunks.append(f"--{boundary}\r\n".encode())
        chunks.append(f'Content-Disposition: form-data; name="{name}"\r\n\r\n{value}\r\n'.encode())
    file_bytes = path.read_bytes()
    chunks.append(f"--{boundary}\r\n".encode())
    chunks.append(
        f'Content-Disposition: form-data; name="file"; filename="{filename}"\r\n'
        "Content-Type: application/octet-stream\r\n\r\n".encode()
    )
    chunks.append(file_bytes)
    chunks.append(f"\r\n--{boundary}--\r\n".encode())
    body = b"".join(chunks)
    req = urllib.request.Request(
        policy["upload_host"],
        data=body,
        headers={"Content-Type": f"multipart/form-data; boundary={boundary}"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=180) as resp:
        if resp.status != 200:
            raise SystemExit(f"OSS upload failed: {resp.status} {resp.read()[:400]!r}")
    return f"oss://{oss_key}"


def poll(key: str, task_id: str) -> dict:
    url = f"{BASE}/tasks/{task_id}"
    while True:
        data = request("GET", url, key, timeout=60)
        status = data.get("output", {}).get("task_status")
        print(f"task {task_id} {status}", flush=True)
        if status == "SUCCEEDED":
            return data
        if status in {"FAILED", "CANCELED", "UNKNOWN"}:
            raise SystemExit(json.dumps(data, ensure_ascii=False, indent=2))
        time.sleep(15)


def download(url: str, dest: Path) -> Path:
    dest.parent.mkdir(parents=True, exist_ok=True)
    with urllib.request.urlopen(url, timeout=300) as resp:
        dest.write_bytes(resp.read())
    return dest


def run_move(key: str, image: Path, video: Path, dest: Path) -> Path:
    model = "wan2.2-animate-move"
    image_url = upload(key, model, image)
    video_url = upload(key, model, video)
    created = request(
        "POST",
        f"{BASE}/services/aigc/image2video/video-synthesis",
        key,
        {
            "model": model,
            "input": {"image_url": image_url, "video_url": video_url, "watermark": False},
            "parameters": {"mode": "wan-std", "check_image": True},
        },
        extra_headers={"X-DashScope-Async": "enable", "X-DashScope-OssResourceResolve": "enable"},
    )
    task_id = created["output"]["task_id"]
    done = poll(key, task_id)
    video_url = done["output"]["results"]["video_url"]
    return download(video_url, dest)


def run_i2v(key: str, image: Path, dest: Path) -> Path:
    model = "wan2.6-i2v-flash"
    image_url = upload(key, model, image)
    created = request(
        "POST",
        f"{BASE}/services/aigc/video-generation/video-synthesis",
        key,
        {
            "model": model,
            "input": {"prompt": PROMPT, "img_url": image_url},
            "parameters": {
                "resolution": "1080P",
                "duration": 7,
                "prompt_extend": False,
                "watermark": False,
                "audio": True,
                "shot_type": "single",
            },
        },
        extra_headers={"X-DashScope-Async": "enable", "X-DashScope-OssResourceResolve": "enable"},
    )
    task_id = created["output"]["task_id"]
    done = poll(key, task_id)
    video_url = done["output"].get("video_url") or done["output"].get("results", {}).get("video_url")
    if not video_url:
        raise SystemExit(json.dumps(done, ensure_ascii=False, indent=2))
    return download(video_url, dest)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--mode", choices=("move", "i2v", "both"), default="both")
    args = parser.parse_args()
    image = ASSETS / "穿搭首帧.png"
    video = ASSETS / "黑白深度视频.mp4"
    assert image.is_file() and video.is_file() and PROMPT, "missing assets or i2v prompt"
    key = api_key()
    if args.mode in {"move", "both"}:
        out = run_move(key, image, video, ASSETS / "穿搭展示-动作迁移.mp4")
        print("wrote", out)
    if args.mode in {"i2v", "both"}:
        out = run_i2v(key, image, ASSETS / "穿搭展示-图生视频.mp4")
        print("wrote", out)


if __name__ == "__main__":
    main()
