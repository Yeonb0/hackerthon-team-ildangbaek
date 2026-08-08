# 구현 현황 (STATUS)

> 이 문서는 **실제 구현·검증·배포 상태**를 기록한다. 계획이나 목표가 아니라 **지금 저장소에 있는 것**을 적는다.
> 완료로 표시하려면 코드가 실제로 존재하고 동작이 확인되어야 한다.

- 최종 갱신: 2026-08-08
- 기준 커밋: `fc75701` (feat: 백엔드 구조 초기세팅)
- 기준 브랜치: `yunjin` · 기본 브랜치: `boyeon`

## 상태 표기

| 표기 | 의미 |
| --- | --- |
| ✅ | 구현 완료 · 동작 확인됨 |
| 🟡 | 부분 구현 · 확인 필요 |
| ⬜ | 미착수 |
| ⛔ | 블로커로 인해 착수 불가 |

---

## 1. 한눈에 보기

| 영역 | 상태 | 비고 |
| --- | --- | --- |
| 백엔드 — 공통 인프라 | 🟡 | 응답/예외 envelope는 완비. **인증·스토리지 없음** |
| 백엔드 — 엔티티 · 리포지토리 | ✅ | 전 도메인 정의 완료 |
| 백엔드 — service / controller / dto | ⬜ | **전 도메인 통틀어 0개.** `HealthController` 하나뿐 |
| 프론트엔드 | 🟡 | 기반 레이어 + 공통 컴포넌트 + S-00/S-01. 목업 모드로 동작 |
| 배포 | ⬜ | 미착수. 로컬 실행만 |

**현재 동작이 확인된 백엔드 엔드포인트는 `GET /api/v1/health` 하나다.**

---

## 2. 백엔드

### 2.1 공통 인프라

| 항목 | 상태 | 위치 · 비고 |
| --- | --- | --- |
| 프로젝트 부팅 (Spring Boot 4.1 / Java 21) | ✅ | `build.gradle` |
| 로컬 MySQL 8.0 | ✅ | `docker-compose.yml` · `ddl-auto: update` |
| 공통 응답 envelope | ✅ | `global/response/` — `ApiResponse` · `ResultCode` · `SuccessCode` |
| 예외 처리 · 에러코드 | ✅ | `global/exception/` — **SKIN/ANALYSIS/CHECK/REPORT 코드 정의 완료** |
| JPA Auditing | ✅ | `global/config/JpaAuditingConfig` · `BaseTimeEntity` |
| CORS | 🟡 | `WebConfig` — 개발용 전체 허용. **배포 전 축소 필요** |
| 헬스체크 | ✅ | `GET /api/v1/health` |
| **인증 (JWT · Security)** | ⛔ | **의존성조차 없음.** `spring-boot-starter-security` 미포함, auth 패키지 없음 |
| **이미지 업로드 · 스토리지** | ⬜ | multipart 설정 없음 |
| 날짜 귀속 유틸 | ⬜ | ADR 0005 참조 |

> ⚠️ **인증 부재가 현재 최대 블로커다.** `/health`를 제외한 모든 API가 "인증 필요"이며,
> userId를 획득할 방법이 없어 어떤 도메인 API도 정상 구현할 수 없다.

### 2.2 엔티티 · 리포지토리

전 도메인 엔티티와 기본 리포지토리가 정의되어 있다. **단, 서비스 계층이 없어 실사용 검증은 되지 않았다.**

| 도메인 | 엔티티 | 리포지토리 |
| --- | --- | --- |
| `user` | ✅ User · UserProfile · UserSkinType · SkinType · NotificationSetting (+ enum 6종) | ✅ 5개 |
| `product` | ✅ Product · Ingredient · ProductIngredient · UserProduct (+ enum 3종) | ✅ 4개 |
| `record` | ✅ ProductRecord · ProductRecordItem · SkinRecord · SkinMetric (+ enum 6종) | ✅ 4개 |
| `routine` | ✅ Routine · RoutineProduct (+ enum 1종) | ✅ 2개 |
| `environment` | ✅ DailyEnvironment (+ enum 2종) | ✅ 1개 |
| `analysis` | ✅ IngredientProfile · AnalysisInsight (+ enum 2종) | ✅ 2개 |
| `check` | ✅ ProductRiskAssessment · ProductRiskIngredient (+ enum 1종) | ✅ 2개 |

### 2.3 API 구현 현황

**모두 미착수다.** 아래는 착수 대상 목록이며, 담당은 A(지우) / B(윤진) 분담을 따른다.

#### A 담당 — 서비스 기본 흐름 (지우)

| API | 상태 |
| --- | --- |
| AUTH-01~03 로그인 · 재발급 · 로그아웃 | ⬜ |
| ONBOARD-01~05 온보딩 | ⬜ |
| USER-01 · 03~07 마이페이지 · 프로필 · 위치 · 알림 | ⬜ |
| HOME-01 홈 조회 | ⬜ |
| RECORD-01~02 기록 허브 | ⬜ |
| PRODUCT-01~08 제품 검색 · 상세 · 기록 · 루틴 | ⬜ |

#### B 담당 — 분석 흐름 (윤진)

