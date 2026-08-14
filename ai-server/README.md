# AI 분석 서버 (규칙 기반 비전)

얼굴 사진에서 피부 지표 4종(트러블 · 홍조 · 모공 · 색소잡티)을 산출하는 FastAPI 서버다.
Spring Boot의 `LocalVisionSkinAnalysisClient`가 이 서버를 호출한다.

## 신뢰도 (실측)

`tests/test_consistency.py` 실측 기준. 정답 데이터가 없어 정확도는 검증할 수 없지만, 아래는
"같은 얼굴이 조건만 바뀌었을 때 점수가 얼마나 흔들리는가"를 잰 값이다.

| 지표 | 연속 촬영(센서 노이즈) | 조명 색온도 | 신뢰도 |
| --- | --- | --- | --- |
| REDNESS | spread 0 | diff 8 | 높음 |
| TROUBLE | spread 0 | diff 0 | 높음 |
| PIGMENTATION | spread 1 | diff 0 | 높음 |
| PORES | spread 0 (구간 재조정 후) | - | **원리적으로 낮음** — 응답에 `pores_reliability` 필드로 별도 표시 |

**PORES는 점수만으로 신뢰도를 판단하면 안 된다.** 카메라 노이즈·JPEG 압축 아티팩트가 모공
텍스처와 같은 주파수 대역에 있어 원리적으로 완전히 분리되지 않는다. `PORES_RANGE`를 넓혀
(`app/metrics.py`) 정상 촬영 잡음으로 인한 흔들림(spread 8 → 0)은 줄였지만, 측정값이 여전히
"노이즈인지 실제 모공 상태인지 구분 안 되는 구간"에 있을 때는 응답의 `pores_reliability`가
`LOW`로 내려간다. 점수를 지어내는 대신 신뢰도를 함께 알려주는 방식을 택했다 — "낮은 신뢰도의
점수"와 "점수 없음"은 다른 정보라 후자로 뭉개면 정보 손실이다.

**TROUBLE은 백분위 99.9를 쓴다(99가 아니라).** 좁쌀만 한 여드름(반지름 2px급)은 피부 전체
픽셀의 0.2%도 안 돼서 상위 1% 컷오프(p99) 안에 들어오지 못하고 clean 사진과 구분 없이
사라졌다(실측). p99.9로 바꿔 작은 반점도 잡히게 했지만, 대신 **반점 "개수·중증도"에 따른
세밀한 순위는 이 신호로 보장하지 않는다** — p99.9는 상위 0.1%(사실상 가장 튀는 반점 1~2개)만
반영하므로, JPEG 압축까지 거치면 반점 1~14개 사이에서 점수가 순서 없이 흔들린다(실측
1760~1955). "트러블 있음/없음"의 굵은 경계만 신뢰할 수 있다.

**REDNESS도 평균이 아니라 백분위(85)를 쓴다.** 홍조는 볼 전체에 고르게 퍼지기보다 뺨 중심에
몰리는 경우가 많은데, 평균을 쓰면 국소 홍조가 주변 정상 피부에 희석된다 — 실제 붉기가 정상의
6배(a*=32)인 국소 홍조가 평균으로는 9.4까지 떨어져 56점(양호)으로 나왔다(실측). 백분위로
바꾼 뒤 같은 케이스가 5점으로 잡힌다.

**PIGMENTATION은 백분위 99.6을 쓴다.** 처음엔 98이었는데, 작은 반점(반경 5px급)이 상위 2%
컷오프에도 못 들어 clean과 구분되지 않는 문제가 TROUBLE과 같은 이유로 있었다. 다만 TROUBLE처럼
99.9까지는 올릴 수 없었다 — 그 지점에서는 `skin_mask`의 얼굴 윤곽 경계 근처에 남는 잔여 명암
(조명이 치우칠 때 특히 두드러짐)이 실제 반점 신호보다 커져, **반점 없는 정상 얼굴이 웜조명만
받아도 반점 있는 얼굴보다 나쁜 점수를 받는 역전이 실측으로 확인됐다.** 이를 고치기 위해
`face_regions.skin_mask`의 경계 침식도 5px에서 10px로 늘렸다. 두 조정을 함께 적용해 조명
강건성과 작은 반점 검출을 동시에 확보했지만, 아주 작은 반점(1개, 반경 5px급)은 정상 얼굴의
자연 변동과 마진이 좁아(raw 15.56 vs clean 상한 14.9) 안정적으로 잡힌다고 보장하지 못한다 —
`tests/test_metrics.py`의 회귀 테스트는 반점 3개 기준으로 검증한다.

