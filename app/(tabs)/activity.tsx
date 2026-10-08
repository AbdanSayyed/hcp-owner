import React,{useState} from 'react';
import {Text,Pressable,ScrollView} from 'react-native';
import {useRouter} from 'expo-router';
import {api} from '../../src/api/client';
import {Screen,Card,useLoad} from '../../src/lib/ui';
import {c,when} from '../../src/lib/theme';
const F=['all','checkin','checkout','bills','payments','discounts','fnb'];
export default function Activity(){
 const r=useRouter();const[f,setF]=useState('all');
 const{data,err,busy,at,reload}=useLoad(()=>api.activity(f),[f]);
 return <Screen title="Activity" {...{busy,reload,at,err}}>
  <ScrollView horizontal showsHorizontalScrollIndicator={false}>{F.map(x=><Pressable key={x} onPress={()=>setF(x)} style={{marginRight:8,paddingHorizontal:14,paddingVertical:7,borderRadius:20,backgroundColor:f===x?c.ink:'#fff',borderWidth:1,borderColor:c.line}}><Text style={{color:f===x?'#fff':c.text}}>{x==='fnb'?'Food & Beverage':x==='checkin'?'Check-in':x==='checkout'?'Check-out':x[0].toUpperCase()+x.slice(1)}</Text></Pressable>)}</ScrollView>
  {data&&!data.length&&<Card><Text style={{color:c.mute}}>No activity in the last 7 days for this filter.</Text></Card>}
  {(data||[]).map((a:any,i:number)=><Pressable key={a.id||i} disabled={!(a.billId&&a.dept)} onPress={()=>r.push({pathname:'/bill',params:{dept:a.dept,id:String(a.billId)}})}><Card><Text style={{fontWeight:'700'}}>{a.title}</Text><Text style={{color:c.text,marginTop:2}}>{a.body}</Text><Text style={{color:c.mute,fontSize:12,marginTop:4}}>{when(a.created_at)}</Text></Card></Pressable>)}</Screen>}