| API | 상태 | 선행 조건 |
| --- | --- | --- |
| SKIN-01 피부 기록 생성 및 분석 | ⛔ | 인증 · 스토리지 |
| SKIN-02 오늘 피부 결과 조회 | ⛔ | 인증 |
| SKIN-03 피부 기록 상세 조회 | ⛔ | 인증 |
| F-ANALYSIS-01 성분-피부 시차 분석 | ⬜ | SKIN-01 · 제품 기록(A) |
| F-ANALYSIS-02 환경 요인 보정 | ⬜ | `DailyEnvironment` 적재(A · HOME-01) |
| F-ANALYSIS-03 호르몬 요인 반영 | ⬜ | 우선순위 L · **후순위** |
| F-ANALYSIS-04 성분 프로파일 갱신 | ⬜ | F-ANALYSIS-01 |
| F-ANALYSIS-05 프로파일 완성도 계산 | ⬜ | F-ANALYSIS-04 |
| CHECK-01 쇼핑 홈 | ⬜ | 프로파일 · `ProductRepository`(A) |
| CHECK-02 위험도 분석 | ⬜ | 프로파일 |
| CHECK-03 확인 결과 조회 | ⬜ | CHECK-02 |
| USER-02 성분 프로파일 전체 조회 | ⬜ | 프로파일 |
| REPORT-01 리포트 조회 | ⬜ | SKIN-01 · 인사이트 |
| REPORT-02 요인 상세 조회 | ⬜ | F-ANALYSIS-01 |
| REPORT-03 일자별 리포트 조회 | ⬜ | SKIN-01 |

---

## 3. 프론트엔드

| 항목 | 상태 | 비고 |
| --- | --- | --- |
| Expo 프로젝트 부팅 · 폴더 구조 | ✅ | `14915dd` |
| 기반 레이어 (테마 · 스케일 · API · 네비게이션) | ✅ | `abc043a` |
| 공통 컴포넌트 9종 + 개발용 카탈로그 | ✅ | `f1d1c6a` |
| S-00 로그인 (목업 연동 · 자동 로그인 분기) | ✅ | `1258c14` |
| S-01 기본 정보 입력 | ✅ | `1258c14` |
| 그 외 화면 (S-02~S-24) | ⬜ | |
| 백엔드 실연동 | ⬜ | `EXPO_PUBLIC_USE_MOCK=true` — **현재 전부 목업** |

---

## 4. 문서

| 문서 | 상태 | 비고 |
| --- | --- | --- |
| `docs/PRD.md` | ✅ | |
| `docs/기능명세서.md` | ✅ | TBD 항목 13장에 정리됨 |
| `docs/api_명세서.md` | ✅ | TBD-10b · TBD-11 · TBD-12 미해결 |
| `docs/ERD.md` | ✅ | ADR 0002 반영 완료 (7장 `metric_type` 4종) |
| `docs/공통응답포맷_예외처리코드.md` | ✅ | 8.1 날짜 귀속 규칙 확정됨 |
| `docs/목업 데이터 구조 정의서.md` | ✅ | |
| `docs/decisions/` | 🟡 | ADR 0001~0005 작성. **0005는 `제안` 상태** |
| `docs/STATUS.md` | ✅ | 이 문서 |
| `README.md` | ✅ | ADR 0002 반영 완료 (지표 소개 문구) |
| `backend/README.md` | 🟡 | 스토리지 · 분석 provider 설정 추가 필요 |

---

## 5. 미해결 · 블로커

우선순위 순.

| # | 항목 | 영향 | 담당 |
| --- | --- | --- | --- |
| 1 | **인증 인프라 부재** | 전 도메인 API 착수 불가 | A(지우) · B는 대기 또는 임시 방편 |
| 2 | 날짜 귀속 유틸 소유권 | A·B 중복 구현 시 분석 정확도 훼손 | ADR 0005 — **합의 필요** |
| 3 | 이미지 스토리지 미결정 | SKIN-01 착수 불가 | B(윤진) |
| 4 | 리포트 일자별 대표값 규칙 (TBD-12) | REPORT-01 | 명세상 "나이트 우선" 제안 · 확정 필요 |
| 5 | 리포트 요인 상세의 `metric` 전환 지원 여부 (TBD-11) | REPORT-02 | 응답 필드는 이미 포함됨 |
| 6 | `MORNING` 슬롯 시각 불일치 요청 처리 | SKIN-01 · PRODUCT-05 | ADR 0005 미해결 항목 |
| 7 | 제품 직접 등록 (F-PRODUCT-08) | 우선순위 L | 명세 미정 |

---

## 6. 배포 · 운영

| 항목 | 상태 |
| --- | --- |
| 로컬 실행 (백엔드 · 프론트) | ✅ |
| 원격 DB | ⬜ |
| 서버 배포 | ⬜ |
| CI | ⬜ |
| 마이그레이션 도구 (Flyway 등) | ⬜ · 현재 `ddl-auto: update`에 의존 |

---

## 갱신 규칙

`CLAUDE.md`의 Documentation Synchronization을 따른다. 코드 · 설정 · API · 인증 · DB · 마이그레이션 · 운영
변경이 있을 때 **같은 작업 단위에서** 이 문서를 갱신한다. 완료 표시는 **동작 확인 후에만** 한다.
