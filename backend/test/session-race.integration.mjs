import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import pg from 'pg';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
if (process.env.ISOLATED_PASSWORD_GATE !== 'true' || new URL(process.env.DATABASE_URL).hostname !== 'db' || new URL(process.env.DATABASE_URL).username !== 'gate') throw new Error('Requires the schema-only isolated password gate, never production.');
const pool=new pg.Pool({connectionString:process.env.DATABASE_URL});
const password='synthetic-mfa-gate-only';const secret='JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP';
function seal(value){const iv=crypto.randomBytes(12);const c=crypto.createCipheriv('aes-256-gcm',crypto.createHash('sha256').update(process.env.AUTH_ENCRYPTION_KEY).digest(),iv);const d=Buffer.concat([c.update(value),c.final()]);return [iv,c.getAuthTag(),d].map(x=>x.toString('base64')).join('.');}
function code(s=secret,delta=0){let bits='',bytes=[];for(const c of s){bits+='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'.indexOf(c).toString(2).padStart(5,'0');}for(let i=0;i+8<=bits.length;i+=8)bytes.push(parseInt(bits.slice(i,i+8),2));const t=Buffer.alloc(8);t.writeBigUInt64BE(BigInt(Math.floor(Date.now()/30000)+delta));const h=crypto.createHmac('sha1',Buffer.from(bytes)).update(t).digest();return ((h.readUInt32BE(h[19]&15)&0x7fffffff)%1000000).toString().padStart(6,'0');}



const {issueSession}=await import('../dist/utils/auth-security.js');
const id=crypto.randomUUID();const email=`race-${id}@example.com`;await pool.query("INSERT INTO users(id,email,password_hash,full_name,role,is_active,mfa_secret) VALUES($1,$2,$3,'Synthetic Race','admin',true,$4)",[id,email,await bcrypt.hash(password,10),seal(secret)]);
const stale=(await pool.query('SELECT * FROM users WHERE id=$1',[id])).rows[0];
// A completed password change makes an already-read login snapshot stale.
await pool.query('UPDATE users SET password_hash=$1 WHERE id=$2',[await bcrypt.hash('replacement synthetic password',10),id]);
try {assert.equal(await issueSession(stale),null,'stale pre-change login must not issue a new session');assert.equal(Number((await pool.query('SELECT count(*) FROM auth_sessions WHERE user_id=$1',[id])).rows[0].count),0);console.log('PASS stale pre-change login cannot recreate session after revocation');}finally{await pool.end();}
