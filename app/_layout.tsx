import React,{useEffect} from 'react';
import {Stack} from 'expo-router';
import {Platform} from 'react-native';
import * as N from 'expo-notifications';
import Constants from 'expo-constants';
import {useAuth} from '../src/store/auth';
import {api} from '../src/api/client';

if(Platform.OS!=='web')N.setNotificationHandler({handleNotification:async()=>({shouldShowAlert:true,shouldPlaySound:true,shouldSetBadge:false})});

export default function Root(){
 const {ready,token,load}=useAuth();
 useEffect(()=>{load()},[]);
 useEffect(()=>{
  if(!ready||!token||Platform.OS==='web')return;
  (async()=>{try{
   const p=await N.requestPermissionsAsync();if(!p.granted)return;
   const t=await N.getExpoPushTokenAsync({projectId:Constants.expoConfig?.extra?.eas?.projectId});
   await api.pushToken(t.data);
  }catch{}})();
 },[ready,token]);
 return <Stack screenOptions={{headerShown:false}}/>;
}
