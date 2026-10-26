import test from 'node:test';
import assert from 'node:assert/strict';
import { readDocumentAnalysis } from '../src/lib/document-analysis.ts';

test('unavailable provider never returns a fabricated analysis', async () => {
  await assert.rejects(readDocumentAnalysis(Response.json({error:'Proveedor no disponible'}, {status:503})), /Proveedor no disponible/);
});


test('fallback, non-JSON, malformed and incomplete analysis cannot become a result', async () => {
  for (const data of [
    {success:true,isFallback:true,isLiveAI:false,text:'template'},
    {success:true,isLiveAI:true,text:'not JSON'},
    {success:true,isLiveAI:true,text:'{}'},
    {success:true,isLiveAI:true,text:JSON.stringify({entity:'Synthetic',documentType:'Synthetic',summaryEs:'Summary',recommendedAction:{bad:true}})},
  ]) await assert.rejects(readDocumentAnalysis(Response.json(data)));
});

test('valid genuine structured analysis preserves exact provider fields, unknown amounts remain unknown', async () => {
  const result={entity:'Synthetic agency',documentType:'Synthetic letter',summaryEs:'Synthetic summary',recommendedAction:'Review manually',bsn:null,financialOutcome:null};
  assert.deepEqual(await readDocumentAnalysis(Response.json({success:true,isLiveAI:true,text:'```json\n'+JSON.stringify(result)+'\n```'})),result);
});
