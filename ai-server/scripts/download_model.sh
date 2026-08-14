#!/usr/bin/env bash
# MediaPipe Face Landmarker 모델을 내려받는다.
# 바이너리(3.7MB)를 저장소에 넣지 않기 위해 설치 시점에 받는다.
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/models"
DEST="$DIR/face_landmarker.task"
URL="https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task"

mkdir -p "$DIR"

if [ -f "$DEST" ]; then
  echo "이미 있음: $DEST"
  exit 0
fi

echo "내려받는 중: $URL"
curl -fSL -o "$DEST" "$URL"
echo "완료: $DEST"
