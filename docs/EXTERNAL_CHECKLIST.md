# 외부 설정이 필요한 작업

아래는 코드·DB 구현과 구분되는 운영자 작업이다. 비밀번호나 비밀 키를 저장소에 적지 않는다.

## 카카오 로그인 공개 전

- [x] Kakao Developers 서비스 앱 생성 및 서비스 도메인 설정.
- [x] 카카오 로그인 활성화, profile_nickname/profile_image 동의항목 설정.
- [x] 카카오 Redirect URI: `https://plxdnppizgvrqakjyehm.supabase.co/auth/v1/callback`.
- [x] Supabase Auth > Kakao에 REST API key와 활성화된 Client Secret을 직접 등록.
- [x] Allow users without an email 활성화 (이 설정만으로 기본 account_email 요청은 제거되지 않음).
- [ ] 앱의 테스트 계정 범위/일반 사용자 사용 자격/필요 심사를 확인.
- [ ] 실제 카카오 계정으로 로그인 → app.html 복귀 → 관심사 저장 → 로그아웃을 확인.

Supabase Site URL과 실제 프런트 복귀 URL은 이번 작업에서 설정했다. 2026-10-25 카카오 앱 별줍(ID 1621935)의 로그인과 선택 동의항목, 콜백, Supabase provider 연결을 설정했다. 인증 키는 Supabase 비공개 설정에만 등록했다.

실제 OAuth 시험에서 KOE205(account_email) 확인. Supabase Kakao provider가 이메일 scope를 기본으로 추가하므로, 카카오 비즈 앱 전환과 account_email 동의 권한 설정이 추가로 필요하다.

- [ ] 비즈 앱 전환: 운영자 본인확인/해당 약관 동의 등 카카오 요구 절차 완료.
- [ ] account_email 동의항목 권한 확인 및 설정. 개인정보 안내도 실제 수집 항목에 맞춰 확인.
- [ ] 서비스 외부 연결 해제를 반영할 웹훅·탈퇴 처리 구현/검증.

## 관리자 지정

- [ ] 관리자 카카오 계정이 한 번 로그인한 뒤 Supabase Authentication > Users에서 UUID 확인.
- [ ] 프로젝트 소유자가 private.app_admins에 그 UUID만 추가. SQL은 [SETUP.md](SETUP.md)의 ‘최초 관리자 지정’ 참고.
- [ ] 관리자 계정에서 실제 게시물 등록과 다른 사용자의 관심사 매칭을 수동 E2E 검증.

## 카카오톡 실제 발송 전

- [ ] 새 굿즈 안내 내용의 정보성/광고성 분류와 사용 가능한 공식 상품 확인.
- [ ] 공식 상품의 사업자·비즈니스 채널·발신 프로필·계약/대행사 자격 확인.
- [ ] 필요한 수신 동의 문구·버전·시각·철회·수신거부 및 수신자 식별자 보관 방식 구현.
- [ ] 템플릿/앱 권한 등 심사, 발송 한도·시간·비용 확인.
- [ ] 서버 전용 실제 전송 어댑터, 비밀 저장소, 실패·재시도·중복·감사 로그 설계 후 별도 구현.
- [ ] 승인된 소수 테스트 후에만 실제 발송 범위 확대.

지금은 웹 알림과 모의 대기열만 제공한다. 카카오 로그인 동의는 카카오톡 메시지 수신 동의가 아니며, 환경변수 하나로 실제 전송을 켤 수 없다.

공식 문서와 세부 절차: [설정 가이드](SETUP.md).
