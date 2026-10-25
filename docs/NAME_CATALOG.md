# 이름 검색 카탈로그

아이돌 데이터는 추가하지 않았다. 초기 버튜버 카탈로그는 다음 3개 그룹, 8명이다. 전체 멤버/현재 소속의 완전한 명단을 뜻하지 않는다.

- 홀로라이브: 호시마치 스이세이, 우사다 페코라, 시라카미 후부키
- 니지산지: 쿠즈하, 카나에, 츠키노 미토
- 스텔라이브: 아야츠노 유니, 아라하시 타비

영문·일본어 이름은 assets/name-catalog.js에 등록한 별칭을 기준으로 검색하며 결과/선택/저장은 한국어 이름을 사용한다. 예: Suisei / 星街すいせい → 홀로라이브 · 호시마치 스이세이. Hinata 입력은 하이큐·나루토 후보를 각각 표시한다. 기존 작품에도 일본어 제목과 일부 주요 캐릭터 영문·일본어 별칭을 연결했다.

자동 번역이나 전체 이름 사전은 아니다. 등록하지 않은 이름은 원문을 유지하고 직접 입력할 수 있다. 버튜버/VTuber 검색과 장르 필터도 제공한다. 실제 버튜버 굿즈를 수집하거나 판매 데이터를 자동 생성하지 않는다.

관심사 추가·관리자 게시물 입력에서 한국어 대표 이름으로 정규화한다. 기존 데이터도 표시할 때 한국어 대표 이름을 사용한다. DB의 normalize_work / normalize_character와 게시물 알림·모의 대기열 매칭에도 동일한 별칭을 연결했다. 새 언어 별칭을 추가할 때 프런트와 DB 마이그레이션을 함께 갱신해야 한다.

확인한 이름 자료:

- [홀로라이브 공식 프로필](https://hololive.hololivepro.com/en/talents/)
- [니지산지 쿠즈하](https://www.nijisanji.jp/en/talents/l/kuzuha), [카나에](https://www.nijisanji.jp/en/talents/l/kanae), [츠키노 미토](https://www.nijisanji.jp/talents/l/mito-tsukino)
- [Brave group의 스텔라이브 소개](https://note.com/bravegroup/n/n7b066ebd1cc3)

검증: `npm test`, `python3 scripts/db-admin.py sql supabase/tests/multilingual.sql`, `npm run test:db`. DB 시험은 fixture를 모두 롤백한다. 원신의 일본어 표기 原神이 지원 별칭이 되어 기존 ‘알 수 없는 작품’ fixture를 실제 미등록 작품명으로 교체했다.
