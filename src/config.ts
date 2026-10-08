import {Platform} from 'react-native';
// Your CRM address, built into the app so nobody has to type it. No /api at the end.
// Use your public address (ideally https://...) so it works on mobile data too, not just office Wi-Fi.
export const SERVER_URL: string = 'http://192.168.1.63:3000';

// The owner app signs in by itself with this CRM staff account (must be a manager account).
// Change these two lines to the manager username/password you use to log in to the CRM.
export const OWNER_USERNAME: string = 'admin';
export const OWNER_PASSWORD: string = 'admin123';

// The browser (web) build, e.g. on Netlify, shows built-in SAMPLE data and never contacts the CRM,
// so no real hotel data or password is exposed on a public website.
// The Android/iOS app (Expo Go, APK) still uses the real CRM above.
export const DEMO_MODE: boolean = Platform.OS === 'web';
