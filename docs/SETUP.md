# 설정·마이그레이션·검증 가이드

## 1. 로컬 실행과 환경변수

```sh
npm ci
npm test
npm run dev
```

http://127.0.0.1:5174/ 는 소개, http://127.0.0.1:5174/app.html 은 실제 서비스다. 이전의 5173 서버는 예전 단일 파일 미리보기일 수 있다. `npm run build`는 public/에 HTML 2개·스타일·공식 SDK가 포함된 JS 번들을 만든다.

| 설정 | 위치 | 용도 |
| --- | --- | --- |
| PUBLIC_SUPABASE_URL | 선택: 빌드 셸/Vercel 환경변수 | 기본값은 assets/config.js의 기존 프로젝트 URL |
| PUBLIC_SUPABASE_PUBLISHABLE_KEY | 선택: 빌드 셸/Vercel 환경변수 | sb_publishable_ 키만 빌드 허용. 브라우저 공개 가능 |
| SUPABASE_ACCESS_TOKEN | 선택: 로컬 셸 | 원격 SQL·설정 점검. macOS에서는 기존 CLI 키체인 사용 가능. 공개 파일·Vercel 프런트 환경에 넣지 않는다 |
| Kakao REST API key, Client Secret | Supabase Auth의 Kakao 설정 | 브라우저 환경변수가 아니다. 이 저장소에 기록하지 않는다 |

환경변수 기본값을 쓰면 .env를 만들 필요가 없다. Node는 .env를 자동으로 읽지 않으므로 필요한 경우 `export PUBLIC_SUPABASE_URL=...`처럼 셸 또는 Vercel에 지정한다. `.env.example`는 형식 참고용이다.

## 2. DB 마이그레이션

이번 파일: `supabase/migrations/20261025090000_service_interests_notifications.sql`.

원격 프로젝트 관리 권한을 가진 계정에서:

```sh
python3 scripts/db-admin.py audit
python3 scripts/db-admin.py apply supabase/migrations/20261025090000_service_interests_notifications.sql
python3 scripts/db-admin.py redirects
```

관리 도구는 macOS Supabase CLI 로그인 키체인 또는 SUPABASE_ACCESS_TOKEN을 메모리에서만 사용한다. 마이그레이션 적용 버전은 supabase_migrations.schema_migrations에 기록하고 이미 적용된 버전은 다시 실행하지 않는다. 기존 출시 신청 표는 변경하지 않는다. 다른 OS에서는 공식 CLI로 로그인 후 Supabase 관리 토큰을 로컬 환경변수로 제공하거나 Dashboard SQL Editor에서 마이그레이션 파일을 실행한다.

Supabase CLI의 `db push`를 쓰려면 먼저 원격 link와 기존 출시 신청 마이그레이션의 baseline 기록을 확인해야 한다. 기존 첫 마이그레이션은 10월 13일 관리 API로 직접 적용한 것이므로 DB 이력 확인 없이 첫 파일을 재실행하지 않는다.

## 3. 카카오 로그인 설정 체크리스트 (외부 계정 작업)

