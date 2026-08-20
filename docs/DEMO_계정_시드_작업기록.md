# 데모 계정 시드 데이터 작업 기록

- 작업일: 2026-08-20
- 대상 서버: 가비아 클라우드 `1.201.116.200:8080` (백엔드), 동일 서버 로컬 MySQL(`ildangbaek`)
- 목적: 안드로이드로 접속할 데모 계정 생성 + 루틴 구성 + 지난 1주일 피부기록/제품기록 시드 삽입
- TestFlight(iOS)와 안드로이드 preview 빌드는 EAS `preview` 환경변수를 공유하므로, 이 서버에 만든 계정은 두 플랫폼 어디서 로그인해도 동일하게 보인다.

## 진행 배경

- API만으로는 루틴-제품 연결(`routine_products`를 쓰는 엔드포인트가 백엔드에 없음)과 과거 날짜 기록 삽입(`skin_records`/`product_records` 모두 서버가 `LocalDate.now()`로 날짜를 강제, 요청 필드에 날짜 override 없음)이 불가능하다고 사전 조사에서 확인됨.
- 이 때문에 DB에 직접 SQL을 실행하는 방식으로 진행. SSH로 가비아 서버에 접속해 로컬 MySQL(`localhost:3306`)에 붙어 작업.

## 1. 기존 제품 데이터 정리

`products` 테이블 조회 결과 테스트 중 만들어진 것으로 보이는 한 글자짜리 쓰레기 제품명(예: "어", "아이", "Fg")과 브랜드명 없는 제품("어성초")이 섞여 있었음.

- `user_products`, `product_record_items`에서 이미 참조 중인 항목이 있어 **삭제 대신 비활성화**로 처리.
- 대상: product id `5, 6, 7, 8, 9, 10, 11, 12, 14` → `active = 0` UPDATE.
- id `13`(토리든 세럼)은 정상 제품으로 판단해 유지.

## 2. 올리브영 기초 제품 9종 신규 등록

사용자가 제공한 실제 제품/전성분 정보를 바탕으로 `products` + `product_ingredients` + `ingredients`에 등록.

- 중복 방지: "라운드랩 1025 독도 토너"는 기존 id=1과 동일 제품으로 판단해 **신규 등록하지 않고 기존 레코드 재사용**.
- 각 제품은 전성분표 앞쪽 **핵심 성분 3개**만 `key_ingredient=1`로 연결(기존 샘플 제품과 동일한 패턴에 맞춤). 나머지 전성분은 저장하지 않음.
- 신규 성분 5개(`프로판다이올`, `다이프로필렌글라이콜`, `세틸에틸헥사노에이트`, `마트리카리아꽃수`, `락토바실러스발효물`)를 `ingredients`에 추가, 기존 성분(정제수/부틸렌글라이콜/글리세린 등)은 재사용.

등록된 제품 (id 15~23):

| id | product_name | brand_name | category |
|---|---|---|---|
| 15 | 다이브인 저분자 히알루론산 세럼 | 토리든 | SERUM |
| 16 | XMD 스템3 클리니컬 리커버리 세럼 | 아이오페 | SERUM |
| 17 | 제로이드 수딩 크림 | 제로이드 | CREAM |
| 18 | 메디힐 에센셜 마스크팩 [마데카소사이드] | 메디힐 | MASK |
| 19 | 다이브인 저분자 히알루론산 토너 | 토리든 | TONER |
| 20 | 클래리파이 겔 토너 | 피쓰 | TONER |
| 21 | 블루 리페어 하이드로 수딩 크림 | 피쓰 | CREAM |
| 22 | 코어 리빌드 크림 | 피쓰 | CREAM |
| 23 | 블루 리페어 솔루션 | 피쓰 | MASK |

원본 입력([docs/DEMO_제품_입력.md](DEMO_제품_입력.md))에서 정정한 부분:
- "블루 리페어 솔루션" 행: 표 열 순서가 brand_name/category 자리에서 어긋나 있어 브랜드=피쓰, 카테고리=MASK로 정정.
- "1,2-산다이 올" → "1,2-헥산다이올" 오탈자로 판단해 정정 후 반영(단, 성분 자체는 핵심 3개 안에 들지 않아 실제 DB에는 포함되지 않음).

## 3. 데모 계정 생성 (API)

이메일 회원가입 플로우로 생성 (DB 직접 삽입이 아니라 정식 API 경로 사용 — 비밀번호 해시 등 백엔드 로직을 그대로 타야 하므로).

```
POST /auth/email/send-code      { "email": "demo@naver.com" }
POST /auth/email/verify-code    { "email": "demo@naver.com", "code": "123456" }  # mock 고정 코드
POST /auth/email/signup         { "email": "demo@naver.com", "password": "Demo1234!" }
```

