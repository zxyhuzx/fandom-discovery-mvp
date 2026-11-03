# 취향 연구 수집 운영

기존 튜토리얼과 구독 저장은 유지합니다. `user_interests`를 복사하거나 연구 응답과 동기화하지 않습니다. 기존 구독 데이터는 연구에 자동 포함되지 않습니다.

## 동의와 제출

- 회차: `taste-survey-2026-11`, 안내 버전: `2026-11-03-v1`.
- 보유 기간: 최초 연구 선택값 또는 추가 요청 제출로부터 60일. 철회 문의: qhdms114@naver.com.
- 수집 목적·항목·보유 기간·철회 경로를 마지막 기존 튜토리얼 단계에 표시합니다. 미체크가 기본이고, 체크 후 **선택 데이터 제출하기**를 눌러야 저장합니다. 미동의·서버 오류에도 기존 홈 진입은 가능합니다.
- 목록 추가 요청도 독립적인 동의와 제출 버튼을 사용합니다. 미완료 튜토리얼의 선택은 전송하지 않습니다. 요청은 연구 선택값에 자동 추가하지 않습니다.
- 처음 성공한 완료 응답은 고정됩니다. 재전송 시 동일 참여 ID를 반환하며 구독 변경으로 덮어쓰지 않습니다. 요청을 먼저 제출했다면 그때부터 최대 60일이 적용됩니다.
- 목적·보유 기간·연락처·버전이 없거나 enabled=false이면 신규 수집은 중지합니다. 이미 참여한 데이터는 수집 중지 후에도 철회할 수 있습니다.

## 저장과 권한

- `research_campaigns`: 회차별 목적·동의문 버전·기간·연락처·수집 활성화.
- `research_catalog`: 기존 튜토리얼과 같은 작품·캐릭터의 정식 이름 조합 513개(작품 전체는 빈 캐릭터명).
- `research_participants`: 무작위 참여 UUID, 회차, 비밀 코드의 SHA-256 해시, 동의·제출·만료 시각. 로그인 사용자 ID는 저장하지 않습니다.
- `research_choices`: 참여 ID별 작품·캐릭터. 캐릭터가 빈 항목은 작품 선택이며 캐릭터 통계에서 제외합니다.
- `research_requests`: 작품·캐릭터 추가 요청. 위 참여 ID에 연결되며 선택 응답과 구분합니다. 회차당 최대 10개입니다.
- `research_rate_limits`: 남용 방지용 서버 비밀값으로 솔트한 네트워크 해시. 원 IP는 저장하지 않으며 최대 1시간 후 삭제합니다. 동일 네트워크에서 시간당 120회 제한은 학교·공유망 참여에도 적용됩니다.

모든 표에 RLS를 켜고 anon/authenticated의 직접 조회·수정·삭제 권한과 연구 RPC 실행 권한을 회수했습니다. Edge Function만 서버용 권한으로 검증 후 호출합니다. CORS는 운영 도메인과 지정 로컬 주소만 허용하지만, CORS 자체를 인증 수단으로 사용하지 않습니다. 256비트 무작위 비밀 코드가 참여 응답의 철회 권한입니다. 원문 비밀 코드는 서버에 저장하지 않고 로그·CSV·URL에도 넣지 않습니다.

요청 본문 32KB, 선택 1~100개, 정식 작품-캐릭터 관계, 동의 버전, 요청 이름 길이를 검증합니다. 동일 회차+코드는 DB 고유키와 잠금으로 중복 방지합니다. 브라우저 저장 공간을 지우거나 기기를 바꾸면 동일인 여부를 보장할 수 없습니다. 집계는 '고유 사람 수'가 아니라 '참여 ID 수'입니다. 네트워크 제한은 보조 남용 방지이며 봇을 완전히 차단하지는 않습니다.

## 철회와 삭제

고객센터 → 연구 동의 철회·데이터 삭제 또는 `/?research=manage`에서 철회용 비밀 코드를 입력합니다. 해당 참여 응답을 물리 삭제하며 외래키 cascade로 선택값·추가 요청도 삭제합니다. 계정 구독과 로컬 체험 관심사는 유지합니다. 코드가 틀린 경우에도 존재 여부를 공개하지 않습니다.

브라우저 저장이 사라지기 전에 코드를 복사해 두도록 안내합니다. 코드가 없으면 참여 ID를 알려 이메일로 문의하도록 안내하며 운영자가 확인 후 삭제합니다. 이름·이메일만으로 특정 연구 응답을 찾을 수 없습니다. 비밀 코드는 비밀번호와 같이 취급하세요.

운영자 철회(기록에 비밀 코드를 남기지 않도록 숨김 입력):

```sh
python3 scripts/research-admin.py withdraw
```

참여 ID는 외부 설문에도 노출되는 공개용 식별값이며 본인 확인 수단이 아닙니다. 코드를 분실한 경우 원 설문 응답 접근 등 별도의 근거로 본인을 확인해야 하며, 참여 ID만 아는 사람의 요청으로 삭제하면 안 됩니다. 운영자가 본인 요청을 확인한 경우 Supabase SQL Editor에서 UUID를 확인하고 다음을 실행합니다. ID를 공개하거나 다른 사람에게 제공하지 마세요.

