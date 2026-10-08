import React, {useState} from 'react';
import {useRouter} from 'expo-router';
import {Text, TextInput, View, Pressable} from 'react-native';
import {api} from '../../src/api/client';
import {Screen, Card, Badge, useLoad} from '../../src/lib/ui';
import {BottomSheet, Choice} from '../../src/lib/sheet';
import {c, money, when} from '../../src/lib/theme';

const DEPTS = ['All', 'Room', 'Restaurant', 'Bar'];
const STATUS = ['Any', 'Paid', 'Pending'];
const SORT = ['Newest', 'Oldest', 'Highest', 'Lowest'];

export default function Bills() {
  const {data, err, busy, at, reload} = useLoad(() => api.bills(), [], 'bills');
  const [q, setQ] = useState('');
  const [d, setD] = useState('All');
  const [status, setStatus] = useState('Any');
  const [sort, setSort] = useState('Newest');
  const [sheet, setSheet] = useState(false);
  const r = useRouter();

  const roomMissing = !!data && (data as any).roomOk === false;
  let list = (data || []).filter((b: any) =>
    (d === 'All' || b.dept === d) &&
    (status === 'Any' || (status === 'Paid') === !!b.is_paid) &&
    JSON.stringify(b).toLowerCase().includes(q.toLowerCase()));
  const num = (b: any) => Number(b.total) || 0;
  if (sort === 'Oldest') list = [...list].reverse();
  if (sort === 'Highest') list = [...list].sort((a: any, b: any) => num(b) - num(a));
  if (sort === 'Lowest') list = [...list].sort((a: any, b: any) => num(a) - num(b));
  const filtered = status !== 'Any' || sort !== 'Newest';

  return (
    <>
      <Screen title="Bills" {...{busy, reload, at, err}}>
        <View style={{flexDirection: 'row', gap: 8}}>
          <TextInput value={q} onChangeText={setQ} placeholder="Search bill, guest, room" style={{flex: 1, backgroundColor: '#fff', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: c.line}} />
          <Pressable onPress={() => setSheet(true)} style={{justifyContent: 'center', paddingHorizontal: 14, borderRadius: 10, backgroundColor: filtered ? c.ink : '#fff', borderWidth: 1, borderColor: c.line}}>
            <Text style={{color: filtered ? '#fff' : c.ink, fontWeight: '700'}}>Filter</Text>
          </Pressable>
        </View>
        <View style={{flexDirection: 'row', gap: 8, flexWrap: 'wrap'}}>
          {DEPTS.map(x => (
            <Pressable key={x} onPress={() => setD(x)} style={{paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: d === x ? c.ink : '#fff', borderWidth: 1, borderColor: c.line}}>
              <Text style={{color: d === x ? '#fff' : c.text}}>{x}</Text>
            </Pressable>
          ))}
        </View>
        {roomMissing && (d === 'All' || d === 'Room') && (
          <Card><Text style={{color: c.mute}}>Room-stay bills could not be loaded from the CRM (/hospitality/history). Restaurant and bar bills are still shown.</Text></Card>
        )}
        {!list.length && !err && <Card><Text style={{color: c.mute}}>No bills found.</Text></Card>}
        {list.map((b: any, i: number) => (
          <Pressable key={`${b.dept}${b.id || i}`} onPress={() => r.push({pathname: '/bill', params: {dept: b.dept, id: String(b.id)}})}>
            <Card>
              <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
                <Text style={{fontWeight: '700'}}>{b.order_number || `#${b.id}`}</Text>
                <Text style={{fontWeight: '700', color: c.ink}}>{money(b.total)}</Text>
              </View>
              <Text style={{color: c.mute, marginTop: 2}}>{b.dept} · {b.customer_name || 'Walk-in'} · {when(b.created_at)}</Text>
              <View style={{flexDirection: 'row', gap: 8, marginTop: 6}}>
                <Badge text={b.is_paid ? 'PAID' : 'PENDING'} color={b.is_paid ? c.ok : c.warn} />
                {Number(b.discount) > 0 && <Badge text={`Discount ${money(b.discount)}`} color={c.brass} />}
              </View>
            </Card>
          </Pressable>
        ))}
      </Screen>
      <BottomSheet visible={sheet} onClose={() => setSheet(false)} title="Filter bills">
        <Text style={{color: c.mute}}>Status</Text>
        <Choice options={STATUS} value={status} onChange={setStatus} />
        <Text style={{color: c.mute}}>Sort by</Text>
        <Choice options={SORT} value={sort} onChange={setSort} />
        <Pressable onPress={() => { setStatus('Any'); setSort('Newest'); setSheet(false); }}>
          <Text style={{color: c.ink, fontWeight: '700', marginTop: 4}}>Reset</Text>
        </Pressable>
      </BottomSheet>
    </>
  );
}