네 지표(REDNESS p85, PIGMENTATION p99.6, TROUBLE p99.9, PORES는 표준편차)가 모두 "국소
이상치가 넓은 정상 영역에 희석되지 않게" 잡는 같은 철학을 쓴다. 백분위 값이 다른 건 각 증상이
퍼지는 넓이와 배경 아티팩트에 대한 민감도가 다르기 때문이다 — 홍조가 가장 넓게, 여드름이 가장
좁게 나타나고, 색소침착은 마스크 경계 아티팩트 때문에 극단적으로 높은 백분위를 쓰지 못한다.

REDNESS와 TROUBLE은 서로 다른 신호를 쓴다(REDNESS는 볼의 붉기, TROUBLE은 국소적으로 붉으면서
*동시에* 어두운 영역). 실측상 트러블만 있는 얼굴은 TROUBLE 8 / REDNESS 88, 균일한 홍조만 있는
얼굴은 TROUBLE 100 / REDNESS 51로 서로 오판하지 않는다. 다만 **구간값은 모두 합성 얼굴
실측으로만 잡혀 있어**, 실제 사진에서도 이 분리가 유지되는지는 검증하지 않았다.

## 무엇이 아닌가

**딥러닝 모델이 아니다.** MediaPipe(얼굴 검출)와 OpenCV(영상처리)를 쓴 **규칙 기반 근사치**다.
학습 데이터가 없어 모델 학습이 불가능한 상태에서 선택한 방식이며, 한계는 다음과 같다.

- 의학적 정확도를 보장하지 않는다. 검증할 정답 데이터가 없다.
- 조명 · 화질 · 각도에 민감하다. 전처리로 억제하지만 제거하지는 못한다.
- 목표는 절대 점수가 아니라 **같은 사람의 변화 방향**을 일관되게 잡아내는 것이다.

## 실행

```bash
cd ai-server
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
./scripts/download_model.sh          # 얼굴 랜드마크 모델(3.7MB) 내려받기
.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Python 3.14 기준으로 의존성 설치를 확인했다. `mediapipe`는 0.10.x 계열이 3.14용 휠을 내지 않아
1.0.0을 쓴다. 1.0.0에는 예전 `mp.solutions` API가 없어 Tasks API(`FaceLandmarker`)를 쓴다.

모델 파일은 저장소에 넣지 않는다(`models/`는 gitignore). 경로를 바꾸려면
`LANDMARKER_MODEL_PATH` 환경변수를 쓴다.

## 테스트

```bash
.venv/bin/pip install -r requirements-dev.txt
.venv/bin/python -m pytest
```

실제 얼굴 사진은 개인정보라 저장소에 두지 않는다. 테스트는 MediaPipe가 얼굴로 인식하는
합성 이미지(`tests/conftest.py`의 `draw_face`)를 그려서 쓴다. 점수의 절대값을 검증하는 데는
쓸 수 없지만, 파이프라인이 끝까지 도는지와 마스크가 올바른 부위를 잡는지는 확인할 수 있다.

## 엔드포인트

| 메서드 | 경로 | 설명 |
| --- | --- | --- |
| GET | `/health` | 헬스 체크 |
| POST | `/analyze` | `image` multipart 파일을 받아 지표 4종 점수 반환 |

```bash
curl -X POST http://127.0.0.1:8000/analyze -F "image=@face.jpg"
# {"scores":{"TROUBLE":81,"REDNESS":62,"PORES":47,"PIGMENTATION":90},"pores_reliability":"NORMAL"}
```

실패는 422와 본문 `code`로 알린다. HTTP 상태만으로는 사유를 구분할 수 없어 코드로 분기한다.

| code | 의미 | Spring 매핑 |
| --- | --- | --- |
| `FACE_NOT_DETECTED` | 얼굴을 찾지 못함 | `SKIN_FACE_NOT_DETECTED` |
| `IMAGE_QUALITY_TOO_LOW` | 흐림 · 과노출 등 품질 미달 | `SKIN_FACE_NOT_DETECTED` |
| `ANALYSIS_FAILED` | 그 외 분석 실패 | `SKIN_ANALYSIS_FAILED` |

## Spring 연동

`backend`에서 provider를 바꾸면 이 서버를 쓴다.

```bash
export SKIN_ANALYSIS_PROVIDER=local-vision
export LOCAL_VISION_BASE_URL=http://localhost:8000   # 기본값
```

저장되는 `SkinRecord.analysisMethod`는 `API`다. 목업(`MOCK`)이나 외부 VLM(`AI`)과 구분된다.

## 구현 단계

- [x] Phase 1 — FastAPI 골격 + Spring 연동 (고정 점수)
- [x] Phase 2 — MediaPipe 얼굴 검출 · 피부 영역 마스킹 · ROI 분할
- [x] Phase 3 — 조명 · 화질 정규화
- [x] Phase 4 — 지표별 점수 산출
- [x] Phase 5 — 일관성 검증
