import {createKakaoProvider} from './kakao-provider.mjs';
/** DB RPC is the mock simulator: atomic lock + cancellation check + deterministic receipt. */
export async function dispatchMockBatch(client,{mode='mock',batchSize=20}={}) {
 createKakaoProvider({mode}); // rejects live mode before any call, even with env flags enabled
 if(!Number.isInteger(batchSize)||batchSize<1||batchSize>100)throw new Error('Invalid batch size');
 const response=await client.rpc('process_mock_queue',{batch_size:batchSize});
 if(response.error)throw response.error;
 return {processed:response.data,mode:'mock',realMessageSent:false};
}