- 생성된 `user_id = 15`
- 온보딩 완료: 이름 `demo`, 성별 `FEMALE`, 나이 `25`, 피부타입 `건성(DRY)`, 생리 상태 `MENSTRUATING`(2026-08-20 시작, 28일 주기)
- 로그인 계정: **demo@naver.com / Demo1234!**

## 4. 루틴 구성 (DB 직접 삽입)

로그인 시 자동 생성된 기본 루틴(모닝 id=21, 나이트 id=22)에 제품을 연결. `routine_products`는 `user_product_id`를 참조하므로, 먼저 `user_products`에 제품을 저장(`usage_status='USING'`)한 뒤 연결.

| 루틴 | 순서 | 제품 |
|---|---|---|
| 모닝 | 1 | 1025 독도 토너 (id 1) |
| 모닝 | 2 | 다이브인 저분자 히알루론산 세럼 (id 15) |
| 모닝 | 3 | 제로이드 수딩 크림 (id 17) |
| 나이트 | 1 | 클래리파이 겔 토너 (id 20) |
| 나이트 | 2 | XMD 스템3 클리니컬 리커버리 세럼 (id 16) |
| 나이트 | 3 | 블루 리페어 하이드로 수딩 크림 (id 21) |
| 나이트 | 4 | 메디힐 에센셜 마스크팩 [마데카소사이드] (id 18) |

## 5. 지난 1주일 피부기록 (DB 직접 삽입)

`skin_records` + `skin_metrics`, 2026-08-14~2026-08-20, 아침/저녁 하루 2회 = 14건.

- `overall_score`는 68 → 77점으로 완만한 개선 추세.
- `skin_metrics`(PIGMENTATION/PORES/REDNESS/TROUBLE, 총 56건)도 같은 방향으로 소폭 개선.
- `image_url`은 NULL — 실제 이미지 없이 더미로 채운 값이므로, 사진이 필요한 화면(원본 이미지 표시 등)에서는 빈 값으로 보일 수 있음.
- `analysis_method = 'MOCK'`로 표시해 실제 AI 분석 결과가 아님을 DB 레벨에서 구분해둠.

## 6. 지난 1주일 제품기록 (DB 직접 삽입)

`product_records` + `product_record_items`, 같은 기간 아침/저녁 각 1건씩 = 14건, 각 루틴 제품 그대로 사용(모닝 3개/나이트 4개).

- `source_type = 'ROUTINE'`으로 표시.

## 7. 테스트 쓰레기 성분 삭제

`ingredients` id 18~24(이/어어/에/비/바/타/유, 한 글자짜리 테스트 데이터)를 삭제.

- 모두 이미 비활성화해둔 테스트 쓰레기 제품(product id 5~12)에서만 `product_ingredients`로 참조되고 있어 제품 정합성에는 영향 없음.
- 다만 다른 실제 유저(user_id 2, 8)의 `ingredient_profiles`(성분 반응 분석 기록) 4건이 이 성분들을 참조하고 있어, 삭제 전 사용자 확인 후 해당 프로필 기록도 함께 삭제.
- 처리 순서: `product_ingredients` 삭제 → `ingredient_profiles` 삭제 → `ingredients` 삭제 (FK 제약 순서).

## 8. 백엔드 재배포

시드 작업 도중 서버가 origin/main보다 뒤처져 있는 것을 확인해 재배포 진행 (`gabia-server-deploy-guide.md` 절차 준용).

- 서버 배포 커밋: `ff7453d` → `ccb5f73`(PR #64 머지 포함)로 갱신.
- `ai-server/requirements.txt`는 서버에서 numpy/opencv 버전을 낮춰 수동 수정해둔 상태(설치 호환성 대응으로 추정)라 `git stash`로 보존 후 pull 진행. AI 서버는 이번에 건드리지 않음(백엔드만 재배포).
- `./gradlew clean build -x test` → `BUILD SUCCESSFUL`.
- `pkill -f backend-0.0.1-SNAPSHOT.jar` 후 `run.sh` 재기동. 첫 시도는 SSH 세션 종료와 함께 백그라운드 프로세스가 죽어 헬스체크 실패 → `setsid nohup ... & disown`으로 세션과 완전히 분리해 재시도, 정상 기동 확인(`/api/v1/health` 200 OK).
- 재기동 후 데모 계정(`user_id=15`)과 시드 데이터(피부기록 14건, 제품기록 14건)는 DB에 그대로 남아있음을 확인 — 재배포는 코드만 교체할 뿐 DB 데이터에는 영향 없음.

## 확인 필요 / 후속 작업 제안

- `ingredients`에 여전히 중복 성분(정제수 id 1/17, 병풀추출물 id 7/14, 글리세린 id 12/25)이 남아있음. 정상 제품에서 실제 참조 중이라 이번 작업에서는 손대지 않음 — 병합하려면 참조 중인 `product_ingredients`를 대표 id로 일괄 변경 후 나머지 삭제 필요.
- 데모 계정 비밀번호(`Demo1234!`)는 안드로이드 기기에 이메일 로그인으로 입력해 사용.
