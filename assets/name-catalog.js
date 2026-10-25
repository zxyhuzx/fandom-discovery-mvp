// Curated names, not machine translation or a claim of a complete/current roster.
export const VTUBERS=[
 {work:['홀로라이브','hololive','hololive production','ホロライブ','ホロライブプロダクション'],members:[
  ['호시마치 스이세이','Hoshimachi Suisei','Suisei','星街すいせい','すいせい'],
  ['우사다 페코라','Usada Pekora','Pekora','兎田ぺこら','ぺこら'],
  ['시라카미 후부키','Shirakami Fubuki','Fubuki','白上フブキ','フブキ']]},
 {work:['니지산지','nijisanji','にじさんじ'],members:[
  ['쿠즈하','Kuzuha','葛葉','くずは'],['카나에','Kanae','叶','かなえ'],['츠키노 미토','Tsukino Mito','Mito Tsukino','月ノ美兎']]},
 {work:['스텔라이브','stellive','StelLive','ステルライブ'],members:[
  ['아야츠노 유니','Ayatsuno Yuni','Yuni','純角ユニ','ユニ'],['아라하시 타비','Arahashi Tabi','Tabi','荒波子タビ','タビ']]}
];
export const WORK_NAME_ALIASES={
 '나루토':['ナルト','NARUTO'], '하이큐!!':['ハイキュー!!'], '주술회전':['呪術廻戦','Jujutsu Kaisen'],
 '귀멸의 칼날':['鬼滅の刃','Kimetsu no Yaiba','Demon Slayer'], '원신':['原神','Genshin Impact'],
 '전지적 독자 시점':['全知的な読者の視点から','Omniscient Reader'], '블루 록':['ブルーロック','Blue Lock'],
 '쿠로코의 농구':['黒子のバスケ','Kuroko no Basket'], '체인소 맨':['チェンソーマン','Chainsaw Man'],
 '붕괴: 스타레일':['崩壊スターレイル','Honkai Star Rail'], '젠레스 존 제로':['ゼンレスゾーンゼロ','Zenless Zone Zero'],
 '나 혼자만 레벨업':['俺だけレベルアップな件','Solo Leveling'], '내가 키운 S급들':['The S-Classes That I Raised']
};
export const CHARACTER_NAME_ALIASES={
 '나루토':[['우즈마키 나루토','Naruto Uzumaki','Uzumaki Naruto','うずまきナルト'],['휴우가 히나타','Hinata Hyuga','Hyuga Hinata','Hinata','히나타','日向ヒナタ','ヒナタ'],['우치하 사스케','Sasuke Uchiha','うちはサスケ']],
 '하이큐!!':[['히나타 쇼요','Hinata Shoyo','Shoyo Hinata','Hinata','히나타','日向翔陽','日向','翔陽'],['카게야마 토비오','Kageyama Tobio','Tobio Kageyama','影山飛雄','影山'],['코즈메 켄마','Kozume Kenma','Kenma','孤爪研磨','研磨'],['쿠로오 테츠로','Kuroo Tetsuro','黒尾鉄朗'],['츠키시마 케이','Tsukishima Kei','月島蛍'],['오이카와 토오루','Oikawa Toru','及川徹']],
 '주술회전':[['고죠 사토루','Gojo Satoru','Satoru Gojo','五条悟','五条'],['게토 스구루','Geto Suguru','夏油傑'],['이타도리 유지','Itadori Yuji','虎杖悠仁'],['후시구로 메구미','Fushiguro Megumi','伏黒恵']],
 '귀멸의 칼날':[['카마도 탄지로','Kamado Tanjiro','Tanjiro','竈門炭治郎'],['카마도 네즈코','Kamado Nezuko','Nezuko','竈門禰豆子']],
 '원신':[['종려','Zhongli','鍾離'],['벤티','Venti','ウェンティ'],['타르탈리아','Tartaglia','Childe','タルタリヤ'],['알하이탐','Alhaitham','アルハイゼン'],['느비예트','Neuvillette','ヌヴィレット']],
 '붕괴: 스타레일':[['단항','Dan Heng','丹恒'],['카프카','Kafka','カフカ'],['경원','Jing Yuan','景元']],
 '블루 록':[['이사기 요이치','Isagi Yoichi','Yoichi Isagi','潔世一'],['나기 세이시로','Nagi Seishiro','凪誠士郎']],
 '체인소 맨':[['덴지','Denji','デンジ'],['파워','Power','パワー'],['하야카와 아키','Hayakawa Aki','早川アキ']]
};
for(const group of VTUBERS)CHARACTER_NAME_ALIASES[group.work[0]]=group.members;
