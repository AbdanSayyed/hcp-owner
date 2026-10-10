import React,{useState} from 'react';import {View,Text,Pressable,ScrollView,TextInput,Modal} from 'react-native';import {useRouter} from 'expo-router';import {api} from '../src/api/client';import {Screen,Card,useLoad} from '../src/lib/ui';import {c,money} from '../src/lib/theme';
const iso=(d:Date)=>d.toLocaleDateString('en-CA');const ago=(n:number)=>{const d=new Date();d.setDate(d.getDate()-n);return iso(d)};const T=iso(new Date());
const RANGES:Record<string,()=>[string,string]>={Today:()=>[T,T],Yesterday:()=>[ago(1),ago(1)],'7 Days':()=>[ago(6),T],'30 Days':()=>[ago(29),T],'This Month':()=>[T.slice(0,8)+'01',T],'This Year':()=>[T.slice(0,4)+'-01-01',T]};

// ---- small calendar used by the Custom date boxes ----

const iso2=(d:Date)=>d.toLocaleDateString('en-CA');
const MONTHS=['January','February','March','April','May','June','July','August','September','October','November','December'];
const OK=/^\d{4}-\d{2}-\d{2}$/;

// Compact month calendar for picking a date range. Tap a day to start (one-day range), tap a second day to extend. Future days are disabled.
function RangeCalendar({from,to,onChange,single}:{from:string;to:string;onChange:(f:string,t:string)=>void;single?:boolean}){
 const base=OK.test(from)?new Date(from+'T00:00:00'):new Date();
 const[y,setY]=useState(base.getFullYear());const[m,setM]=useState(base.getMonth());const[step,setStep]=useState(0);
 const[view,setView]=useState<'day'|'month'|'year'>('day');
 const today=iso2(new Date());const nowY=new Date().getFullYear(),nowM=new Date().getMonth();
 const[ys,setYs]=useState(Math.min(base.getFullYear()-6,nowY-11));
 const atMax=y>nowY||(y===nowY&&m>=nowM);
 const first=new Date(y,m,1).getDay(),dim=new Date(y,m+1,0).getDate();
 const cells:(number|null)[]=[...Array(first).fill(null),...Array.from({length:dim},(_,i)=>i+1)];while(cells.length%7)cells.push(null);
 const weeks=Array.from({length:cells.length/7},(_,i)=>cells.slice(i*7,i*7+7));
 const key=(d:number)=>`${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
 const go=(d:number)=>{let ny=y,nm=m+d;if(nm<0){nm=11;ny--}if(nm>11){nm=0;ny++}setY(ny);setM(nm)};
 const pick=(k:string)=>{if(k>today)return;
  if(single){onChange(k,k);return}
  if(step===0||!OK.test(from)){onChange(k,k);setStep(1)}else{k<from?onChange(k,from):onChange(from,k);setStep(0)}};
 const Arrow=({label,onPress,off}:any)=><Pressable disabled={off} onPress={onPress} hitSlop={8} style={{width:34,height:30,alignItems:'center',justifyContent:'center',opacity:off?.25:1}}><Text style={{fontSize:20,color:c.ink,fontWeight:'700'}}>{label}</Text></Pressable>;
 const Head=({children,onPress}:any)=><Pressable onPress={onPress} hitSlop={6} style={{paddingHorizontal:8,paddingVertical:4,borderRadius:8,backgroundColor:onPress?'#EEF2F0':'transparent'}}><Text style={{fontWeight:'800',color:c.ink,fontSize:15}}>{children}{onPress?' ▾':''}</Text></Pressable>;
 const Cell=({label,sel,now,off,onPress}:any)=><Pressable disabled={off} onPress={onPress} style={{flexBasis:'31%',flexGrow:1,height:44,borderRadius:10,alignItems:'center',justifyContent:'center',backgroundColor:sel?c.ink:'#F6F8F7',borderWidth:now&&!sel?1:0,borderColor:c.brass,opacity:off?.3:1}}><Text style={{color:sel?'#fff':c.text,fontWeight:sel?'800':'600'}}>{label}</Text></Pressable>;
 const openYear=()=>{setYs(Math.min(y-6,nowY-11));setView('year')};
 return <View style={{backgroundColor:'#fff',borderRadius:12,borderWidth:1,borderColor:c.line,padding:10}}>
  {view==='day'&&<View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}>
   <Arrow label="‹" onPress={()=>go(-1)}/><View style={{flexDirection:'row',gap:6}}><Head onPress={()=>setView('month')}>{MONTHS[m]}</Head><Head onPress={openYear}>{y}</Head></View><Arrow label="›" off={atMax} onPress={()=>go(1)}/></View>}
  {view==='month'&&<View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}>
   <Arrow label="‹" onPress={()=>setY(y-1)}/><Head onPress={openYear}>{y}</Head><Arrow label="›" off={y>=nowY} onPress={()=>setY(y+1)}/></View>}
  {view==='year'&&<View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}>
   <Arrow label="‹" onPress={()=>setYs(ys-12)}/><Head>{ys} – {ys+11}</Head><Arrow label="›" off={ys+11>=nowY} onPress={()=>setYs(ys+12)}/></View>}
  {view==='year'&&<View style={{flexDirection:'row',flexWrap:'wrap',gap:8,marginTop:10}}>{Array.from({length:12},(_,i)=>ys+i).map(yr=><Cell key={yr} label={yr} sel={yr===y} now={yr===nowY} off={yr>nowY} onPress={()=>{setY(yr);setView('month')}}/>)}</View>}
  {view==='month'&&<View style={{flexDirection:'row',flexWrap:'wrap',gap:8,marginTop:10}}>{MONTHS.map((mn,i)=><Cell key={mn} label={mn.slice(0,3)} sel={i===m} now={y===nowY&&i===nowM} off={y>nowY||(y===nowY&&i>nowM)} onPress={()=>{setM(i);setView('day')}}/>)}</View>}
  {view==='day'&&<>
  <View style={{flexDirection:'row',marginTop:4}}>{['S','M','T','W','T','F','S'].map((d,i)=><Text key={i} style={{flex:1,textAlign:'center',color:c.mute,fontSize:11,fontWeight:'600'}}>{d}</Text>)}</View>
  {weeks.map((w,i)=><View key={i} style={{flexDirection:'row',marginTop:2}}>{w.map((d,j)=>{
   if(!d)return <View key={j} style={{flex:1,height:32}}/>;
   const k=key(d),future=k>today,end=k===from||k===to,inR=OK.test(from)&&OK.test(to)&&k>=from&&k<=to;
   return <Pressable key={j} disabled={future} onPress={()=>pick(k)} style={{flex:1,height:32,alignItems:'center',justifyContent:'center',backgroundColor:end?c.ink:inR?'#E3ECE9':'transparent',borderRadius:end?16:0,borderWidth:k===today&&!end?1:0,borderColor:c.brass,opacity:future?.3:1}}>
    <Text style={{color:end?'#fff':c.text,fontSize:13,fontWeight:end?'700':'500'}}>{d}</Text></Pressable>})}</View>)}
  <Text style={{color:c.mute,fontSize:12,marginTop:8,textAlign:'center'}}>{OK.test(from)?(from===to?from:`${from}  →  ${to}`):'Tap a day'}{!single&&step===1&&from===to?'  ·  tap another day to extend':''}</Text></>}
 </View>}

export default function Analytics(){const r=useRouter();const[k,setK]=useState('Today');const[pk,setPk]=useState<''|'from'|'to'>('');const[cf,setCf]=useState('');const[ct,setCt]=useState('');
 const[from,to]=k==='Custom'?[cf,ct]:RANGES[k]();const ok=/^\d{4}-\d{2}-\d{2}$/.test(from)&&/^\d{4}-\d{2}-\d{2}$/.test(to);
 const{data,err,busy,at,reload}=useLoad(async()=>ok?api.analytics(from,to):null,[from,to,ok],`an:${from}:${to}`);const s=data?.analytics?.stats??data?.stats;

 const n=(x:any)=>Number(x)||0;const cash=n(s?.totalCashInflow),exp=n(s?.totalExpenses),gst=n(s?.gstCollections),real=n(s?.totalRealized);
 const boxes:any[]=[
  {t:'TOTAL REALIZATION',v:money(real),sub:'Advances + Checkout Settlements',ic:'💰',solid:'#0E8A5F'},
  {t:'CASH FLOW',v:money(cash),sub:'Front Desk Cash Inflow',ic:'💵',col:'#1E8E5A',line:'#BFE3CF'},
  {t:'UPI FLOW',v:money(s?.totalUpiInflow),sub:'Online QR & UPI Inflow',ic:'📱',col:'#4B3FBF',line:'#D5D0F5'},
  {t:'CARD FLOW',v:money(s?.totalCardInflow),sub:'POS Machine Card Inflow',ic:'💳',col:'#1F6FB5',line:'#C4DDF2'},
  {t:'TOTAL EXPENSE',v:'- '+money(exp),sub:'Petty Cash & Operational Outflow',ic:'💸',col:'#C2410C',line:'#F5B8B8',bg:'#FFF1F1'},
  {t:'GST COLLECTION',v:money(gst),sub:'Hotel Room Standard 5% GST',ic:'🏛️',col:'#B45309',line:'#F3DFA6',bg:'#FFFBEB'},
  {t:'NET CASH IN DRAWER',v:money(s?.netCashInDrawer??cash-exp),sub:`Cash In (${money(cash)}) – Outflows (${money(exp)})`,ic:'🗄️',solid:'#1A6FB0'},
  {t:'NET HOTEL (BASE, NO GST)',v:money(s?.netHotelBase??s?.baseRevenue??Math.max(real-gst,0)),sub:'Base Revenue (Do NOT add GST)',ic:'🏨',col:'#1F3A8A',line:'#9DB4E8'},
 ];
 const Box=({t,v,sub,ic,solid,col,line,bg}:any)=><View style={{flexBasis:'48%',flexGrow:1,borderRadius:14,padding:14,backgroundColor:solid||bg||'#fff',borderWidth:1,borderColor:solid||line,minHeight:112,justifyContent:'space-between'}}>
  <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center'}}><Text style={{color:solid?'#fff':c.ink,fontWeight:'800',fontSize:11,letterSpacing:.4,flexShrink:1}}>{t}</Text><Text style={{fontSize:14}}>{ic}</Text></View>
  <Text style={{color:solid?'#fff':col,fontWeight:'800',fontSize:26,marginVertical:6}}>{v}</Text>
  <Text style={{color:solid?'#E3F2EC':col,fontWeight:'600',fontSize:11}}>{sub}</Text></View>;
 const parts=[['Room',s?.roomRevenue],['Restaurant',s?.restaurantRevenue],['Bar',s?.barRevenue]] as [string,number][];
 const R=({l,v}:any)=><View style={{flexDirection:'row',justifyContent:'space-between',paddingVertical:4}}><Text style={{color:c.mute}}>{l}</Text><Text style={{fontWeight:'600'}}>{money(v)}</Text></View>;
 return <Screen title="Analytics" {...{busy,reload,at,err}}><Pressable onPress={()=>r.back()}><Text style={{color:c.ink,fontWeight:'700'}}>‹ Back</Text></Pressable>
  <ScrollView horizontal showsHorizontalScrollIndicator={false}>{[...Object.keys(RANGES),'Custom'].map(x=><Pressable key={x} onPress={()=>{setK(x);if(x==='Custom'&&!cf){setCf(T);setCt(T)}}} style={{marginRight:8,paddingHorizontal:14,paddingVertical:7,borderRadius:20,backgroundColor:k===x?c.ink:'#fff',borderWidth:1,borderColor:c.line}}><Text style={{color:k===x?'#fff':c.text}}>{x}</Text></Pressable>)}</ScrollView>
  {k==='Custom'&&<View style={{flexDirection:'row',gap:8}}>{[['From',cf,setCf,'from'],['To',ct,setCt,'to']].map(([l,v,f,w]:any)=><View key={w} style={{flex:1,flexDirection:'row',alignItems:'center',backgroundColor:'#fff',borderRadius:10,borderWidth:1,borderColor:c.line}}><TextInput value={v} onChangeText={f} placeholder={l+' YYYY-MM-DD'} style={{flex:1,padding:10}}/><Pressable onPress={()=>setPk(w)} hitSlop={8} style={{paddingHorizontal:10,paddingVertical:8}}><Text style={{fontSize:18}}>📅</Text></Pressable></View>)}</View>}
  <Modal transparent animationType="fade" visible={!!pk} onRequestClose={()=>setPk('')}><Pressable style={{flex:1,backgroundColor:'#0008',justifyContent:'center',padding:24}} onPress={()=>setPk('')}><Pressable onPress={()=>{}}><RangeCalendar single from={pk==='to'?ct:cf} to={pk==='to'?ct:cf} onChange={(d)=>{if(pk==='from'){setCf(d);if(ct&&ct<d)setCt(d)}else{setCt(d);if(cf&&cf>d)setCf(d)}setPk('')}}/></Pressable></Pressable></Modal>
  {s&&<View style={{flexDirection:'row',flexWrap:'wrap',gap:12}}>{boxes.map(x=><Box key={x.t} {...x}/>)}</View>}
  <Text style={{color:c.mute,fontSize:12}}>Figures come from the CRM's manager analytics for the selected dates. Net cash in drawer and net hotel are worked out from those figures unless the CRM sends them directly.</Text></Screen>}