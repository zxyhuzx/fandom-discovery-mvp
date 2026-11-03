# 기본 프로필 편집

기존 마이페이지와 프로필/알림 설정 화면에 동일한 프로필 영역을 추가했다. 배너 → 원형 사진 → 닉네임 → SNS 링크 → 편집 버튼 순서다. 기존 구독 관리·알림 설정·굿즈 업로드 메뉴는 유지한다. 제작자 홈·공개 프로필 페이지·제작자 인증·새 메뉴는 만들지 않았다.

## 저장 구조와 권한

- `public.user_profiles`: user_id PK/FK, nickname, x_handle, instagram_handle, avatar_path, banner_path, updated_at. 이후 제작자 홈에서 재사용할 수 있는 프로필 데이터이며, 현재 공개 조회 권한은 없다.
- `profile-media` 비공개 Storage 버킷. 사용자 UUID/avatar 또는 banner/무작위 UUID.확장자 경로를 사용한다. DB에는 이미지 경로만 저장한다.
- 프로필 RLS는 본인만 조회·추가·수정. 다른 사용자 ID로 저장하거나 다른 소유자의 이미지 경로를 지정할 수 없다. Storage도 본인 폴더만 업로드·조회·삭제하며 덮어쓰기는 허용하지 않는다.
- 표시 시 10분짜리 서명 URL을 발급하고 만료 전에 갱신한다. 프로필 데이터/이미지를 브라우저 임시 저장으로 대체하지 않는다. 브라우저 object URL은 저장 전 미리보기만 담당하며 편집 종료/교체 시 해제한다.
- 교체 파일 업로드 → DB 저장 → 이전 파일 삭제 순서다. DB 저장 실패 시 새 업로드를 정리하고 기존 프로필은 유지한다. 이전 파일 정리 실패는 저장 성공과 구분해 안내한다.
- 기존 Supabase 공개 URL·publishable key만 사용하며 새 환경변수는 필요 없다. 마이그레이션: `20261103060000_user_profiles.sql`.

## 검증과 표시

- 닉네임: NFC 정규화, 앞뒤 공백 제거, 2~24자, 제어문자·꺾쇠 제외. DOM은 textContent로 표시한다.
- SNS: 공백 정리와 선행 @ 제거. X는 영문·숫자·밑줄 1~15자, Instagram은 영문·숫자·밑줄·마침표 최대 30자이며 앞뒤/연속 마침표는 제외한다. URL 전체를 입력받지 않는다.
- `socialUrl`에서 고정 HTTPS 도메인과 검증된 아이디로 URL을 생성한다. 새 탭, noopener noreferrer. SNS 소유권 인증/공식 연동 표시는 없다.
- 사진: JPG/PNG/WebP, 최대 5MB. 배너: 동일 형식 최대 8MB. Storage 버킷 자체 제한은 파일당 8MB 및 위 MIME 형식이다. SVG·GIF 등은 받지 않는다.
- 실제 이미지 디코딩 확인, 가로·세로 32~8000px, 총 4천만 화소 이하. 사진은 원형 object-fit:cover, 배너는 가로형 object-fit:cover. 별도 잘라내기 편집은 없다.
- 사진/배너가 없거나 열 수 없으면 자체 제작 기본 이미지 표시. 기존 라이트·다크 변수와 반응형 구조를 재사용한다.

## 확인 방법

- `npm test`: 기존 28개 + 닉네임/SNS/이미지 검증 3개 = 31개.
- `npm run build`
- `python3 scripts/test-profile-storage.py`: CLI 관리 인증을 메모리에서 사용하여 임시 시험 계정 2개를 만든다. 실제 사용자 계정은 수정하지 않는다. 사진/배너 업로드·교체·삭제, private/signed 접근, 잘못된 입력/경로, 타 계정 조회·수정·이미지 삭제 차단, 새 로그인 토큰으로 정보 유지 확인. finally에서 시험 이미지/계정 정리. 키·비밀번호는 출력하지 않는다.
- 브라우저: 별도 로컬 출처의 임시 계정으로 실제 파일 선택 미리보기→DB/Storage 저장→새로고침 유지→닉네임 수정 및 두 이미지 삭제 저장 확인. X/인스타그램 테스트 링크 실제 새 탭 이동 확인. 잘못된 아이디 입력 거절 및 삭제 미리보기 취소 시 원본 유지 확인.
- 모바일 320px에서 프로필과 편집창 가로 넘침 없음, 사진 원형, 라이트/다크 확인. 기존 사용자 프로필은 저장/변경하지 않고 기존 로그인 상태와 메뉴 유지 확인. 실제 카카오 재승인은 이번 검증에 포함하지 않았다.

구현 근거: [Supabase Storage 접근 제어](https://supabase.com/docs/guides/storage/security/access-control), [서명 URL](https://supabase.com/docs/reference/javascript/storage-from-createsignedurl).
