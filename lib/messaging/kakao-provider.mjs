/** Provider boundary for a future server-only worker. No real Kakao HTTP implementation. */
export class ExternalApprovalRequiredError extends Error {
 constructor(){super('카카오 공식 상품·자격·수신 동의·심사 확인 전에는 실제 발송할 수 없습니다.');this.name='ExternalApprovalRequiredError'}
}
export function createKakaoProvider({mode='mock'}={}) {
 if(mode!=='mock') throw new ExternalApprovalRequiredError();
 return Object.freeze({
  mode:'mock',
  async send({deliveryId}) {
   if(!/^[a-f0-9-]{36}$/i.test(deliveryId??'')) throw new Error('A delivery UUID is required');
   // No fetch, SDK, recipient or provider access token is used in mock mode.
   return {status:'mocked',providerMessageId:`mock:${deliveryId}`,realMessageSent:false};
  }
 });
}
