# 0022. OpenAI Vision 2단계 점수 확정 — 규칙 기반 1차 산출 + OpenAI 최종 확정

- 상태: **수락**
- 날짜: 2026-08-15
- 담당: B
- 관련: [ADR 0002](0002-피부-지표-체계.md) · [ADR 0003](0003-AI-분석-목업-우선.md) · [ADR 0020](0020-규칙-기반-로컬-비전-분석.md)

## 맥락

OpenAI를 피부 분석에 쓰는 경로가 두 갈래로 나뉘어 있었다.

1. `ai-server/`(FastAPI) — MediaPipe·OpenCV로 CIELAB 규칙 기반 점수를 산출(ADR 0020). OpenAI를
   비롯한 어떤 LLM/VLM도 쓰지 않는다.
2. Spring `OpenAiSkinAnalysisClient` — `provider=openai`일 때 활성화되어, ai-server와 무관하게
   gpt-4o에 이미지를 통째로 보내 점수를 독자적으로 산출한다.

즉 "OpenAI로 점수를 낸다"는 경로가 이미 있었지만 규칙 기반 파이프라인과 완전히 분리돼 있어
근거 없는 판단이 되기 쉬웠고, 점수 산출 로직이 두 서버(Spring/ai-server)에 흩어져 있었다.

## 결정

**OpenAI Vision을 ai-server 내부의 2차 확정 단계로 통합한다.** CIELAB 규칙 기반 1차 점수
(`app/metrics.py`)를 근거로 OpenAI Vision(`gpt-4o`)에 함께 전달하고, 최종 점수는 OpenAI 판단을
**클램핑 없이** 그대로 신뢰한다(`app/vision.py`).

```
ai-server/app/pipeline.py
  이미지 디코딩 → 얼굴 검출 → 피부 마스킹 → 화이트밸런스/품질 게이트
    → metrics.compute()        1차 점수 (CIELAB 규칙 기반)
    → vision.refine()          2차 확정 (OpenAI Vision, temperature=0)
         ├ 성공 → OpenAI 점수를 최종값으로 반환
         └ 실패/타임아웃/비신뢰 응답 → VisionUnavailableError → 1차 점수로 폴백
```

세부 설계:

- `temperature=0`으로 호출해 같은 입력에 대한 변동을 최소화한다.
- OpenAI에 보내는 이미지는 별도 크롭 없이 **전체 프레임**(화이트밸런스 보정 + 얼굴 스케일
  정규화된 `prepared` 배열)이다. 피부 마스크로 크롭/마스킹하면 부자연스러운 이미지가 되어
  GPT-4o Vision의 사전학습 분포에서 벗어날 위험이 있다고 판단했다.
- `pores_reliability`(`"LOW"`/`"NORMAL"`)는 OpenAI에 재위임하지 않고 규칙 기반 판정
  (`_PORES_NOISE_FLOOR`)을 그대로 최종 결과에 남긴다. 이 임계값은 촬영 조건별 실측 통계로
  정의된 것이라 LLM이 그 근거를 알지 못하기 때문이다.
- OpenAI 호출이 실패·타임아웃·비신뢰 형식 응답이면 1차 규칙 기반 점수로 폴백하고 200 응답을
  유지한다. 외부 API 장애가 분석 전체를 실패시키지 않아야 한다.
- 응답 스키마(`SkinScores`, `AnalysisResult`, `AnalyzeResponse`)는 필드 변경 없이 그대로
  유지한다 — 이번 결정은 "누가/어떻게 점수를 확정하는가"만 바꾼다.

Spring의 `OpenAiSkinAnalysisClient`와 `provider=openai` 옵션은 **폐기**한다. `SkinAnalysisClient`
구현체는 `mock`(`MockSkinAnalysisClient`), `local-vision`(`LocalVisionSkinAnalysisClient`,
ai-server 호출) 2종만 남는다. OpenAI 활용은 전부 `local-vision` 경로(ai-server 내부) 안에서
이루어진다.

## 근거