```sql
delete from public.research_participants where id = '확인한 참여 UUID'::uuid;
```

만료 응답은 조회·CSV에서 즉시 제외하며 `byeoljup-research-expiry` Cron이 매시간 정각에 물리 삭제합니다. 삭제 범위는 운영 DB입니다. 이미 다운로드한 CSV, 파생 분석 파일과 Supabase의 별도 백업 보관 정책은 이 작업이 자동 회수할 수 없습니다. 운영자는 철회·기간 만료 시 기존 CSV와 파생 분석 파일도 삭제하거나 최신 데이터로 재생성해야 합니다. 서비스 로그에 요청 본문을 추가하지 마세요.

## CSV 추출 — 운영자 로그인 필요

기존 Supabase CLI에 로그인한 운영자만 실행합니다. 브라우저에 관리 키를 넣거나 참가자에게 전체 표 조회 권한을 주지 않습니다. 저장소 밖의 보호된 폴더를 지정하세요.

```sh
python3 scripts/research-admin.py export --campaign taste-survey-2026-11 --out /private/tmp/byeoljup-research-export
```

1. `participant_choices.csv`: 참여 ID·회차·동의 버전·제출 시각·작품·캐릭터·선택 유형. 작품 전체도 보존합니다.
2. `character_counts.csv`: 작품+캐릭터별 서로 다른 참여 ID 수.
3. `character_pairs.csv`: 작품+캐릭터를 구분한 두 캐릭터의 공동 선택 참여 ID 수. 순서 중복·자기 자신 쌍·작품 전체를 제외합니다.

미제출·만료·철회된 응답은 제외합니다. UUID만 내보내며 로그인 ID·비밀 코드·연락처는 포함하지 않습니다. CSV 셀 인용·따옴표 이스케이프·수식 접두부 방지, 폴더 700/파일 600 권한을 적용합니다. 운영 중인 로컬 분석 파일의 보관도 60일 범위에 맞추세요. 추가 요청은 분석 통계에 섞지 않으며 운영 DB에서 별도 확인합니다.

## 설문 응답 연결

`assets/config.js`의 `surveyUrl`에 HTTPS 설문 URL을 설정하면 기존 설문 버튼에 **공개용 참여 ID만** `participant_id`로 붙입니다. 외부 설문 도구에 참여 ID 질문을 만들고 URL 사전입력을 지원하는지 확인해야 합니다. 도구마다 파라미터 이름이 달라 추가 매핑이 필요할 수 있으며 현재 URL은 미정이라 버튼은 숨깁니다. 사전입력이 없으면 참여자가 표시된 참여 ID를 복사하여 설문에 입력할 수 있습니다. 철회 비밀 코드는 절대 외부 설문으로 보내지 않습니다. 선택 응답과 다른 설문 항목을 결합해 분석한다면 동의문 목적·수집 항목에도 그 결합 내용을 반영한 새 버전/회차를 배포하세요.

## 설정·배포·점검

추가로 브라우저에 넣는 비밀 환경변수는 없습니다. Edge Function은 Supabase 런타임의 `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`를 사용합니다. 기존 공개 URL·publishable key만 브라우저에 포함합니다. 비로그인 경로이므로 함수 JWT 게이트는 끄고 요청 본문·동의·철회 코드를 자체 검증합니다. 공식 참고: [Supabase 함수 인증](https://supabase.com/docs/guides/functions/auth), [Cron](https://supabase.com/docs/guides/cron).

```sh
python3 scripts/db-admin.py apply supabase/migrations/20261103190000_research_responses.sql
python3 scripts/db-admin.py apply supabase/migrations/20261103190100_research_catalog.sql
npx supabase functions deploy research --project-ref plxdnppizgvrqakjyehm --no-verify-jwt --use-api
npm test
python3 scripts/db-admin.py sql supabase/tests/research_integration.sql
python3 scripts/test-research-http.py
npm run build
```

DB 검증은 트랜잭션 롤백, HTTP 검증은 별도 임시 회차를 생성하고 종료 시 정리합니다. 실제 참여자의 동의로 테스트 응답을 제출하지 않습니다. DB 수집 중지는 `update public.research_campaigns set enabled=false where id='taste-survey-2026-11';`입니다. 목적·항목 변경 시 기존 동의를 소급 변경하지 말고 새 회차·버전을 만들고 `assets/research/domain.js`의 회차를 함께 변경하세요. 카탈로그 확장은 기존 생성기를 참고해 **새 버전의 추가 마이그레이션**으로 적용하고 이미 적용한 마이그레이션을 덮어쓰지 마세요.

정적 사이트는 기존 GitHub main push → Vercel 자동 배포를 유지합니다. Vercel CLI 직접 배포는 하지 않습니다. 이 기능은 추천 알고리즘에 연구 데이터를 자동 사용하지 않습니다.
