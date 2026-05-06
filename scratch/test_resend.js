import { resend } from '../config/resend.js';

console.log('Resend object keys:', Object.keys(resend));
if (resend.events) {
    console.log('Resend.events keys:', Object.keys(resend.events));
} else {
    console.log('Resend.events is undefined');
}
