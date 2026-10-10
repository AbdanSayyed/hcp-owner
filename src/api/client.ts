// All CRM access goes through here. EXISTING = routes found in the CRM audit (response shapes
// are normalised defensively; they were not verified). OWNER = routes that do NOT exist in the
// CRM yet; screens show a "not connected" state until they are added server-side.
import axios from 'axios';import AsyncStorage from '@react-native-async-storage/async-storage';import {useAuth} from '../store/auth';import {money} from '../lib/theme';import {DEMO_MODE} from '../config';import {makeDemoApi} from './demo';import {isInHouse,toStay} from '../lib/stay';
// ---- CRM safety: every path the app may touch. ROOM_BILLS = /hospitality/history (exists in the CRM; returns bookings, filtered below to checked-out stays). ----
export const ROUTES={login:'/api/auth/login',stats:'/stats',analytics:'/manager/analytics',restaurantBills:'/restaurant/settled-bills',barBills:'/bar/settled-bills',
 restaurantOrder:'/restaurant/orders/',barOrder:'/bar/orders/',ROOM_BILLS:'/hospitality/history'};
// Writes are only allowed to /owner/* (routes you add yourself). Anything else that is not a GET is blocked inside the app.
const writeAllowed=(m:string,u:string)=>m==='get'||u.startsWith('/owner/');
const http=axios.create({timeout:15000});
http.interceptors.request.use(cfg=>{const m=(cfg.method||'get').toLowerCase();if(!writeAllowed(m,cfg.url||''))return Promise.reject(new Error('Blocked: this app is read-only on the CRM.'));return cfg});
// Identical GET requests fired within 4s share one call, so rapid refreshes cannot hammer the CRM.
const inflight=new Map<string,{t:number;p:Promise<any>}>();
export const billCache=new Map<string,any>();
const sget=(url:string,params?:any)=>{const k=url+JSON.stringify(params||{});const h=inflight.get(k);if(h&&Date.now()-h.t<4000)return h.p;const p=http.get(url,{params});inflight.set(k,{t:Date.now(),p});p.catch(()=>inflight.delete(k));return p};
http.interceptors.request.use(cfg=>{const{baseUrl,token}=useAuth.getState();cfg.baseURL=baseUrl.replace(/\/$/,'')+'/api';if(token)cfg.headers.Authorization=`Bearer ${token}`;return cfg});
http.interceptors.response.use(r=>r,async e=>{const cfg:any=e.config;if(e.response?.status===401&&cfg&&!cfg._retry){cfg._retry=true;inflight.clear();const ok=await useAuth.getState().signIn();if(ok)return http.request(cfg)}return Promise.reject(e)});
export class NotConnected extends Error{constructor(){super('This feature needs an owner endpoint that the CRM server does not have yet.')}}
export const errMsg=(e:any)=>e instanceof NotConnected?e.message:e?.response?.data?.error||(e?.isAxiosError&&!e?.response?'Cannot reach the CRM server. Check your connection.':e?.message||'Something went wrong');
async function owner<T>(fn:()=>Promise<T>){try{return await fn()}catch(e:any){if(e?.response?.status===404)throw new NotConnected();throw e}}
const arr=(d:any)=>Array.isArray(d)?d:d?.data||d?.items||d?.bills||d?.orders||d?.history||[];

// ---- Owner features built from CRM routes that DO exist ----------------------------------------
// The CRM has no /api/owner/* routes. Until it does, Activity, Notifications and the discount review are
// built here from the read-only bill / stay lists. If /api/owner/* is ever added, it is used automatically.
let ownerRoutes:boolean|undefined; // undefined = not checked yet
async function ownerOr<T>(real:()=>Promise<T>,fallback:()=>Promise<T>):Promise<T>{
 if(ownerRoutes===false)return fallback();
 try{const r=await real();ownerRoutes=true;return r}catch(e:any){if(e instanceof NotConnected||e?.response?.status===404){ownerRoutes=false;return fallback()}throw e}}
