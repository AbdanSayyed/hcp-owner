import React from 'react';import {View,Text} from 'react-native';import {api} from '../../src/api/client';import {Screen,Card,useLoad} from '../../src/lib/ui';import {c,money} from '../../src/lib/theme';
const day=()=>new Date().toLocaleDateString('en-CA');
const Tile=({l,v,m}:any)=><Card style={{flexBasis:'48%',flexGrow:1}}><Text style={{color:c.mute,fontSize:13}}>{l}</Text><Text style={{color:c.ink,fontSize:22,fontWeight:'700',marginTop:4}}>{v===undefined?'—':m?money(v):String(v)}</Text></Card>;
export default function Home(){const{data,err,busy,at,reload}=useLoad(async()=>{const s=await api.stats();const a=await api.analytics(day(),day()).catch(()=>null);const ev=await api.activity('all').catch(()=>null);return{s,a:a?.analytics?.stats??a?.stats,ev}},[],'home');
 const isToday=(x:any)=>x&&new Date(String(x).replace(' ','T')).toLocaleDateString('en-CA')===day();const evs:any[]=(data as any)?.ev||[];const cin=data?.ev?evs.filter(e=>e.type==='checkin'&&isToday(e.created_at)).length:undefined,cout=data?.ev?evs.filter(e=>e.type==='checkout'&&isToday(e.created_at)).length:undefined,disc=data?.ev?evs.filter(e=>isToday(e.created_at)).reduce((t,e)=>t+(Number(e.discount)||0),0):undefined;
 const r=data?.s?.rooms,v=data?.s?.revenue,a=data?.a;const occ=r&&r.total?Math.round(r.occupied/r.total*100)+'%':undefined;
 return <Screen title="Today" {...{busy,reload,at,err}}>
  <Card style={{backgroundColor:c.ink}}><Text style={{color:'#B9C7C3'}}>Revenue today (paid)</Text><Text style={{color:'#fff',fontSize:34,fontWeight:'700',marginTop:4}}>{v?money(v.total):'—'}</Text></Card>
  <View style={{flexDirection:'row',flexWrap:'wrap',gap:12}}>
   <Tile m l="Room" v={v?.hospitality}/><Tile m l="Restaurant" v={v?.restaurant}/><Tile m l="Bar" v={v?.bar}/><Tile m l="Pending cheques" v={a?.pendingChequesAmount}/>
   <Tile l="Check-ins today" v={cin}/><Tile l="Check-outs today" v={cout}/><Tile m l="Discounts today" v={disc}/><Tile l="Occupancy" v={occ}/><Tile l="Available rooms" v={r?.ready}/><Tile l="Occupied" v={r?.occupied}/><Tile l="Maintenance" v={r?.maintenance}/></View>
  <Text style={{color:c.mute,fontSize:12}}>Check-ins, check-outs and discounts are read from the CRM's bills and stays. Pull down to refresh.</Text></Screen>}
