import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { dataDir } from '../../../lib/storage';
import {editorStatus,sameOrigin} from '../../../lib/editor';
const limit=5*1024*1024;
const reply=(error:string,status:number)=>Response.json({error},{status});
export async function POST(request:Request){
 const status=await editorStatus();if(status!==200)return reply('Editor access is required.',status);
 if(!sameOrigin(request))return reply('Open the editorial desk on this site to upload.',403);
 const mime=request.headers.get('content-type')?.split(';')[0].toLowerCase();
 if(mime!=='image/jpeg' && mime!=='image/png' && mime!=='image/webp')return reply('Choose a JPEG, PNG or WebP image.',415);
 if(Number(request.headers.get('content-length'))>limit)return reply('Choose a file smaller than 5 MiB.',413);
 const reader=request.body?.getReader();if(!reader)return reply('The image is empty.',400);
 const chunks:Uint8Array[]=[];let size=0;
 for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>limit){await reader.cancel();return reply('Choose a file smaller than 5 MiB.',413)}chunks.push(value)}
 const bytes=new Uint8Array(size);let off=0;for(const chunk of chunks){bytes.set(chunk,off);off+=chunk.length}
 const starts=(a:number[],n=0)=>a.every((b,i)=>bytes[n+i]===b);
 const ext=mime==='image/png'&&starts([137,80,78,71,13,10,26,10])?'png':mime==='image/jpeg'&&starts([255,216,255])?'jpg':mime==='image/webp'&&starts([82,73,70,70])&&starts([87,69,66,80],8)?'webp':null;
 if(!ext)return reply('The image format does not match the file.',415);
 const id=crypto.randomUUID()+'.'+ext;
 const directory=join(dataDir,'media');
 await mkdir(directory,{recursive:true,mode:0o700});
 await writeFile(join(directory,id),bytes,{flag:'wx',mode:0o600});
 return Response.json({url:'/media/'+id},{status:201,headers:{'Cache-Control':'no-store'}});
}
