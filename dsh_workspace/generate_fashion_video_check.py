#!/usr/bin/env python3
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))
from generate_fashion_video import ASSETS, PROMPT  # noqa: E402


def main() -> None:
    assert PROMPT.startswith("4K photoreal")
    assert (ASSETS / "穿搭首帧.png").is_file()
    assert (ASSETS / "黑白深度视频.mp4").is_file()
    proc = subprocess.run(
        [sys.executable, str(ROOT / "generate_fashion_video.py"), "--help"],
        check=True,
        capture_output=True,
        text=True,
    )
    assert "--mode" in proc.stdout
    print("ok")


if __name__ == "__main__":
    main()
