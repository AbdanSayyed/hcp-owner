import React,{useState} from 'react';
import {View,Text,Pressable} from 'react-native';
import {useLocalSearchParams,useRouter} from 'expo-router';
import {api} from '../src/api/client';
import {Screen,Card,Badge,useLoad} from '../src/lib/ui';
import {c,money,when} from '../src/lib/theme';
import {BillCard,BillSheet} from '../src/lib/billsheet';

const R=({l,v,b,color}:any)=><View style={{flexDirection:'row',justifyContent:'space-between',paddingVertical:4}}><Text style={{color:c.mute}}>{l}</Text><Text style={{fontWeight:b?'700':'500',color:color||c.text}}>{v}</Text></View>;

export default function Room(){
 const{id}=useLocalSearchParams<{id:string}>();const r=useRouter();
 const{data,err,busy,at,reload}=useLoad(async()=>{const l=await api.occupied();const s=l.find((x:any)=>String(x.id)===String(id));if(!s)throw new Error('This room is no longer occupied (guest may have checked out).');return s},[id]);
 const s:any=data;
 const[open,setOpen]=useState<any>(null);
 const ob=useLoad(async()=>s?api.roomOrders(s):[],[s?.id]);const bills:any[]=(ob.data as any)||[];
 return <Screen title={s?`Room ${s.room}`:'Room'} {...{busy:busy||ob.busy,reload:()=>{reload();ob.reload()},at,err}}>
  <Pressable onPress={()=>r.canGoBack()?r.back():r.replace('/occupied')}><Text style={{color:c.ink,fontWeight:'700'}}>‹ Back</Text></Pressable>
  {s&&<>
   <Card>
    <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center'}}><Text style={{fontWeight:'700',fontSize:16}}>{s.guest}</Text><Badge text={s.pending>0?'PENDING':'PAID'} color={s.pending>0?c.warn:c.ok}/></View>
    <View style={{height:8}}/>
    <R l="Check-in" v={when(s.checkIn)}/>
    <R l="Check-out" v={when(s.checkOut)}/>
   </Card>
   <Card>
    <R l="Room charges" v={money(s.roomCharge)}/>
    <R l="Restaurant" v={money(s.restaurant)}/>
    <R l="Bar" v={money(s.bar)}/>
    <R l="Extra expense (damage)" v={money(s.extra)} color={s.extra>0?c.bad:undefined}/>
    {s.discount>0&&<R l="Discount" v={'− '+money(s.discount)}/>}
    <View style={{height:1,backgroundColor:c.line,marginVertical:6}}/>
    <R b l="Total" v={money(s.total)}/>
    <R l="Paid" v={money(s.paid)} color={c.ok}/>
    <R b l="Pending" v={money(s.pending)} color={s.pending>0?c.warn:c.ok}/>
   </Card>
   <Text style={{fontWeight:'700',color:c.ink,fontSize:16}}>Restaurant &amp; Bar bills ({bills.length})</Text>
   {!bills.length&&<Card><Text style={{color:c.mute}}>{ob.busy?'Loading bills…':'No separate restaurant or bar bills found for this stay.'}</Text></Card>}
   {bills.map((b:any)=><BillCard key={b.dept+b.id} o={b} onPress={()=>setOpen(b)}/>)}
   <Text style={{color:c.mute,fontSize:12}}>Restaurant and Bar are charges posted to this room. Extra expense shows damage charges recorded for the stay.</Text>
  </>}
  <BillSheet visible={!!open} bill={open} onClose={()=>setOpen(null)} onChanged={()=>ob.reload()}/>
 </Screen>}