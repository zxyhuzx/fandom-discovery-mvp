import {saleFormUrl} from './goods-metadata.js';

// Present existing source text; never invent a price, deadline or purchase channel.
export function detailFacts(post){
 const text=String(post.sale_info||'').replace(/https:\/\/[^\s]+/gu,'').replace(/(?:공개 판매 안내|판매 폼):\s*$/u,'').trim();
 const sentences=text.split(/(?<=[.!?。])\s+|\n+/u).map(s=>s.trim()).filter(Boolean);
 const dmSentence=sentences.find(s=>/(?:DM\s*문의|디엠(?:으로|주세요|\s*문의)|문의.*(?:DM|디엠))/iu.test(s)&&!/(?:불가|받지|하지\s*않|금지)/u.test(s));
 const priceDm=!!dmSentence&&/(?:가격|금액)/u.test(dmSentence);
 const priceSentence=sentences.find(s=>/(?:[\d,]+\s*(?:원|엔|円|달러)|[₩¥$]\s*[\d,]+)/u.test(s)&&/(?:가격|금액|판매가|개당|세트|1차금|예상가)/u.test(s)&&!/(?:추첨|이벤트|상품권|경품)/u.test(s));
 const boilerplate=s=>/^원문과 판매처에서 조기 품절·일정 변경 여부를 확인해 주세요\.?$/u.test(s);
 const first=sentences.find(s=>!boilerplate(s));
 const product=first&&first.length<=160?first.replace(/(?:\s*판매 공지|\s*판매 안내)?입니다\.?$/u,'').replace(/\.$/u,''):post.title;
 const survey=String(post.sale_status||'').startsWith('survey');
 const purchase=dmSentence?'판매자 DM 문의':saleFormUrl(post)?survey?'수요조사 폼에서 확인':'판매 페이지에서 확인':post.source_kind==='x_discovery'?'X 원문에서 확인':'원본 페이지에서 확인';
 const price=priceDm?'판매자 DM 문의':priceSentence||'원문에서 확인';
 const remaining=sentences.filter(s=>s!==first&&s!==priceSentence&&s!==dmSentence&&!boilerplate(s));
 const important=remaining.filter(s=>/(?:불가|불포함|제외|필수|한정|환불|성인|연령|시리얼|방문자|현장\s*수령|해외|국제\s*배송|최소\s*수량|본품.*포함|본품.*않)/u.test(s));
 return {product,purchase,price,purchaseLabel:survey?'참여 방법':'구매 방법',priceLabel:survey?'예상 가격':'가격',important,extra:remaining.filter(s=>!important.includes(s))};
}
