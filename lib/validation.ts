import {z} from 'zod';
const id=z.string().regex(/^[a-z0-9][a-z0-9-]{0,99}$/);
const safeUrl=z.string().max(2048).refine(s=>{if(!s)return true;try{const u=new URL(s);return u.protocol==='https:' && !u.username && !u.password;}catch{return false;}});
const photo=z.union([z.string().regex(/^\/photos\/[a-zA-Z0-9._-]+$/),z.string().regex(/^\/media\/[a-f0-9-]{36}\.(?:jpg|webp|png)$/),safeUrl]);
const word=(limit:number)=>z.string().trim().min(1).max(limit);
const text=(limit:number)=>z.string().max(limit);
const article=z.object({id,title:word(240),summary:text(1200),body:text(18000),category:word(100),district:text(100),author:text(150),date:z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(s=>{const t=new Date(s+'T12:00:00Z');return Number.isFinite(+t)&&t.toISOString().slice(0,10)===s}),image:photo,sourceUrl:safeUrl}).strict();
const section=z.object({id,type:z.enum(['lead','grid','list','feature']),title:word(240),visible:z.boolean(),articleIds:z.array(id).max(100).refine(ids=>new Set(ids).size===ids.length)}).strict();
const edition=z.object({name:word(100),accent:z.string().regex(/^#[0-9a-f]{6}$/i),density:z.enum(['comfortable','compact']),sections:z.array(section).max(40).refine(s=>new Set(s.map(r=>r.id)).size===s.length)}).strict();
export const update=z.object({revision:z.number().int().min(0),action:z.enum(['save','publish']),edition:z.literal('newsroom').optional(),state:z.object({articles:z.array(article).max(250),editions:z.object({newsroom:edition}).strict()}).strict()}).strict().superRefine((v,ctx)=>{
 const stories=new Set(v.state.articles.map(a=>a.id));
 if(stories.size!==v.state.articles.length || Object.values(v.state.editions).some(e=>e.sections.some(s=>s.articleIds.some(id=>!stories.has(id)))))ctx.addIssue({code:'custom',path:['state'],message:'Each mapped story must exist and story IDs must be unique.'});
 if(v.action==='publish'&&!v.edition)ctx.addIssue({code:'custom',path:['edition'],message:'Choose the edition to publish.'});
});
