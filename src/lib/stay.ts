// Turns a CRM booking row (from /hospitality/history) into the summary shown for an occupied room.
const n=(x:any)=>Number(x)||0;
export type Stay={id:string;room:string;guest:string;checkIn?:string;checkOut?:string;roomCharge:number;restaurant:number;bar:number;extra:number;discount:number;total:number;paid:number;pending:number};

// A guest is "in house" when checked in and not yet checked out.
export const isInHouse=(b:any)=>{const st=String(b.status||'').toLowerCase();
 if(b.actual_checkout_time||['checked_out','cancelled','canceled','no_show'].includes(st))return false;
 return st==='checked_in'||st==='occupied'||(!!b.checkin_time&&!['reserved','booked','confirmed','pending'].includes(st))};

// Damage / extra expense. The CRM field name is not verified, so several likely names are tried (first one with an amount wins).
const EXTRA_KEYS=['damage_charges','damage_charge','damage_amount','damage_total','damages_total','damages','damage','extra_charges','extra_charge','extra_expense','extra_expenses','other_charges'];
export const extraOf=(b:any)=>{for(const k of EXTRA_KEYS){const v=b?.[k];if(v==null||v==='')continue;
 let t=0;if(Array.isArray(v))t=v.reduce((s:number,i:any)=>s+n(i?.amount??i?.charge??i?.price??i?.cost),0);else if(typeof v==='string'&&v.trim().startsWith('[')){try{t=(JSON.parse(v)||[]).reduce((s:number,i:any)=>s+n(i?.amount??i?.charge??i?.price??i?.cost),0)}catch{}}else t=n(v);
 if(t>0)return t}return 0};

export const toStay=(b:any):Stay=>{
 const roomCharge=n(b.total_room_charge),restaurant=n(b.food_total),bar=n(b.bar_total),extra=extraOf(b),discount=n(b.discount_amount);
 const total=n(b.grand_total)||Math.max(roomCharge+restaurant+bar+extra-discount,0);const paid=n(b.total_paid);
 return{id:String(b.id??b.booking_id),room:String(b.room_number||(b.rooms||[]).join(', ')||'-'),guest:b.guest_name||'Guest',checkIn:b.checkin_time,checkOut:b.checkout_time,
  roomCharge,restaurant,bar,extra,discount,total,paid,pending:Math.max(total-paid,0)}};