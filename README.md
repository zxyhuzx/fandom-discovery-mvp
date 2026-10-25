# 덕후의 발견

팬덤 굿즈 탐색·웹 알림 MVP. 순수 HTML/CSS/JavaScript + Supabase Auth/Postgres + Vercel Git 자동 배포를 유지합니다.

- `/` — 소개와 출시 신청. `/#demo`는 로그인 없는 가상 장르 체험.
- `/app.html` — 카카오 로그인 후 개인 관심 작품·캐릭터, 관리자 등록 굿즈, 웹 알림.
- 관리자 — 게시물 URL·작품·캐릭터·판매 정보를 직접 등록. 무단 스크래핑 없음.
- 새 게시물 공개 시 DB 트리거로 관심사를 매칭해 알림과 모의 발송 대기열 생성.
- 모의 발송만 가능. 실제 카카오 메시지 전송 구현은 차단되어 있습니다.

## 시작

```sh
npm ci
npm test
npm run dev
```

미리보기: http://127.0.0.1:5174/ / 실제 서비스: http://127.0.0.1:5174/app.html

```sh
npm run build
npm run test:db
```

실제 DB 테스트는 관리 API 접근 권한이 필요하고 모든 가상 데이터는 ROLLBACK합니다. 카카오 provider가 설정되지 않으면 로그인 준비 안내를 보여 줍니다.

## 문서

- [현재 구성 점검과 구현 구조](docs/IMPLEMENTATION.md)
- [환경변수·카카오 콘솔·마이그레이션·테스트 방법](docs/SETUP.md)
- [외부 승인·계정 설정 체크리스트](docs/EXTERNAL_CHECKLIST.md)
- [진행 기록](진행기록.md)

브라우저에는 공개 publishable 키만 포함합니다. 서버 비밀 키·관리 토큰·카카오 Client Secret은 넣지 않습니다.

## 배포

[공개 사이트](https://fandom-discovery-mvp.vercel.app) / [실제 서비스](https://fandom-discovery-mvp.vercel.app/app.html)

기존 GitHub main → Vercel 자동 배포: `npm ci` → `npm run build`, 출력 `public/`. Vercel CLI 직접 배포는 사용하지 않습니다.

수정 후: `git add . && git commit -m "Update MVP" && git push origin main`