공식 문서: [Supabase Kakao Auth](https://supabase.com/docs/guides/auth/social-sign-in/auth-kakao), [Auth redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls).

- [ ] Kakao Developers에서 서비스용 앱을 만들고 앱 이름·사업자/운영자·서비스 도메인을 확인한다.
- [ ] 카카오 로그인 활성화와 필요한 동의항목(profile_nickname, profile_image)을 설정한다. 이 앱의 코드는 이메일이나 전화번호 제공 scope를 요청하지 않는다.
- [ ] 카카오의 Redirect URI에 아래 **Supabase callback**을 정확히 등록한다. Vercel app.html을 카카오 callback 자리에 넣지 않는다.

  `https://plxdnppizgvrqakjyehm.supabase.co/auth/v1/callback`

- [ ] Kakao REST API key를 Supabase Authentication > Sign In / Providers > Kakao의 Client ID에, 활성화된 Client Secret을 Secret에 입력하고 Kakao를 활성화한다.
- [ ] 이메일 scope를 쓰지 않으므로 Supabase Kakao의 **Allow users without an email** 설정을 확인한다. 필요 없이 이메일 제공 동의를 요구하지 않는다.
- [ ] Supabase Site URL을 `https://fandom-discovery-mvp.vercel.app`로 설정한다.
- [ ] Supabase redirect allow list에 아래 실제 프런트 callback들을 등록한다. 광범위한 wildcard는 쓰지 않는다.

  - `https://fandom-discovery-mvp.vercel.app/app.html`
  - `http://127.0.0.1:5174/app.html`
  - `http://localhost:5174/app.html`

- [ ] 미배포/미심사 상태의 앱은 허용된 팀원/테스트 계정 범위를 확인한다. 일반 사용자 공개 전 카카오 정책에 따른 앱 설정·자격 검토를 완료한다.
- [ ] 같은 브라우저에서 카카오 로그인 → app.html 복귀 → 새로고침 후 로그인 유지 → 로그아웃을 확인한다.

로그인은 Supabase PKCE로 처리하고 OAuth code는 교환 후 주소에서 지운다. Kakao 제공자 토큰은 메시지 발송에 재사용하지 않는다. 카카오 외부 설정이 빠져 있으면 로그인 버튼에서 설정 대기 안내를 보여 준다.

## 4. 최초 관리자 지정

관리자로 쓸 계정이 **한 번 카카오 로그인한 후**, Supabase Authentication > Users에서 UUID를 확인한다. 프로젝트 소유자가 SQL Editor에서 아래 UUID를 실제 값으로 바꿔 실행한다.

```sql
insert into private.app_admins(user_id)
values ('실제-관리자-auth-users-UUID')
on conflict do nothing;
```

관리자 해제:

```sql
delete from private.app_admins where user_id='실제-관리자-auth-users-UUID';
```

일반 사용자는 이 작업을 할 수 없다. 브라우저 메타데이터나 화면 표시만 바꿔서는 관리자 권한을 얻을 수 없다. 지정 후 서비스의 새로고침 버튼을 누르면 관리자 메뉴가 나타난다.

## 5. 테스트

단위 테스트: `npm test` — 약칭/정규화, 작품 AND 캐릭터 매칭, 위험 URL 차단, 모의 발송의 무네트워크 동작, 실제 전송 모드 차단.

실제 DB 역할·통합 테스트:

```sh
npm run test:db
```

`supabase/tests/service_integration.sql`은 가상 auth.users 3명을 트랜잭션 안에 만들고 실제 authenticated/anon 역할과 JWT claims로 검사한다. 타인 관심사·알림·큐 격리, 비관리자 게시 차단, 명의 조작 차단, 초안/공개, 작품·캐릭터 매칭, 복수 관심사 중복 방지, 같은 URL 차단, 재공개 중복 방지, 읽음 열만 수정, 구독 해제 후 모의 발송 취소, 모의 재실행 중복 방지를 검사한 뒤 **ROLLBACK**한다. 실제 카카오 로그인이나 발송을 대신 검증하는 테스트는 아니다.

수동 E2E (카카오 설정 후):

1. 사용자 A: 하이큐!! 전체와 히나타 등록. 사용자 B: 원신 등록.
2. 관리자: 하이큐!! / 히나타 / 유일한 HTTPS URL의 게시물을 공개 등록.
3. A의 웹 알림·큐에 각각 1건, B에는 0건인지 확인한다.
4. 재공개해도 알림이 늘지 않는지 확인한다.
5. 관리자가 모의 발송을 실행하고 mocked 결과/기록을 확인한다. 다시 실행해 중복 처리되지 않는지 확인한다.
6. 일반 사용자로 관리자 화면 URL/함수 직접 호출을 시도해도 DB가 거부하는지 확인한다.
7. 다른 브라우저로 로그인해 개인 관심사가 계정별로 유지되는지 확인한다.

## 6. 메시지 발송 모듈과 외부 승인 체크리스트

- `lib/messaging/kakao-provider.mjs`: 제공자 인터페이스. mock만 구현. live 등 어떤 다른 모드도 ExternalApprovalRequiredError로 거부한다. 임의 환경변수로 활성화할 수 없다.
- `lib/messaging/mock-dispatch.mjs`: 실행 경계. mock 모드만 허용하고 관리자 검증 RPC를 호출한다.
- DB의 process_mock_queue: 모의 수신증 ID `mock:<queue UUID>`를 기록한다. 외부 HTTP 전송은 없다. user_interests와 공개 상태를 다시 검사한다.

실제 발송 구현 전 별도 완료할 일:

- [ ] 이 서비스의 신규 굿즈 안내가 정보성/광고성 중 어떤 메시지인지 공식 상품 담당자와 확인. 알림톡 사용 가능하다고 가정하지 않는다.
- [ ] 선택한 공식 상품(알림톡/브랜드 메시지 등)의 사업자·채널·발신 프로필·대행사 자격과 계약을 확인.
- [ ] 해당 상품의 수신 동의, 동의 시각·문구 버전·철회 및 수신 거부 관리 요건을 확인하고 DB/화면 구현. 지금은 외부 메시지 동의를 수집한 것으로 간주하지 않는다.
- [ ] 템플릿·발송 내용·심사와 발송 한도·시간·비용 확인.
- [ ] 필요한 수신자 식별자(전화번호 등)의 적법한 수집과 보관 기간을 확인. 카카오 로그인으로 임의 사용자의 메시지 수신자를 확보했다고 간주하지 않는다.
- [ ] 서버 전용 어댑터와 비밀 저장소·재시도·백오프·제공자 idempotency·감사 로그를 구현한 뒤 소수 승인 테스트부터 검증.

공식 근거: [카카오 비즈니스 알림톡 가이드](https://kakaobusiness.gitbook.io/main/ad/infotalk)는 정보성 내용과 승인된 템플릿으로 제한한다. [카카오 친구/메시지 API 공식 FAQ](https://devtalk.kakao.com/t/api-api/134035)는 친구 관계·동의·권한 조건을 설명한다. 개인용 메시지 API를 임의 이용자 대량 알림의 대체재로 사용하지 않는다. 상품/정책은 실제 출시 직전에 다시 확인한다.

## 7. 배포

기존 Vercel 프로젝트와 Git 연동을 유지한다. Vercel에서 npm ci → npm run build, 출력 public/을 사용한다. Git main push만으로 자동 배포하며 CLI 직접 배포는 하지 않는다. public/에는 app.html, index.html, CSS, 번들만 들어가고 관리 도구·마이그레이션·테스트·환경 파일은 배포하지 않는다.
