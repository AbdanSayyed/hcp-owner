import React from 'react';
import {View,Text,Pressable} from 'react-native';
import {useRouter} from 'expo-router';
import {api} from '../src/api/client';
import {Screen,Card,Badge,useLoad} from '../src/lib/ui';
import {c,money,when} from '../src/lib/theme';

export default function Occupied(){
 const r=useRouter();
 const{data,err,busy,at,reload}=useLoad(()=>api.occupied(),[],'occupied');
 return <Screen title="Occupied rooms" {...{busy,reload,at,err}}>
  <Pressable onPress={()=>r.canGoBack()?r.back():r.replace('/')}><Text style={{color:c.ink,fontWeight:'700'}}>‹ Back</Text></Pressable>
  {data&&!data.length&&<Card><Text style={{color:c.mute}}>No occupied rooms right now.</Text></Card>}
  {(data||[]).map((s:any)=><Pressable key={s.id} onPress={()=>r.push({pathname:'/room',params:{id:s.id}})}>
   <Card>
    <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center'}}>
     <Text style={{fontWeight:'700',fontSize:16,color:c.ink}}>Room {s.room}</Text>
     <Badge text={s.pending>0?'DUE '+money(s.pending):'PAID'} color={s.pending>0?c.warn:c.ok}/>
    </View>
    <Text style={{marginTop:2}}>{s.guest}</Text>
    <Text style={{color:c.mute,fontSize:12,marginTop:4}}>Check-in {when(s.checkIn)} · Total {money(s.total)}</Text>
   </Card>
  </Pressable>)}
 </Screen>}