import {editorStatus,sameOrigin} from '../../../lib/editor';
import {studio,save} from '../../../lib/storage';
import {update} from '../../../lib/validation';
export const dynamic='force-dynamic';
const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'private, no-store'}});
async function unavailable(){const code=await editorStatus();return code===200?null:json({error:code===401?'Sign in to use the editorial desk.':'Editor access is required.'},code)}
export async function GET(){const denied=await unavailable();return denied??json(await studio())}
export async function PUT(request:Request){
 const denied=await unavailable();if(denied)return denied;
 if(!sameOrigin(request))return json({error:'Open the desk on this site to save changes.'},403);
 if(!request.headers.get('content-type')?.includes('application/json'))return json({error:'JSON is required.'},415);
 const raw=await request.text();if(raw.length>1400000)return json({error:'This edition exceeds the workspace size limit.'},413);
 let body;try{body=JSON.parse(raw)}catch{return json({error:'Invalid JSON.'},400)}
 const parsed=update.safeParse(body);if(!parsed.success){const problem=parsed.error.issues[0];return json({error:problem.path.join('.')+' — '+problem.message},400)}
 const {state,revision,action,edition}=parsed.data;
 return await save(state,revision,action==='publish'?edition:undefined)?json({revision:revision+1}):json({error:'Another editor has saved changes. Reload the latest draft.'},409);
}
