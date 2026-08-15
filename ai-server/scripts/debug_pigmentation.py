"""실사진에서 PIGMENTATION의 raw 측정값(p99.6)을 뽑아 확인한다.

목적: 최종 점수가 낮게 나오는 원인이 `metrics.PIGMENTATION_RANGE`(합성 이미지로 잡은 구간값)에
있는지, `face_regions.skin_mask` 경계 아티팩트에 있는지를 raw 수치와 마스크 시각화로 구분한다.
`app/metrics.py`, `app/face_regions.py`의 기존 튜닝 근거 주석을 참고해 같은 파이프라인
(디코딩 → 랜드마크 → 스케일 정규화 → 마스크 → white_balance)을 그대로 태운다.

사용법:
    python scripts/debug_pigmentation.py photo1.jpg photo2.jpg ...

각 사진마다 다음을 출력한다:
    - PIGMENTATION_RANGE(15.5~45.0) 대비 raw p99.6 값과 최종 점수
    - 마스크 경계 근처(외곽 15px 띠)에서 dark_p99.6이 나오는지 여부(아티팩트 의심 신호)
    - `<이름>_mask.png`: skin mask와 "주변보다 어두운 정도" 히트맵을 나란히 저장
"""

from __future__ import annotations

import sys
from pathlib import Path

import cv2
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app import face_regions, landmarks, metrics, pipeline, preprocess  # noqa: E402


def _erode(mask: np.ndarray, size: int) -> np.ndarray:
    return cv2.erode(mask, np.ones((size, size), np.uint8))


def inspect(path: Path) -> None:
    image_bgr = cv2.imread(str(path))
    if image_bgr is None:
        print(f"[{path.name}] 읽기 실패")
        return

    points = landmarks.detect(cv2.cvtColor(image_bgr, cv2.COLOR_BGR2RGB))
    image_bgr, points = pipeline._normalize_scale(image_bgr, points)
    masks = face_regions.region_masks(points, image_bgr.shape[:2])
    skin = masks["skin"]
    pigmentation_skin = masks["pigmentation"]

    prepared = preprocess.prepare(image_bgr, skin)
    lab = cv2.cvtColor(prepared, cv2.COLOR_BGR2LAB).astype(np.float32)
    lightness = lab[:, :, 0]

    background = cv2.GaussianBlur(lightness, (0, 0), 15)
    dark = np.clip(background - lightness, 0, None)

    skin_pixels = pigmentation_skin > 0
    raw = float(np.percentile(dark[skin_pixels], 99.6))
    score = metrics._to_score(raw, *metrics.PIGMENTATION_RANGE)

    # 경계 근처 15px 띠만 남긴 마스크로 같은 percentile을 다시 재보고,
    # 안쪽(코어)만 남긴 마스크와 비교해 아티팩트 의심 여부를 가늠한다.
    border_band = cv2.bitwise_and(pigmentation_skin, cv2.bitwise_not(_erode(pigmentation_skin, 15)))
    core = _erode(pigmentation_skin, 15)
    border_pixels = border_band > 0
    core_pixels = core > 0

    border_raw = float(np.percentile(dark[border_pixels], 99.6)) if border_pixels.sum() > 0 else float("nan")
    core_raw = float(np.percentile(dark[core_pixels], 99.6)) if core_pixels.sum() > 0 else float("nan")

    good, bad = metrics.PIGMENTATION_RANGE
    print(f"[{path.name}]")
    print(f"  score={score}  raw(p99.6)={raw:.2f}  range=({good}, {bad})")
    print(f"  core-only raw={core_raw:.2f}  border-band raw={border_raw:.2f}"
          f"  {'← 경계가 더 어둡다(아티팩트 의심)' if border_raw > core_raw else ''}")

    heat = np.clip(dark / max(bad, 1e-6) * 255, 0, 255).astype(np.uint8)
    heat = cv2.applyColorMap(heat, cv2.COLORMAP_JET)
    heat[~skin_pixels] = 0

    side_by_side = np.hstack([
        cv2.cvtColor(skin, cv2.COLOR_GRAY2BGR),
        heat,
    ])
    out_path = path.with_name(f"{path.stem}_mask.png")
    cv2.imwrite(str(out_path), side_by_side)
    print(f"  마스크/히트맵 저장: {out_path}")


def main() -> None:
    if len(sys.argv) < 2:
        print("사용법: python scripts/debug_pigmentation.py <사진1> [사진2] ...")
        raise SystemExit(1)

    for arg in sys.argv[1:]:
        path = Path(arg)
        try:
            inspect(path)
        except Exception as e:  # noqa: BLE001
            print(f"[{path.name}] 실패: {e}")
        print()


if __name__ == "__main__":
    main()
