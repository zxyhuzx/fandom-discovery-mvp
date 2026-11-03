import {SURVEY_TITLES} from './survey-titles.js';
import {canonicalCharacter,workGenre,matchesInterest,filterGoods} from './domain.js';
import {SURVEY_NAMES} from './survey-names.js';
export const SURVEY_LABEL='체험용 예시 콘텐츠';
export const SALE_TYPES=['통판','수요조사','재고 통판','행사 후 통판'];
export const SURVEY_PEOPLE=Object.entries(SURVEY_NAMES).flatMap(([work,rows])=>rows.map(row=>({work_name:work,character_name:canonicalCharacter(work,row[0]),display_name:row[1]||row[0]})));
const products=['아크릴 키링','10cm 솜인형','스티커팩','포토카드 세트','아크릴 스탠드','캔뱃지','파우치','엽서 세트'];
const images=['keyring','doll','stickers','photocard','stand','badge','pouch','postcard'];
const creators=['밤결 공방','조각상점','느린우편','파란서랍','작은수집실','모서리 작업실','달빛인쇄소','종이정원','유리별 작업실','잔물결 스튜디오'];
function make(work,names,label,index,variant,common=false){
 const productIndex=(index+variant)%products.length,product=products[productIndex];
 const sale_type=SALE_TYPES[(index+variant)%SALE_TYPES.length];
 const sale_status=sale_type==='수요조사'?(index%2?'survey_planned':'survey_open'):['open','planned','closed'][index%3];
 return {id:'survey-'+String(index+1).padStart(3,'0'),title:SURVEY_TITLES[index],
 work_name:work,character_names:names.map(c=>canonicalCharacter(work,c)),seller_name:creators[index%creators.length],
 product_types:[product],sale_type,sale_status,genre_name:workGenre(work),platform_name:'체험용 예시',
 sale_info:'설문조사 체험을 위해 만든 가상 굿즈와 가상 작가 정보예요. 실제 판매·모집이 아니며 구매와 신청은 제공하지 않아요. '+(common?'표시된 인물 중 원하는 종류를 고르는 구성의 예시예요.':'표시된 캐릭터·라이버를 위한 굿즈 예시예요.'),
 sale_start:'2026-11-05T03:00:00.000Z',sale_end:'2026-11-30T14:59:00.000Z',
 created_at:new Date(Date.UTC(2026,10,1,0,index)).toISOString(),
 search_keywords:[product,product.replace('10cm ',''),sale_type],
 thumbnail_url:'/assets/survey/'+images[productIndex]+'.svg',source_url:null,is_test:true,is_survey_example:true,is_published:true};
}
const singles=SURVEY_PEOPLE.flatMap((p,i)=>Array.from({length:3},(_,variant)=>make(p.work_name,[p.character_name],p.display_name,i*3+variant,variant)));
const extras=Object.entries(SURVEY_NAMES).flatMap(([work,rows],i)=>[
 make(work,[rows[0][0],rows[1][0]],(rows[0][1]||rows[0][0])+'·'+(rows[1][1]||rows[1][0]),66+i*2,0),
 // Common goods explicitly relate to all listed participants, so each person's search includes them.
 make(work,rows.map(row=>row[0]),work+' 공통',67+i*2,1,true)
]);
export const SURVEY_GOODS=[...singles,...extras];
export function surveyFeed(interests,options={}){return filterGoods(SURVEY_GOODS,options).filter(p=>interests.some(i=>matchesInterest(i,p)))}
export function surveyLink(value){try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password?url.href:null}catch{return null}}
