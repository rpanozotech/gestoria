import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { sealSecret, openSecret, newMfaSecret, totp, recoveryHash } from '../dist/utils/auth-security.js';

test('MFA secrets retain authenticated encrypted storage and reject tampering', () => {
  process.env.AUTH_ENCRYPTION_KEY=crypto.randomBytes(32).toString('hex');
  const secret=newMfaSecret();const sealed=sealSecret(secret);
  assert.ok(!sealed.includes(secret));assert.equal(openSecret(sealed),secret);
  const parts=sealed.split('.');const bytes=Buffer.from(parts[2],'base64');bytes[0]^=1;parts[2]=bytes.toString('base64');assert.throws(()=>openSecret(parts.join('.')));
});
test('MFA TOTP accepts a current code and rejects an expired time window', () => {
  const verifier=totp(newMfaSecret());const timestamp=Date.now();
  assert.equal(verifier.validate({token:verifier.generate({timestamp}),timestamp,window:0}),0);
  assert.equal(verifier.validate({token:verifier.generate({timestamp:timestamp-300000}),timestamp,window:1}),null);
});
test('MFA recovery hash normalizes human formatting without storing plaintext', () => {
  assert.equal(recoveryHash('ABCD-1234'),recoveryHash('abcd1234'));assert.notEqual(recoveryHash('ABCD-1234'),'abcd1234');
});
