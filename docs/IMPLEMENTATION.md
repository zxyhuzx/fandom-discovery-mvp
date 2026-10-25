# 팬덤 굿즈 서비스: 점검 결과와 다음 단계

확인일: 2026-10-25 (한국 시간)

## 기존 구성 점검

| 항목 | 기존 상태 | 이번 구현 |
| --- | --- | --- |
| 화면 | index.html에 랜딩·12개 장르 데모·가상 구독 화면·출시 신청이 혼재 | 기존 데모 유지. app.html을 실제 서비스 화면으로 분리 |
| 기술 | 순수 HTML/CSS/JavaScript | 동일한 기술 유지. Supabase 공식 JS SDK와 esbuild만 추가 |
| 인증 | 실제 로그인 없음. localStorage 구독 | Supabase Auth 카카오 OAuth + PKCE. 사용자별 관심사 DB 저장 |
| DB | public.launch_signups, INSERT만 허용 | 개인 관심사, 관리자 등록 게시물, 알림, 대기열, 모의 처리 기록 추가 |
| API | 익명 출시 신청 POST /rest/v1/launch_signups | Supabase Auth/Data API/RPC. 모든 접근에 DB 권한·RLS 적용 |
| 배포 | GitHub zxyhuzx/fandom-discovery-mvp → Vercel main 자동 배포 | 동일 연결 유지. npm ci → npm run build → public/ |
| 원격 서비스 | 점검 시 Supabase INACTIVE, 카카오 비활성, 사이트 URL localhost:3000 | 복구·DB 적용·리다이렉트 설정 결과는 진행기록.md 참고 |

실제 서비스는 `/app.html`, 소개는 `/`, 로그인 없는 예시 체험은 `/#demo`다. 데모의 가상 데이터와 localStorage 구독은 실제 사용자 관심사·게시물·알림에 자동 이관하지 않는다. 실제 굿즈 정보는 관리자가 직접 등록한 것만 표시한다.

## 데이터 흐름

1. 카카오 로그인 → Supabase가 OAuth를 처리 → app.html에서 PKCE code 교환 → 사용자 세션.
2. 관심 작품과 선택 캐릭터를 user_interests에 저장. user_id는 클라이언트가 지정하지 않고 DB의 auth.uid()로 결정한다.
3. 관리자가 goods_posts에 원문 URL·작품·캐릭터 배열·판매 안내·공개 여부를 직접 등록한다.
4. 새 공개 게시물 또는 초안의 최초 공개에서 DB 트리거가 관심사를 매칭한다. 같은 작품 AND (캐릭터 전체 OR 캐릭터 일치) 조건이다.
5. 매칭된 사용자별 notifications 1건과 kakao_mock 대기열 1건을 동일 트랜잭션에서 생성한다.
6. 사용자는 자신의 웹 알림을 보고 읽음 표시할 수 있다. 30초 간격의 활성 탭 새로고침과 수동 새로고침을 지원한다.
7. 관리자는 모의 발송 버튼으로 잠긴 대기열 최대 20건을 처리한다. 실제 카카오 HTTP 요청은 없다.

## 중복·정합성

- 관심사: unique(user_id, work_key, character_key).
- 게시물: URL fragment와 끝의 slash를 제거한 source_key unique. 폼은 URL의 utm_*, fbclid, gclid 추적 파라미터도 제거한다. 서로 다른 게시물 URL이 같은 상품인지는 자동 판별하지 않는다.
- 알림: unique(user_id, goods_post_id). 여러 관심사가 같은 게시물에 맞아도 1건이다.
- 대기열: unique(notification_id, channel). 공개 취소 후 재공개해도 기존 알림이 중복되지 않는다.
- 모의 처리: FOR UPDATE SKIP LOCKED와 원자적 상태 변경. 처리한 대기열은 재선택하지 않으며 delivery_attempts.queue_id도 unique다.
- 발송 직전 관심사·공개 상태·마감 여부를 재확인해 구독 해제/비공개/마감 건은 cancelled로 기록한다. 이미 받은 웹 알림은 남는다.
- 새 관심사 추가는 과거 게시물에 대한 알림을 소급 생성하지 않는다.
- Unicode NFKC, 공백·일부 문장부호 정규화와 12개 작품 약칭을 지원한다. 임의 캐릭터 별명은 자동 추론하지 않으며 같은 정규화 이름으로 등록해야 한다.

## 보안 경계

- app_admins는 private 스키마에 있고 브라우저에 부여된 쓰기 권한이 없다. 사용자 메타데이터를 관리자 판정에 사용하지 않는다.
- user_interests는 자신의 행만 조회·추가·삭제. user_id를 입력하는 권한은 주지 않는다.
- goods_posts는 로그인한 사용자가 공개 행만 조회. 관리자는 비공개 포함 조회·등록·공개 취소 가능. 등록자의 created_by도 DB에서 지정한다.
- notifications는 본인 조회와 read_at 열 수정만 가능. 브라우저에서 알림을 생성할 수 없다.
- delivery_queue는 본인 알림에 연결된 항목만 조회. 관리자는 전체 큐와 처리 기록을 조회. 직접 수정 권한은 없고 관리자 검증 RPC만 실행할 수 있다.
- launch_signups의 기존 익명 INSERT 정책은 유지한다. 새 사용자 데이터에 익명 접근을 허용하지 않는다.
- 사용자 텍스트는 textContent로 렌더링한다. 원문과 이미지 URL은 HTTPS로 제한하며 URL을 서버에서 가져오거나 스크래핑하지 않는다.
- 브라우저에는 publishable 키만 포함한다. 카카오 Client Secret, 관리 토큰, service_role/secret 키는 넣지 않는다.

## 현재 범위와 한계

카카오 콘솔 앱/동의 설정, Supabase Kakao provider 설정, 최초 관리자 지정이 끝나야 실제 사용자 로그인부터 관리자 게시·알림까지 사람이 이어서 사용할 수 있다. 코드 구현과 DB 역할 테스트는 별도로 검증할 수 있다. 관리자 처리 화면은 최근 100개 게시물, 알림·큐·기록은 최근 50개를 표시한다. 대기열 처리는 관리자 수동 실행이며 자동 스케줄은 아직 없다.

카카오톡 상품별 자격, 수신 동의, 심사가 확인되지 않았으므로 실제 대량 발송은 구현하지 않는다. 로그인 동의를 메시지 수신 동의로 간주하지 않는다.