const num=(x:any)=>Number(x)||0;
const ts=(s?:string)=>{const t=new Date(String(s||'').replace(' ','T')).getTime();return isNaN(t)?0:t};
export type Ev={id:string;type:string;tags:string[];title:string;body:string;created_at:string;dept:string;billId?:any;discount?:number;total?:number;guest?:string;room?:string;by?:string};
async function feed():Promise<Ev[]>{
 const week={period:'week'};
 const rs=await Promise.allSettled([sget(ROUTES.restaurantBills,week),sget(ROUTES.barBills,week),sget(ROUTES.ROOM_BILLS,{limit:100})]);
 if(rs.every(x=>x.status==='rejected'))throw (rs[0] as any).reason;
 const out:Ev[]=[];
 (['Restaurant','Bar'] as const).forEach((dept,i)=>{const r=rs[i];if(r.status!=='fulfilled')return;
  arr(r.value.data).forEach((b:any)=>{const at=b.settled_at||b.created_at;const d=num(b.discount);
   out.push({id:`${dept}:${b.id}`,type:'bills',tags:['bills','fnb',...(b.is_paid?['payments']:[]),...(d>0?['discounts']:[])],dept,billId:b.id,
    title:`${dept} bill ${b.order_number||'#'+b.id} settled`,body:`${b.customer_name||'Walk-in'} · ${money(b.total)}${b.payment_mode?' · '+String(b.payment_mode).replace('_',' '):''}${d>0?' · discount '+money(d):''}`,
    created_at:at,discount:d,total:num(b.total),guest:b.customer_name,room:b.room_number,by:b.settled_by||b.cashier_name})})});
 const h=rs[2];
 if(h.status==='fulfilled')arr(h.value.data).forEach((b:any)=>{const id=b.id??b.booking_id;const room=b.room_number||(b.rooms||[]).join(', ');const g=b.guest_name||'Guest';
  if(b.checkin_time&&ts(b.checkin_time)>Date.now()-7*864e5)out.push({id:`in:${id}`,type:'checkin',tags:['checkin'],dept:'Room',billId:undefined,title:`Check-in · Room ${room}`,body:`${g}${b.checked_in_by?' · by '+b.checked_in_by:''}`,created_at:b.checkin_time,guest:g,room});
  const co=b.actual_checkout_time||b.checkout_time;
  if(co&&(b.status==='checked_out'||co)&&ts(co)>Date.now()-7*864e5){const d=num(b.discount_amount);const total=num(b.grand_total);
   out.push({id:`out:${id}`,type:'checkout',tags:['checkout','bills',...(num(b.total_paid)>0?['payments']:[]),...(d>0?['discounts']:[])],dept:'Room',billId:id,title:`Check-out · Room ${room}`,
    body:`${g} · ${money(total)}${d>0?' · discount '+money(d):''}`,created_at:co,discount:d,total,guest:g,room,by:b.checked_out_by})}});
 return out.sort((a,b)=>ts(b.created_at)-ts(a.created_at));
}
const READ_KEY='readn';
const readSet=async():Promise<Set<string>>=>{try{return new Set(JSON.parse(await AsyncStorage.getItem(READ_KEY)||'[]'))}catch{return new Set()}};
const derived={
 activity:async(type='all')=>{const f=await feed();return (type==='all'?f:f.filter(e=>e.tags.includes(type))).slice(0,100)},
 notifications:async()=>{const f=(await feed()).slice(0,30);const r=await readSet();return f.map(e=>({id:e.id,type:e.type,title:e.title,body:e.body,created_at:e.created_at,read:r.has(e.id)}))},
 markRead:async(id?:any)=>{const r=await readSet();if(id)r.add(String(id));else (await feed()).slice(0,30).forEach(e=>r.add(e.id));await AsyncStorage.setItem(READ_KEY,JSON.stringify([...r].slice(-300)))},
 // Discounts already applied on settled bills. Read-only: the CRM has no "request a discount, owner approves" step to act on.
 approvals:async()=>{const f=(await feed()).filter(e=>num(e.discount)>0).map(e=>({id:e.id,dept:e.dept,bill_id:e.billId,bill_number:e.title.replace(/ settled$/,'').replace(/^(Restaurant|Bar) bill /,''),guest_name:e.guest,room_number:e.room,discount:e.discount,current_total:num(e.total)+num(e.discount),final_amount:e.total,requested_by:e.by,requested_at:e.created_at,status:'APPLIED'}));(f as any).readOnly=true;return f as any[]},
};
const realApi={
 async login(baseUrl:string,username:string,password:string){const r=await axios.post(baseUrl.replace(/\/$/,'')+'/api/auth/login',{username,password},{timeout:15000});
  const u=r.data.user;if(!(u.role==='manager'||u.can_access_manager))throw new Error('This account does not have owner/manager access.');return r.data as {token:string;user:any}},
 stats:()=>sget(ROUTES.stats).then(r=>r.data.stats),                       // GET, read-only, no auth on CRM
 analytics:(startDate:string,endDate:string)=>sget(ROUTES.analytics,{startDate,endDate}).then(r=>r.data), // manager only
 async bills(p:any={}){const g=(u:string,d:string)=>sget(u,p).then(r=>arr(r.data).map((b:any)=>({...b,dept:d})));
  // Room stays come from the CRM's /hospitality/history (a read-only list of bookings, default 100, newest activity first).
  // Only checked-out stays are kept so in-house guests do not appear as bills.
  const room=(u:string)=>sget(u,{limit:200,...(p.q?{q:p.q}:{})}).then(r=>arr(r.data).filter((b:any)=>b.status==='checked_out'||(b.actual_checkout_time||b.checkout_time)).map((b:any)=>{
   const n=(x:any)=>Number(x)||0;const lines=[['Room charges',n(b.total_room_charge)],['Restaurant (room)',n(b.food_total)],['Bar (room)',n(b.bar_total)]].filter(l=>(l[1] as number)>0).map(l=>({name:l[0],qty:1,price:l[1]}));
   const total=n(b.grand_total)||lines.reduce((a:number,l:any)=>a+l.price,0);
   const modes=[['Cash',b.split_cash],['Card',b.split_card],['Online',b.split_online],['Cheque',b.split_cheque]].filter(m=>n(m[1])>0).map(m=>m[0]).join(' + ');
   const ps=String(b.payment_status||'').toLowerCase();
   return {...b,dept:'Room',id:b.id??b.booking_id,order_number:b.final_receipt_no||b.voucher_number||`R-${b.id??b.booking_id??''}`,
    customer_name:b.guest_name,room_number:b.room_number||(b.rooms||[]).join(', '),total,subtotal:total,discount:n(b.discount_amount),items_json:JSON.stringify(lines),
    payment_mode:modes||b.final_settlement_mode||'-',is_paid:ps==='settled'||ps==='paid'||(n(b.total_paid)>0&&n(b.total_paid)>=total)?1:0,
    created_at:b.actual_checkout_time||b.checkout_time||b.checkin_time||b.created_at}}));
  const rs=await Promise.allSettled([g(ROUTES.restaurantBills,'Restaurant'),g(ROUTES.barBills,'Bar'),room(ROUTES.ROOM_BILLS)]);
  const core=rs.slice(0,2);if(core.every(x=>x.status==='rejected'))throw (core[0] as any).reason;
  const roomOk=rs[2].status==='fulfilled';const out=rs.flatMap(x=>x.status==='fulfilled'?x.value:[]).sort((x:any,y:any)=>String(y.created_at||'').localeCompare(String(x.created_at||'')));
  out.forEach((b:any)=>billCache.set(b.dept+':'+b.id,b));(out as any).roomOk=roomOk;return out},
 // Rooms that are occupied right now: in-house bookings from the CRM's read-only /hospitality/history.
 occupied:()=>sget(ROUTES.ROOM_BILLS,{limit:200}).then(r=>arr(r.data).filter(isInHouse).map(toStay).sort((x:any,y:any)=>String(x.room).localeCompare(String(y.room),undefined,{numeric:true}))),
 // Restaurant/Bar bills for one stay (room-folio orders). GET only. Lists that 404 are skipped; matched by room number / booking id and stay start.
 async roomOrders(stay:any){const rs=await Promise.allSettled([sget(ROUTES.restaurantBills,{period:'week'}),sget(ROUTES.barBills,{period:'week'}),sget('/restaurant/orders'),sget('/bar/orders')]);const dept=['Restaurant','Bar','Restaurant','Bar'];const seen=new Set<string>(),out:any[]=[];
  rs.forEach((r,i)=>{if(r.status!=='fulfilled')return;arr(r.value.data).forEach((b:any)=>{const rm=String(b.room_number??b.room_id??''),bk=String(b.booking_id??b.stay_id??'');const same=(rm!==''&&rm===String(stay.room))||(bk!==''&&bk===String(stay.id));if(!same)return;
   if(stay.checkIn&&ts(b.created_at)&&ts(b.created_at)<ts(stay.checkIn)-6e4)return;const k=dept[i]+':'+b.id;if(seen.has(k))return;seen.add(k);out.push({...b,dept:dept[i],room_number:b.room_number||stay.room})})});
  return out.sort((x,y)=>ts(y.created_at)-ts(x.created_at))},
 // Admin-only writes. They go to /owner/bills/* (the only write path this app allows) so the CRM stays the source of truth.
 editBill:(dept:string,id:any,body:any)=>owner(()=>http.put(`/owner/bills/${dept.toLowerCase()}/${id}`,body).then(r=>r.data)),
 deleteBill:(dept:string,id:any)=>owner(()=>http.delete(`/owner/bills/${dept.toLowerCase()}/${id}`).then(r=>r.data)),
 order:(dept:string,id:any)=>sget((dept==='Bar'?ROUTES.barOrder:ROUTES.restaurantOrder)+id).then(r=>r.data as {order:any;logs:any[]}),
 approvals:()=>ownerOr(()=>owner(()=>http.get('/owner/approvals').then(r=>arr(r.data))),derived.approvals),
 approve:(id:any)=>owner(()=>http.post(`/owner/approvals/${id}/approve`).then(r=>r.data)),
 reject:(id:any,reason?:string)=>owner(()=>http.post(`/owner/approvals/${id}/reject`,{reason}).then(r=>r.data)),
 activity:(type='all')=>ownerOr(()=>owner(()=>http.get('/owner/activity',{params:{type}}).then(r=>arr(r.data))),()=>derived.activity(type)),
 notifications:()=>ownerOr(()=>owner(()=>http.get('/owner/notifications').then(r=>arr(r.data))),derived.notifications),
 markRead:(id?:any)=>ownerRoutes===false?derived.markRead(id):owner(()=>http.post(id?`/owner/notifications/${id}/read`:'/owner/notifications/read-all').then(r=>r.data)).catch(()=>derived.markRead(id)),
 pushToken:(token:string)=>ownerRoutes===false?Promise.resolve(null):http.post('/owner/push-token',{token}).catch(()=>null),
};
// Web/demo build uses built-in sample data; native app uses the real CRM.
export const api:typeof realApi=DEMO_MODE?(makeDemoApi(billCache) as any):realApi;