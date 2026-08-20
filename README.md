<div align="center">

<img src="https://github.com/user-attachments/assets/62847420-51b3-4ac9-912e-c34196f3506b" alt="SKINTELLER" width="85%" />

# 🧴 SkinTeller

### 화장품에 피부를 맞추는 대신, 내 피부에 맞춘 화장품을 찾아주는 개인 맞춤형 피부 프로파일 서비스

일반적인 성분 정보가 아니라, 사용자가 **실제로 사용한 제품 + 이후의 피부 변화 + 환경 정보**를 연결해
"이 성분이 나에게 맞는가"에 대한 개인화된 판단 근거를 제공합니다.

[![Backend](https://img.shields.io/badge/Backend-Spring%20Boot%204.1-6DB33F?logo=springboot&logoColor=white)](backend/README.md)
[![Frontend](https://img.shields.io/badge/Frontend-Expo%2057-000020?logo=expo&logoColor=white)](frontend/README.md)
[![AI Server](https://img.shields.io/badge/AI%20Server-FastAPI-009688?logo=fastapi&logoColor=white)](ai-server/README.md)
[![Java](https://img.shields.io/badge/Java-21-orange?logo=openjdk&logoColor=white)](backend/README.md)
[![TypeScript](https://img.shields.io/badge/TypeScript-React%20Native-3178C6?logo=typescript&logoColor=white)](frontend/README.md)

</div>

---

## 💡 문제 정의

> "분명 리뷰에서는 잘 맞는다고 했는데, 왜 나한테는 안 맞지?"

성분까지 확인하고 신중하게 골라도 **성분 확인 후 구매했지만 사용에 실패한 경험이 46%**,
**최근 1년간 사용을 중단한 화장품이 한 개 이상인 사람이 60%**에 달합니다. 지금의 화장품
정보는 SNS처럼 너무 개인적이거나, 플랫폼 리뷰·평점처럼 너무 일반적이어서 '나'가 아니라
'다수'를 기준으로 제공되기 때문입니다.

그래서 우리는 질문을 바꿨습니다. "다른 사람에게 무엇이 좋았는가"가 아니라 "내 피부에는
무엇이 어떻게 반응했는가"로. 화장품에 피부를 맞추는 것이 아니라 내 피부에 맞춘 화장품을
찾아주는 개인 맞춤형 피부 프로파일 서비스, 그것이 **SkinTeller**입니다.

---

## 📱 앱 화면

### 회원가입 및 온보딩

<div align="center">

| | | |
| --- | --- | --- |
| <img src="https://github.com/user-attachments/assets/84a7ff24-8a67-4474-b2db-687c616a7e33" width="220" /> | <img src="https://github.com/user-attachments/assets/264cbc58-5820-4e4e-ae96-8381de7440c5" width="220" /> | <img src="https://github.com/user-attachments/assets/8c9a6443-2319-4bd8-a1de-420ad23c60fd" width="220" /> |
| <img src="https://github.com/user-attachments/assets/5ea28810-150b-4166-9dfb-92c009af72e0" width="220" /> | <img src="https://github.com/user-attachments/assets/ac7cfc67-8501-4a31-b82c-b261f3d5aab6" width="220" /> | <img src="https://github.com/user-attachments/assets/3efdfd67-8e09-4e7e-be3f-52c041384d52" width="220" /> |

</div>

</div>

### 주요 화면

<div align="center">

<table>
  <tr>
    <td><img src="https://github.com/user-attachments/assets/b3f700d0-0cb7-4565-a703-5731f9ff82fb" width="220" /></td>
    <td><img src="https://github.com/user-attachments/assets/a4bbdb3e-d7aa-447a-a66f-a8e717a4bf97" width="220" /></td>
    <td><img src="https://github.com/user-attachments/assets/0e0fba08-f33b-4a70-9d84-597e65bdd87e" width="220" /></td>
  </tr>
  <tr>
    <td><img src="https://github.com/user-attachments/assets/498e9ef7-5245-4902-bfd2-eddb427e5693" width="220" /></td>
    <td><img src="https://github.com/user-attachments/assets/013c2bfb-6676-4861-b847-6f68ff4348c8" width="220" /></td>
    <td><img src="https://github.com/user-attachments/assets/f35c7b11-5b86-4b12-9154-d9cb6ffce694" width="220" /></td>
  </tr>
  <tr>
    <td><img src="https://github.com/user-attachments/assets/476eafe2-9049-4e24-869d-933df45a6c79" width="220" /></td>
    <td><img src="https://github.com/user-attachments/assets/47b454d4-c298-4bb9-9921-00c68e349882" width="220" /></td>
    <td><img src="https://github.com/user-attachments/assets/80319ce9-cd67-4f59-b12c-cc4c8f262d09" width="220" /></td>
  </tr>
</table>

</div>

---

## 🎯 우리의 솔루션

SKINTELLER는 사용자가 직접 기록한 제품 사용 데이터와 피부 변화를 축적·분석해 개인의 피부
반응을 데이터로 보여주는 맞춤형 피부 프로파일 서비스입니다. 단순히 화장품을 추천하는 서비스가
아니라, 어떤 제품을 썼고 이후 피부가 어떻게 변화했는지를 지속적으로 기록해 시계열 데이터로
축적하고, 이를 통해 대중적 인기나 타인의 리뷰가 아닌 오직 나의 피부 데이터에 기반한
'나만의 성분·제품 반응 프로파일'을 구축합니다.

지금까지의 화장품 선택이 "남들이 좋다고 하니까 구매하는 것"이었다면, SKINTELLER는 "내 피부가
보여준 데이터를 근거로 선택하는 것"을 가능하게 합니다 — 기록이 쌓일수록 정교해지는 피부
프로파일 완성 서비스입니다.

---

## 📌 핵심 기능

**기록 → 분석 → 축적 → 개인화 → 구매**로 이어지는 선순환 구조입니다.

### 1. 제품 · 피부 기록

사용자가 매일 간편하게 기록할 수 있도록 돕습니다.

- **제품 루틴 기록** — 나만의 모닝·나이트 루틴을 저장하고 '바로 기록'할 수 있으며, 새 제품은
  제품 검색·바코드 스캔·직접 등록으로 추가합니다.
- **피부 상태 기록** — 얼굴 사진으로 피부 상태를 기록해 AI 분석의 기준 데이터를 축적합니다.

### 2. AI 피부 분석

기록된 사진을 AI가 분석해 피부 상태를 객관적인 수치로 보여줍니다.

- **4대 지표 분석** — 트러블 · 홍조 · 색소잡티 · 모공을 각각 0~100점으로 분석하고 종합 피부
  점수를 제공합니다.
- **변화 추적** — 첫 기록을 기준으로 이후 피부 상태를 비교하며, 7일·30일 단위 추이를
  확인합니다.

### 3. 개인화 리포트

사용자의 실제 데이터를 기반으로 성분별 개인 피부 반응을 분석합니다.

- **외부 변수 함께 기록** — 자외선·습도·호르몬 정보 등 피부에 영향을 줄 수 있는 요인을 함께
  기록해 제품과 피부 변화의 관계를 보다 정확하게 분석합니다.
- **상관관계 기반 AI 인사이트** — 제품 사용 시점과 피부 변화 시점을 비교해 반복되는 패턴을
  찾아냅니다. 예: "레티놀 세럼 사용 후 2일 뒤 트러블 수치가 반복적으로 증가한다"처럼 개인의
  실제 데이터에 기반한 인사이트를 제공합니다.

### 4. 맞춤형 쇼핑

완성된 피부 프로파일을 실제 화장품 선택에 활용해 분석 결과를 구매로 연결합니다.

- **성분 궁합 확인** — 제품을 검색하거나 바코드로 스캔하면 내 피부 프로파일을 기준으로 성분을
  `잘 맞음 / 지켜보는 중 / 주의 필요`로 구분해 보여줍니다.
- **개인화 제품 추천** — 오늘의 피부 상태에 필요한 성분을 우선 추천하고, 관심 제품은
  위시리스트에 저장해 외부 스토어에서 구매할 수 있도록 연결합니다.

> ⚕️ MVP의 분석 결과는 의학적 인과관계가 아니라 **기록에서 반복 관찰된 연관 패턴**입니다. (PRD 4.3 / 13.3)

---

## 🏗️ 시스템 구성

```
📱 frontend (Expo / React Native)
        │  REST API
        ▼
🖥️  backend (Spring Boot)  ──── 피부 사진 분석 요청 ────▶  🤖 ai-server (FastAPI)
        │                                                     │
        ▼                                                     ▼
   MySQL 8.0                                     MediaPipe·OpenCV 1차 산출
                                                  + OpenAI Vision 2차 확정
```

| 디렉터리 | 역할 | 스택 |
| --- | --- | --- |
| [`backend/`](backend/README.md) | REST API 서버 | Java 21, Spring Boot 4.1, Spring Data JPA, MySQL 8.0 |
| [`frontend/`](frontend/README.md) | iOS / Android 앱 | Expo 57, React Native 0.86, TypeScript, TanStack Query |
| [`ai-server/`](ai-server/README.md) | 피부 분석 AI 서버 | FastAPI, MediaPipe, OpenCV, OpenAI Vision |
| [`docs/`](docs) | 제품 · 설계 문서 | PRD, 기능명세서, API 명세서, ERD, ADR |

각 파트의 상세 실행 방법은 위 링크를 참고하세요.

---

## 🚀 빠른 시작

### 사전 준비

| 도구 | 버전 |
| --- | --- |
| JDK | 21 |
| Node.js | 20 이상 |
| Python | 3.14 (AI 서버 실행 시) |
| Docker | 로컬 MySQL 8.0 구동용 |

### 1. 백엔드

```bash
cd backend
docker compose up -d      # MySQL 8.0
./gradlew bootRun         # http://localhost:8080
```

동작 확인: `GET http://localhost:8080/api/v1/health`

### 2. 프론트엔드

```bash
cd frontend
npm install
cp .env.example .env      # 백엔드 준비 전이면 EXPO_PUBLIC_USE_MOCK=true 유지
npx expo start            # Expo Go 앱으로 QR 스캔
```

### 3. AI 서버

```bash
cd ai-server
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
./scripts/download_model.sh    # 얼굴 랜드마크 모델(3.7MB) 내려받기
cp .env.example .env           # OPENAI_API_KEY 등을 채운다
.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000
```

백엔드에서 연동하려면 `SKIN_ANALYSIS_PROVIDER=local-vision`을 설정합니다. 자세한 내용은 [ai-server/README.md](ai-server/README.md) 참고.

---

## 🧩 기술 스택

| 파트 | 스택 |
| --- | --- |
| **Backend** | Java 21, Spring Boot 4.1.0, Spring Web MVC, Spring Data JPA, Bean Validation, Lombok, MySQL 8.0, Gradle |
| **Frontend** | Expo 57, React Native 0.86, TypeScript, React Navigation 7, TanStack Query 5, zustand, axios, react-native-svg |
| **AI Server** | FastAPI, MediaPipe, OpenCV, OpenAI Vision (gpt-4o) |

---

## 🔌 API 규약 요약

전체 명세는 [docs/api_명세서.md](docs/api_명세서.md), 코드 체계는 [docs/공통응답포맷_예외처리코드.md](docs/공통응답포맷_예외처리코드.md)를 따릅니다.

- Base URL: `/api/v1`
- 인증: `Authorization: Bearer {accessToken}` (예외: `POST /auth/login`, `POST /auth/refresh`)
- 리소스는 복수형 · kebab-case, URI에 동사 금지, `PUT` 미사용
- 저장 API(`/product-records`, `/routines/{id}/records`, `/skin-records`, `/checks`)는 `Idempotency-Key` 헤더로 중복 저장을 방지
- 모든 응답은 동일한 봉투를 사용

```json
{
  "isSuccess": true,
  "code": "COMMON_SUCCESS",
  "message": "조회에 성공했습니다.",
  "result": {}
}
```

### 도메인 구성

| 도메인 | 범위 |
| --- | --- |
| Auth | 로그인 · 토큰 재발급 · 로그아웃 |
| Onboard | 온보딩 단계별 저장 및 완료 |
| User | 프로필 · 위치 · 알림 · 마이페이지 · 성분 프로파일 |
| Home | 낮 · 밤 홈 BFF |
| Record | 기록 허브 · 월간 캘린더 · 오늘 슬롯 상태 |
| Product | 제품 검색 · 스캔 · 성분 · 제품 기록 · 루틴 |
| Skin | 피부 기록 생성 및 AI 분석 · 결과 조회 |
| Check | 구매 전 확인 (위험도 분석) |
| Report | 7일 · 30일 리포트 · 요인 상세 |

---

## 📚 문서

| 문서 | 내용 |
| --- | --- |
| [docs/PRD.md](docs/PRD.md) | 제품 정의, 페르소나, MVP 범위, 성공 지표, 미확정 사항 |
| [docs/기능명세서.md](docs/기능명세서.md) | 기능 ID(F-XXX-NN)별 동작 · 예외 · Acceptance Criteria |
| [docs/api_명세서.md](docs/api_명세서.md) | API Convention 및 엔드포인트 전체 명세 |
| [docs/ERD.md](docs/ERD.md) | 엔티티 · 컬럼 · 관계 정의 |
| [docs/공통응답포맷_예외처리코드.md](docs/공통응답포맷_예외처리코드.md) | 응답 봉투, 성공/에러 코드 체계 |
| [docs/목업 데이터 구조 정의서.md](docs/목업%20데이터%20구조%20정의서.md) | 프론트 목업 데이터 형태 |
| [docs/screen-structure-v3.html](docs/screen-structure-v3.html) | 화면 구조 정의서 v3 (화면 ID S-XX) |
| [docs/decisions/](docs/decisions) | 아키텍처 결정 기록 (ADR) |

문서는 구현의 기준입니다. 코드 · 설정 · API · DB 변경 시 영향받는 문서를 같은 작업에서 갱신합니다.

---

## 📈 시장성 및 실행 전략

### 시장 규모

국내 화장품 시장은 약 17.55조원이며, 이 중 기초화장품 시장만 약 10.09조원에 달합니다. 이 가운데
뷰티 관심도가 높은 20대 여성을 초기 타깃으로, 피부 기록 -> 개인화 추천 -> 구매로 이어지는 사용자
행동과 수익 가능성을 검증합니다. 이후 타깃과 제휴 범위를 단계적으로 확대하여, SKINTELLER는 이미 형성된
거대한 화장품 소비 시장 안에서 '개인화'라는 새로운 기준으로 시장을 확장합니다.


### 수익 구조 — 추천에서 구매까지 연결되는 커머스 모델

핵심 수익모델은 개인화된 제품 추천을 실제 구매로 연결하는 커머스 제휴입니다.

- **① 플랫폼 제휴** — 사용자가 '구매하러 가기'를 통해 올리브영 등 외부 스토어로 이동하면
  어필리에이트 수수료를 확보합니다.
- **② 브랜드 직접 제휴 (B2B)** — 사용자의 피부 프로파일과 궁합이 높은 제품을 우선 노출하고,
  브랜드로부터 광고비·제휴 수수료를 확보합니다. **AAC 소속 브랜드**뿐 아니라 외부 브랜드까지
  포함하는 오픈형 구조로 확장합니다.

즉, 사용자가 많아질수록 → 축적되는 피부 데이터가 많아지고 → 개인화 추천의 가치가 높아지며 →
추천이 실제 구매로 연결되는 구조입니다.

### AAC 연계 — 미래 고객을 선점하는 진입점

SKINTELLER는 개인 피부 데이터를 중심으로 **AAC**의 브랜드와 서비스를 연결하는 새로운 고객
접점이 될 수 있습니다. 20대 여성은 피부 관리에 대한 관심은 높지만, 비용 등의 이유로 아직
클리닉보다는 화장품 구매와 같은 셀프케어를 중심으로 피부를 관리하는 초기 단계에 있습니다.
SKINTELLER는 바로 이 단계에서 사용자를 만나 일상적인 피부 기록과 맞춤형 제품 관리를 제공하며,
전문 관리 이전부터 고객과 관계를 형성합니다.

이후 사용자의 피부 데이터가 축적되고 전문적인 관리의 필요성이 높아지면, 분석 결과를 바탕으로
**DERNA·AMRED 등 AAC 클리닉**으로 자연스럽게 연결할 수 있습니다. 이를 통해 '셀프케어 →
화장품 구매 → 전문 관리'로 이어지는 개인화된 고객 여정을 구축합니다.

즉, SKINTELLER는 단순한 화장품 관리 앱을 넘어, **AAC가 아직 클리닉을 이용하지 않는 20대 고객을
조기에 만나고 장기적인 고객 관계로 확장할 수 있도록 하는 미래 고객 확보의 진입점**입니다.

### 실행 전략 — 작게 시작해 데이터로 확장한다

초기에는 SNS를 통한 콘텐츠 확산으로 타깃 사용자를 확보하고, 이후 단계적으로 확장할 예정입니다.

| 단계 | 목표 |
| --- | --- |
| **단기 · MVP 검증** | 기록 → AI 분석 → 개인 리포트를 통해 사용자의 지속 기록과 데이터 축적 가능성을 검증 |
| **중기 · 커머스 확장** | 개인화 제품·성분 매칭을 고도화하고 플랫폼 및 브랜드 제휴를 확대 |
| **장기 · AAC 생태계 확장** | 클리닉 리퍼럴을 도입하고, 궁극적으로 **WHS Super App**과 연계해 개인 피부 데이터를 기반으로 AAC의 다양한 브랜드·서비스를 연결 |

---

## ✅ 개발 규칙

### 브랜치 · 커밋

- 작업 브랜치: `feat/S-XX-설명` (화면 단위) 또는 `feat/기능명`
- 커밋 메시지에 화면 ID 또는 기능 ID를 답니다 — 예: `feat(S-18): 분석 결과 지표 리스트`
- 화면 하나가 끝나면 로딩 · 빈 데이터 · 에러 · 정상 4가지 상태를 확인한 뒤 병합합니다.

### 프론트-백엔드 계약

- 목업 데이터도 실제 API 응답과 **동일한 형태**로 만듭니다. (PRD 11.1)
- 신규 에러 코드가 필요하면 `docs/공통응답포맷_예외처리코드.md`를 먼저 갱신한 뒤 코드에 반영합니다.
- Enum은 문자열만 사용하고, 빈 목록은 `null`이 아닌 `[]`로 내려줍니다.


---

## 📑 Project Presentation

SkinTeller의 문제 정의부터 서비스 구조, 핵심 기능 및 기술 구현까지 확인할 수 있습니다.

**[→ 발표자료 보기](./docs/SkinTeller_발표자료.pdf)**

---

## Contributors

<table>
  <tr>
    <td align="center">
      <a href="https://github.com/Yeonb0">
        <sub><b>Yeonb0</b></sub>
      </a>
      <br />
      <sub>Frontend</sub>
    </td>
    <td align="center">
      <a href="https://github.com/yxzkng">
        <sub><b>yxzkng</b></sub>
      </a>
      <br />
      <sub>Backend</sub>
    </td>
    <td align="center">
      <a href="https://github.com/jui-ced">
        <sub><b>jui-ced</b></sub>
      </a>
      <br />
      <sub>Backend</sub>
    </td>
    <td align="center">
      <sub><b>김서인</b></sub>
      <br />
      <sub>Design</sub>
    </td>
  </tr>
</table>

<div align="center">

**Team 일당백**

</div>
