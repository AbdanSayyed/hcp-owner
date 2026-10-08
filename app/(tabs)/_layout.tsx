import React from 'react';import {Tabs} from 'expo-router';import {Text} from 'react-native';import {useAuth} from '../../src/store/auth';import {c} from '../../src/lib/theme';
const ic=(g:string)=>({color}:any)=><Text style={{color,fontSize:18}}>{g}</Text>;
export default function T(){const b=useAuth(s=>s.badges);const more=b.unread;
 return <Tabs screenOptions={{headerShown:false,tabBarActiveTintColor:c.ink,tabBarInactiveTintColor:c.mute}}>
  <Tabs.Screen name="index" options={{title:'Home',tabBarIcon:ic('⌂')}}/>
  <Tabs.Screen name="activity" options={{title:'Activity',tabBarIcon:ic('≋')}}/>
  <Tabs.Screen name="approvals" options={{title:'Discounts',tabBarIcon:ic('✓'),tabBarBadge:b.approvals||undefined}}/>
  <Tabs.Screen name="bills" options={{title:'Bills',tabBarIcon:ic('₹')}}/>
  <Tabs.Screen name="more" options={{title:'More',tabBarIcon:ic('⋯'),tabBarBadge:more||undefined}}/></Tabs>}
