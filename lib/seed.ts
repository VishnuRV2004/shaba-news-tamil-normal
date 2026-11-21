import articles from './archive.json';
import type {StudioState,Section} from './model';
const make=(id:string,type:Section['type'],title:string,...articleIds:string[]):Section=>({id,type,title,visible:true,articleIds});
export const seed:StudioState={articles,editions:{
 newsroom:{name:'ஷபா நியூஸ் தமிழ்',accent:'#a51f28',density:'comfortable',sections:[
 make('front','lead','முகப்புச் செய்திகள்','voc-remembrance','rasipuram-case','crop-credit','kanda-sashti'),
 make('districts','grid','மாவட்டச் செய்திகள்','rail-council','joint-health','cauvery-delta','erode-music'),
 make('in-focus','feature','சிறப்புப் பதிவு','thirumanimutharu'),
 make('campus','list','கல்வியும் களமும்','sona-graduation','teachers-day','little-flower-athletics','community-clinic','rajaganapathi')]}
}};
