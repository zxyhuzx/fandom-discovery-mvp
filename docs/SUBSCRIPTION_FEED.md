# 구독 중심 서비스 (2026-10-26)

- `index.html`: 기존 소개·체험 랜딩 유지. 팔레트·테마 변수 변경 없음.
- `app.html#home`: 로그인 기본 목적지인 **내 구독**. 첫 이용자의 구독 등록 안내 유지.
- 구독 작품·캐릭터에 맞는 실제 공개 게시물을 하나의 피드로 표시. 추천·최근 발견·새로운 통판을 반복 섹션으로 나열하지 않는다.
- 작품·판매 상태 필터, 작은 카드/목록 보기, 구독 관리, 새 알림 바로가기 제공.
- `#explore`: 상단 검색 또는 탐색 링크로 진입하는 별도 공개 목록. 기존 정렬·검색·상세·원본 링크와 명시적인 예시 보기 유지.

## 데이터 흐름과 알림

1. 로그인 계정의 구독·알림·설정을 먼저 가져온다.
2. `my_subscription_feed` RPC는 `auth.uid()`의 구독과 작품·캐릭터가 일치하는 공개·비테스트 게시물만 조회한다. 다른 사용자 ID를 전달할 수 없다. RLS와 invoker 권한 적용.
3. `created_at, id` 내림차순. 30개 + 다음 페이지 확인용 1개, 동일 시각에도 누락·중복을 막는 키셋 페이지 이동. 전역 최근 100개에서 구독 게시물을 추리는 방식이 아니다.
4. 전역 굿즈/조회 수는 탐색·운영 화면 진입 시 별도 조회한다. 홈에서는 이 조회를 하지 않는다.
5. 새 공개 게시물은 기존 `private.match_new_goods`에서 구독·알림 설정을 확인한다. `notifications(user_id,goods_post_id)`와 대기열 고유 제약으로 재공개 시 중복 방지.
6. 피드 열기·새로고침·페이지 이동·과거 굿즈를 포함하는 구독 추가는 알림을 생성하지 않는다. 알림 클릭은 연결된 상세로 이동하며 읽음 처리한다.
7. 최근 50건에서 읽지 않은 알림 최대 3개를 홈에 요약. 카카오톡은 계속 모의 대기열만 사용하며 실제 전송하지 않는다.

## 적용과 검증

기존 인증·공개 키·Vercel 설정 재사용. 새 환경변수 없음.

```sh
python3 scripts/db-admin.py apply supabase/migrations/20261026030000_subscription_feed.sql
python3 scripts/db-admin.py apply supabase/migrations/20261026040000_expanded_catalog.sql
npm test
npm run build
npm run test:db
python3 scripts/db-admin.py sql supabase/tests/subscription_feed.sql
python3 scripts/db-admin.py sql supabase/tests/expanded_catalog.sql
```

DB 시험은 계정 격리·다국어 매칭·공개/비공개/테스트 구분·판매 상태·동일 시각 페이지 이동·구독 중복·신규/과거 알림 정책을 검증하고 모두 롤백한다. 실제 로그인 브라우저에서 구독 추가→저장→홈→새로고침 유지→삭제를 확인하고 시험 구독은 원래 상태로 복원했다.

실제 판매 게시물이 없으면 빈 목록을 표시한다. 이름 목록 확장을 실제 굿즈 수집·판매 정보 등록으로 취급하지 않는다.
