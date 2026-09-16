import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { encryptPII, decryptPII } from './src/lib/piiEncryption.js';
console.log(decryptPII(encryptPII("hello@world.com")));
