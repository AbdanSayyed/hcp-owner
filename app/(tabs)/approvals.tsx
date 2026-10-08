import React,{useEffect,useState} from 'react';
import {View,Text,Alert,Pressable} from 'react-native';
import {useRouter} from 'expo-router';
import {api,errMsg} from '../../src/api/client';
import {Screen,Card,Btn,Badge,useLoad} from '../../src/lib/ui';
import {c,money,when} from '../../src/lib/theme';
import {useAuth} from '../../src/store/auth';

export default function Approvals(){
 const r=useRouter();
 const{data,err,busy,at,reload}=useLoad(()=>api.approvals());
 const[act,setAct]=useState<any>(null);
 // readOnly = the CRM has no approval workflow, so this lists discounts that were already applied on settled bills.
 const readOnly=!!(data as any)?.readOnly;
 const list=(data||[]).filter((x:any)=>readOnly||(x.status||'PENDING').toUpperCase()==='PENDING');
 useEffect(()=>{useAuth.getState().setBadges({approvals:readOnly?0:list.length})},[list.length,readOnly]);
 const run=(x:any,kind:'approve'|'reject')=>Alert.alert(kind==='approve'?'Approve discount?':'Reject discount?',`${money(x.discount)} on bill ${x.bill_number||x.bill_id}`,[{text:'Cancel',style:'cancel'},{text:kind==='approve'?'Approve':'Reject',style:kind==='approve'?'default':'destructive',onPress:async()=>{setAct(x.id);try{await (kind==='approve'?api.approve(x.id):api.reject(x.id));await reload()}catch(e){Alert.alert('Not processed',errMsg(e))}finally{setAct(null)}}}]);
 const Row=({l,v}:any)=><View style={{flexDirection:'row',justifyContent:'space-between',paddingVertical:3}}><Text style={{color:c.mute}}>{l}</Text><Text style={{color:c.text,fontWeight:'600'}}>{v}</Text></View>;
 return <Screen title={readOnly?'Discounts':'Approvals'} {...{busy,reload,at,err}}>
  {readOnly&&<Card><Text style={{fontWeight:'600'}}>Discounts given in the last 7 days</Text><Text style={{color:c.mute,marginTop:4}}>Your CRM applies discounts directly at billing, so there is nothing to approve yet. Tap a discount to open the bill.</Text></Card>}
  {!err&&data&&!list.length&&<Card><Text style={{fontWeight:'600'}}>{readOnly?'No discounts in the last 7 days':'No discounts waiting'}</Text>{!readOnly&&<Text style={{color:c.mute,marginTop:4}}>Requests from reception appear here.</Text>}</Card>}
  {list.map((x:any)=><Pressable key={x.id} disabled={!readOnly||!x.bill_id} onPress={()=>r.push({pathname:'/bill',params:{dept:x.dept,id:String(x.bill_id)}})}><Card><View style={{flexDirection:'row',justifyContent:'space-between',marginBottom:6}}><Text style={{fontSize:16,fontWeight:'700'}}>{readOnly?`${x.dept} · `:''}Bill {x.bill_number||x.bill_id}</Text><Badge text={readOnly?'APPLIED':'PENDING'} color={readOnly?c.brass:c.warn}/></View>
   <Row l="Guest" v={x.guest_name||'-'}/>{!!x.room_number&&<Row l="Room" v={x.room_number}/>}<Row l={readOnly?'Total before discount':'Current total'} v={money(x.current_total)}/><Row l={readOnly?'Discount given':'Discount requested'} v={money(x.discount)}/><Row l="Final amount" v={money(x.final_amount)}/><Row l={readOnly?'Billed by':'Requested by'} v={`${x.requested_by||'-'} · ${when(x.requested_at)}`}/>
   {!!x.reason&&<Text style={{marginTop:6,color:c.text}}>Reason: {x.reason}</Text>}
   {!readOnly&&<><View style={{flexDirection:'row',gap:10,marginTop:12}}><Btn kind="bad" label="Reject" disabled={act===x.id} onPress={()=>run(x,'reject')}/><Btn kind="ok" label="Approve" disabled={act===x.id} onPress={()=>run(x,'approve')}/></View>
   <Text style={{color:c.mute,fontSize:11,marginTop:8}}>The server re-checks the request, limits and your role before applying.</Text></>}</Card></Pressable>)}</Screen>}
