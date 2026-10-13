/**
 * Prints a fresh VAPID key pair for Web Push, base64url like `web-push
 * generate-vapid-keys`. Public key: Vercel env VITE_VAPID_PUBLIC_KEY and the
 * function secret VAPID_PUBLIC_KEY. Private key: function secret only.
 *   npm run -s gen:vapid
 */
import { createECDH } from 'node:crypto';

const ecdh = createECDH('prime256v1');
ecdh.generateKeys();
console.log(`VAPID_PUBLIC_KEY=${ecdh.getPublicKey().toString('base64url')}`);
console.log(`VAPID_PRIVATE_KEY=${ecdh.getPrivateKey().toString('base64url')}`);
