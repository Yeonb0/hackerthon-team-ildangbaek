# AI 분석 서버 (규칙 기반 비전)

얼굴 사진에서 피부 지표 4종(트러블 · 홍조 · 모공 · 색소잡티)을 산출하는 FastAPI 서버다.
Spring Boot의 `LocalVisionSkinAnalysisClient`가 이 서버를 호출한다.

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
.venv/bin/pip install pytest httpx
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
# {"scores":{"TROUBLE":81,"REDNESS":62,"PORES":47,"PIGMENTATION":90}}
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
- [ ] Phase 3 — 조명 · 화질 정규화
- [ ] Phase 4 — 지표별 점수 산출
- [ ] Phase 5 — 일관성 검증
