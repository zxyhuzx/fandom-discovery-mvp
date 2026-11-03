// Small, scoped name examples, not complete rosters or live sales rankings.
const game=(work,members,source)=>({work,genre:'게임',members:members.map(n=>Array.isArray(n)?n:[n]),source});
const novel=(work,members,source)=>({work,genre:'웹소설·웹툰',members:members.map(n=>Array.isArray(n)?n:[n]),source});
const allCurated=[
 {work:['닌타마 란타로','nintama','닌타마','닌자보이 란타로','忍たま乱太郎','Nintama Rantaro'],genre:'애니·만화',members:[['란타로','Rantaro','乱太郎'],['키리마루','Kirimaru','きり丸'],['신베에','Shinbei','しんべヱ'],['도이 한스케','도이 선생님','土井半助']],source:'https://www.fctokyo.co.jp/ko/news/details/315800/'},
 {work:['해즈빈 호텔','hazbinhotel','헤즈빈호텔','헤즈빈 호텔','헤즈빈','해즈빈','Hazbin Hotel'],genre:'애니·만화',members:[['찰리 모닝스타','찰리','Charlie Morningstar'],['배기','Vaggie'],['엔젤 더스트','에인절','Angel Dust'],['알래스터','앨러스터','Alastor'],['허스크','Husk'],['니프티','Niffty']],source:'https://www.primevideo.com/-/ko/detail/0HZWTBZYQQXYW48YBANMDM2MZE'},
 game(['명조: 워더링 웨이브','wutheringwaves','명조','띵조','Wuthering Waves','鳴潮'],[['기염','Jiyan','忌炎'],['금희','Jinhsi','今汐'],['음림','Yinlin','吟霖'],['파수인','Shorekeeper','ショアキーパー']],'https://wutheringwaves.kurogames.com/kr/main'),
 game(['블루 아카이브','bluearchive','블아','블루아카','Blue Archive','ブルーアーカイブ'],[['시로코','스나오오카미 시로코','Shiroko','砂狼シロコ'],['호시노','타카나시 호시노','Hoshino','小鳥遊ホシノ'],['아루','리쿠하치마 아루','Aru','陸八魔アル'],['히나','소라사키 히나','Hina','空崎ヒナ'],['아로나','Arona','アロナ']],'https://bluearchive.nexon.com/'),
 game(['승리의 여신: 니케','nikke','니케','NIKKE','Goddess of Victory Nikke'],[['라피','Rapi'],['아니스','Anis'],['네온','Neon'],['홍련','Scarlet'],['도로시','Dorothy']],'https://nikke-kr.com/'),
 game(['림버스 컴퍼니','limbuscompany','림버스','림컴','Limbus Company'],[['이상','Yi Sang'],['파우스트','Faust'],['돈키호테','Don Quixote'],['료슈','Ryoshu'],['뫼르소','Meursault'],['홍루','Hong Lu'],['히스클리프','Heathcliff'],['이스마엘','Ishmael'],['로쟈','Rodion'],['싱클레어','Sinclair'],['오티스','Outis'],['그레고르','Gregor']],'https://limbuscompany.com/'),
 game(['라이브러리 오브 루이나','libraryofruina','라오루','루이나','Library of Ruina'],[['롤랑','Roland'],['앤젤라','Angela'],['게부라','Gebura'],['비나','Binah']],'https://store.steampowered.com/app/1256670/'),
 game(['로보토미 코퍼레이션','lobotomycorporation','로보토미','롭톰','Lobotomy Corporation'],[['앤젤라','Angela'],['호크마','Hokma'],['비나','Binah'],['게부라','Gebura']],'https://store.steampowered.com/app/568220/'),
 game(['명일방주','arknights','명방','Arknights','アークナイツ','明日方舟'],[['아미야','Amiya'],['켈시',"Kal'tsit"],['엑시아','Exusiai'],['텍사스','Texas'],['실버애쉬','SilverAsh']],'https://www.arknights.kr/'),
 game(['붕괴3rd','honkaiimpact3','붕3','붕괴3','Honkai Impact 3rd','崩壊3rd'],[['키아나 카스라나','Kiana Kaslana'],['라이덴 메이','Raiden Mei'],['브로냐 자이칙','Bronya Zaychik'],['후카','Fu Hua']],'https://honkaiimpact3.hoyoverse.com/kr-kr/'),
 game(['파이널 판타지 XIV','ffxiv','파이널 판타지 14','파판14','파판','FF14','Final Fantasy XIV'],[['알피노','Alphinaud'],['알리제','Alisaie'],['산크레드','Thancred'],['위리앙제','Urianger'],['그라하 티아',"G'raha Tia"]],'https://www.ff14.co.kr/'),
 game(['파이널 판타지 VII','ffvii','파이널 판타지 7','파판7','FF7','Final Fantasy VII'],[['클라우드 스트라이프','Cloud Strife'],['세피로스','Sephiroth'],['티파 록하트','Tifa Lockhart'],['에어리스 게인즈버러','Aerith Gainsborough']],'https://ffvii.square-enix-games.com/'),
 game(['페이트/그랜드 오더','fgo','페그오','FGO','Fate Grand Order','Fate/Grand Order'],[['마슈 키리에라이트','Mash Kyrielight'],['길가메시','Gilgamesh'],['아르토리아 펜드래곤','Artoria Pendragon'],['멀린','Merlin']],'https://fgo.netmarble.com/'),
 game(['쿠키런: 킹덤','cookierunkingdom','쿠킹덤','쿠키런킹덤','CookieRun Kingdom'],[['퓨어바닐라 쿠키','Pure Vanilla Cookie'],['홀리베리 쿠키','Hollyberry Cookie'],['다크카카오 쿠키','Dark Cacao Cookie'],['에스프레소맛 쿠키','Espresso Cookie']],'https://www.cookierun-kingdom.com/ko/'),
 game(['트릭컬 리바이브','trickcal','트릭컬','Trickcal Re:VIVE'],['에르핀','네르','디아나','비비'],'https://trickcal.com/'),
 game(['이터널 리턴','eternalreturn','이리','Eternal Return'],[['재키','Jackie'],['유키','Yuki'],['현우','Hyunwoo'],['아야','Aya'],['수아','Sua']],'https://playeternalreturn.com/'),
 game(['마비노기','mabinogi','마비','Mabinogi'],['나오','모리안','루에리','타르라크','마리'],'https://mabinogi.nexon.com/'),
 game(['마비노기 영웅전','vindictus','마영전','Vindictus'],['리시타','피오나','이비','카록','카이'],'https://heroes.nexon.com/'),
 game(['리그 오브 레전드','leagueoflegends','롤','LOL','League of Legends'],[['아리','Ahri'],['럭스','Lux'],['야스오','Yasuo'],['이즈리얼','Ezreal'],['징크스','Jinx']],'https://www.leagueoflegends.com/ko-kr/champions/'),
 game(['오버워치','overwatch','옵치','오버워치 2','Overwatch'],[['디바','D.Va'],['트레이서','Tracer'],['겐지','Genji'],['메르시','Mercy'],['키리코','Kiriko']],'https://overwatch.blizzard.com/ko-kr/heroes/'),
 game(['발로란트','valorant','발로','Valorant'],[['제트','Jett'],['세이지','Sage'],['소바','Sova'],['레이나','Reyna'],['킬조이','Killjoy']],'https://playvalorant.com/ko-kr/agents/'),
 game(['단간론파','danganronpa','단간','Danganronpa','ダンガンロンパ'],[['나에기 마코토','Makoto Naegi'],['키리기리 쿄코','Kyoko Kirigiri'],['에노시마 준코','Junko Enoshima'],['코마에다 나기토','Nagito Komaeda'],['히나타 하지메','Hajime Hinata']],'https://www.danganronpa.com/'),
 novel(['어두운 바다의 등불이 되어','darksea','어바등'],['박무현','신해량','김재희'],'https://hibook.co.kr/chapter.html?book=38100'),
 novel(['마법명가 차남으로 살아남는 법','magesecondson','마차살','차살'],['루카','레오','에스체트'],'https://witchform.com/w/search?keyword=마차살'),
 novel(['괴담에 떨어져도 출근을 해야 하는구나','ghoststorywork','괴담출근','괴출'],['김솔음','이자헌','백사헌'],'https://page.kakao.com/menu/11/screen/36?tab_uid=2'),
 novel(['너희들은 변호됐다','youhavebeendefended','변호됨'],['차주한'],'https://series.naver.com/novel/detail.series?productNo=12126901'),
 novel(['이세계 착각 헌터','mistakenhunter','이착헌'],['김기려','강창호','선우연'],'https://witchform.com/demand_form.php?idx=88432'),
 novel(['은행원도 용꿈을 꾸나요','bankersdreamofdragons','은용꿈','은용꾸'],['은수원'],'https://ridibooks.com/books/6188000001'),
 novel(['우리 호텔 정상 영업합니다','ourhotel','우호정','우리호텔 정상영업합니다'],['이연우'],'https://page.kakao.com/content/68049147'),
 novel(['화산귀환','returnoftheblossomingblade','화귀','화산'],['청명','백천','유이설','윤종','조걸'],'https://series.naver.com/'),
 novel(['백작가의 망나니가 되었다','trashofthecountsfamily','백망되'],['케일 헤니투스','최한','라온 미르'],'https://page.kakao.com/menu/10'),
 novel(['회귀자 사용설명서','regressorinstructionmanual','회사설'],['이기영','김현성','정하얀'],'https://page.kakao.com/menu/10'),
 novel(['SSS급 죽어야 사는 헌터','sssclasshunter','스자헌','SSS급 자살헌터'],['김공자','검제','라비엘 이반시아'],'https://page.kakao.com/landing/ranking/10'),
 novel(['명문고 EX급 조연의 리플레이','exrankreplay','명급리','명문고'],['조의신','황지호','백호군'],'https://series.naver.com/novel/detail.series?productNo=4844784'),
 novel(['적국의 왕자로 사는 법','rebornenemyprince','적왕사'],['칼리안','플란츠','앨런 마나실'],'https://series.naver.com/'),
 novel(['일타강사 백사부','starinstructorbaek','백사부'],['백수룡'],'https://series.naver.com/'),
 novel(['광마회귀','returnofthemaddemon','광마'],['이자하'],'https://series.naver.com/'),
 novel(['마법학교 마법사로 살아가는 법','magicacademymage','마마살'],['이한 워다나즈'],'https://page.kakao.com/menu/11/screen/36?tab_uid=2')
];
const excludedNovels=new Set(['일타강사 백사부','광마회귀','마법학교 마법사로 살아가는 법','회귀자 사용설명서','SSS급 죽어야 사는 헌터']);
export const CURATED_CATALOG=allCurated.filter(g=>!excludedNovels.has(g.work[0]));
export const RETIRED_CURATED_CATALOG=allCurated.filter(g=>excludedNovels.has(g.work[0]));
export const DISCOVERY_ANIME=new Set([
 '닌타마 란타로','데스노트','은혼','괴수 8호','나의 히어로 아카데미아','해즈빈 호텔',
 '하이큐!!','주술회전','귀멸의 칼날','나루토','블루 록','쿠로코의 농구','체인소 맨',
 '원피스','블리치','헌터×헌터','진격의 거인','문호 스트레이독스','흑집사',
 '가정교사 히트맨 REBORN!','카드캡터 사쿠라','장송의 프리렌','약사의 혼잣말',
 '사카모토 데이즈','윈드브레이커','도쿄 리벤저스','나츠메 우인장','프리!','유리!!! on ICE','보석의 나라'
]);
export const EXTRA_WORK_ALIASES={
 '나의 히어로 아카데미아':['나히아','히로아카','MHA'], '괴수 8호':['괴수8','괴팔','Kaiju No. 8'], '데스노트':['데노'], '은혼':['긴타마'],
 '전지적 독자 시점':['전독'], '나 혼자만 레벨업':['나혼렙'], '내가 키운 S급들':['내스급'],
 '붕괴: 스타레일':['스타레','붕스'], '젠레스 존 제로':['젠존제'], '홀로라이브':['홀로'], '니지산지':['니지'], '스텔라이브':['스텔'],
 '헌터×헌터':['헌헌','헌터헌터'], '문호 스트레이독스':['문스독'], '마법소녀 마도카 마기카':['마마마'], '가정교사 히트맨 REBORN!':['가히리'],
 '페르소나 3':['페3','P3'], '페르소나 4':['페4','P4'], '페르소나 5':['페5','P5']
};
export const GENRE_OVERRIDES={'페르소나 3':'게임','페르소나 4':'게임','페르소나 5':'게임'};
export const WELCOME_WORK_ORDER={
 '애니·만화':['닌타마 란타로','데스노트','은혼','괴수 8호','나의 히어로 아카데미아','해즈빈 호텔','하이큐!!','주술회전','귀멸의 칼날'],
 '게임':['명조: 워더링 웨이브','블루 아카이브','승리의 여신: 니케','림버스 컴퍼니','원신','붕괴: 스타레일','젠레스 존 제로','명일방주'],
 '웹소설·웹툰':['어두운 바다의 등불이 되어','마법명가 차남으로 살아남는 법','괴담에 떨어져도 출근을 해야 하는구나','너희들은 변호됐다','이세계 착각 헌터','은행원도 용꿈을 꾸나요','우리 호텔 정상 영업합니다','화산귀환','전지적 독자 시점','내가 키운 S급들'],
 '버튜버':['홀로라이브','니지산지','스텔라이브']
};
export const EXTRA_VTUBER_MEMBERS={
 '홀로라이브':[['사쿠라 미코','Sakura Miko','さくらみこ'],['호쇼 마린','Houshou Marine','宝鐘マリン'],['시로가네 노엘','Shirogane Noel','白銀ノエル'],['오오조라 스바루','Oozora Subaru','大空スバル'],['네코마타 오카유','Nekomata Okayu','猫又おかゆ'],['이누가미 코로네','Inugami Korone','戌神ころね'],['토코야미 토와','Tokoyami Towa','常闇トワ']],
 '니지산지':[['켄모치 토야','Kenmochi Toya','剣持刀也'],['후와 미나토','Fuwa Minato','不破湊'],['카가미 하야토','Kagami Hayato','加賀美ハヤト'],['야시로 키즈쿠','Yashiro Kizuku','社築'],['카이다 하루','Kaida Haru','甲斐田晴'],['로렌 이로아스','Lauren Iroas','ローレン・イロアス']],
 '스텔라이브':[['시라유키 히나','Shirayuki Hina'],['네네코 마시로','Neneko Mashiro'],['아카네 리제','Akane Lize'],['유즈하 리코','Yuzuha Riko']]
};