1. **점수 산출 로직이 한 서버(ai-server)에 응집된다.** "이 점수가 왜 나왔는지" 추적할 지점이
   하나로 줄어든다 — 전에는 Spring의 OpenAI 클라이언트와 ai-server의 규칙 기반 로직이 서로
   무관하게 점수를 냈다.
2. **순수 규칙 기반의 한계를 OpenAI로 보완한다.** ADR 0020이 명시한 대로 CIELAB 구간값은
   합성 이미지 실측 기반 초기값에 불과하다. OpenAI Vision의 실사진 학습 지식이 이 한계를
   보완하는 근거 있는 두 번째 판단을 제공한다.
3. **Spring의 이중 이미지 읽기 책임을 없앤다.** 기존 `OpenAiSkinAnalysisClient`는
   `LocalImageStorage`가 저장한 파일을 다시 읽어 base64 인코딩해야 했다. ai-server는 이미
   이미지를 들고 있는 지점(전처리 직후)에서 바로 이어붙일 수 있어 이 책임이 사라진다.

## 대안 검토

- **현행 유지(두 경로 병존)**: 기각. provider 3종(mock/local-vision/openai)을 유지하는 관리
  비용과, "OpenAI를 어디서 쓰는지" 팀 내 혼란이 이득보다 컸다.
- **OpenAI 단독 판단(규칙 기반 생략)**: 기각. 1차 점수라는 설명 가능한 근거를 잃고, ai-server의
  기존 전처리(얼굴 검출·정렬·품질 게이트) 투자를 무력화한다.
- **Spring에서 ai-server 결과와 OpenAI 결과를 합성**: 기각. 점수 확정 로직이 두 서버에 걸쳐
  복잡해지고, ai-server가 이미 전처리된 이미지를 들고 있는데 Spring이 다시 이미지를 읽어야
  하는 비효율이 반복된다.

## 알려진 한계 (의도적으로 받아들인 트레이드오프)

- **클램핑이 없어 1차 점수와 크게 다른 값이 나올 수 있다.** 반복 촬영 시 점수 변동성이
  커질 위험이 있고, 이는 ADR 0020이 강조한 "타인과 비교가 아니라 자기 자신과 비교"라는 목적에
  리스크가 될 수 있다. 실사용 데이터로 이 변동성을 재검증해야 한다.
- ADR 0020의 알려진 한계(의학적 정확도 미보장, PORES 신뢰도 낮음, 조명/화질 민감성)는 1차
  산출 단계에 그대로 남아 있다 — OpenAI 확정은 이를 보완할 뿐 제거하지 않는다.
- OpenAI 호출 비용·지연이 모든 정상 요청에 추가된다. 실패 시에만 폴백하므로 평상시에는 항상
  이 비용을 진다.

## 결과

- `ai-server/app/vision.py` 신설, `app/pipeline.py`가 `metrics.compute()` 이후
  `vision.refine()`을 호출하도록 통합했다.
- `ai-server/.env`(gitignore 대상)에 `OPENAI_API_KEY` 등을 설정한다. 비어 있으면 자동으로
  1차 점수 폴백 경로를 탄다 — 키 없는 로컬/CI 환경에서도 서버가 정상 동작한다.
- Spring의 `OpenAiSkinAnalysisClient.java`와 대응 테스트를 삭제했다. `application.yml`의
  `app.skin.analysis.openai.*` 설정 블록을 제거했다. `provider=openai`로 기동하면 매칭되는
  `SkinAnalysisClient` 빈이 없어 기동이 실패한다(의도된 안전장치).
- `AnalysisMethod` enum의 `AI` 값은 삭제하지 않고 유지한다(DB 마이그레이션·기존 데이터 영향이
  없는 값 제거는 위험 대비 이득이 적다). 현재 어떤 구현체도 이 값을 반환하지 않는다.

## 갱신한 문서

- `docs/decisions/README.md` — 목록에 본 ADR 추가, ADR 0020 상태에 관계 표기
- `docs/기능명세서.md` — F-SKIN-04 외부 연동 서술
- `docs/STATUS.md` — provider 2종 반영, OpenAI 연동 위치 정정
- `backend/README.md` — 환경변수 표·실행 예시
- `ai-server/README.md` — 2차 확정 단계, `.env` 설정 안내
