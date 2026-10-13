# 덕후의 발견 MVP

장르를 검색하면 창작자, 진행 중인 통판, 예정 수요조사를 나눠 보여 주는 한국어 MVP입니다. 추천 콘텐츠와 썸네일은 데모 데이터이며, 정식 버전 신청은 실제 Supabase에 저장됩니다.

## 구성

- `index.html`: 화면, 스타일, 브라우저 동작과 신청 저장 연결.
- `supabase/migrations/`: 신청 표와 INSERT 전용 RLS를 정의한 SQL.
- `vercel.json`: 단일 HTML을 배포하는 정적 사이트 설정.

신청 폼은 이름, 이메일, 선택 사항인 남긴 말을 저장합니다. 브라우저는 추가만 가능하며 신청 조회·수정·삭제는 허용하지 않습니다. HTML에는 공개 publishable 키만 포함하고, 비밀 키·관리자 토큰·DB 비밀번호는 포함하지 않습니다.

## 로컬 확인

`python3 -m http.server 5173 --bind 127.0.0.1` 실행 후 http://127.0.0.1:5173 을 엽니다.

Supabase CLI는 이 폴더에서 `npm ci` 후 `npx supabase`로 실행합니다.

## 수정 후 올리기

`git add . && git commit -m "Update MVP" && git push origin main`

GitHub의 main 브랜치 푸시를 Vercel이 감지해 자동 배포합니다.
