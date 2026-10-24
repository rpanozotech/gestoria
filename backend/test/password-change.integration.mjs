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


const oldPassword=password;const fresh='  Synthetic new password with spaces  ';
let n=30;
async function fixture(role='admin',mfa=true){const id=crypto.randomUUID();const email=`password-${id}@example.com`;await pool.query("INSERT INTO users(id,email,password_hash,full_name,role,is_active,mfa_secret) VALUES($1,$2,$3,'Synthetic Password', $4,true,$5)",[id,email,await bcrypt.hash(password,10),role,mfa?seal(secret):null]);const sid=crypto.randomUUID();await pool.query("INSERT INTO auth_sessions(id,user_id,expires_at) VALUES($1,$2,now()+interval '1 hour')",[sid,id]);const token=jwt.sign({id,role,sid},process.env.JWT_SECRET,{expiresIn:'1h'});return {id,email,token,sid};}
async function request(path,body,token,extra={}){const r=await fetch('http://127.0.0.1:5000/api/'+path,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{}),...extra},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')};}
const body=(over={})=>({currentPassword:password,newPassword:fresh,confirmPassword:fresh,code:code(),...over});
async function state(id){return (await pool.query("SELECT password_hash,mfa_secret,mfa_last_counter,mfa_recovery_hashes,(SELECT count(*)::int FROM auth_sessions WHERE user_id=users.id) sessions FROM users WHERE id=$1",[id])).rows[0];}
try {
const a=await fixture();
assert.equal((await request('auth/change-password',body())).status,401);
const noMfa=await fixture('admin',false);assert.equal((await request('auth/change-password',body(),noMfa.token)).status,401);
const client=await fixture('cliente');const cid=crypto.randomUUID();await pool.query("INSERT INTO clients(id,user_id,full_name,email,phone) VALUES($1,$2,'Synthetic Client','synthetic@example.com','000000000')",[cid,client.id]);client.token=jwt.sign({id:client.id,role:'cliente',sid:client.sid,client_id:cid},process.env.JWT_SECRET,{expiresIn:'1h'});assert.equal((await request('auth/change-password',body(),client.token)).status,403);console.log('PASS anonymous/no-MFA 401 and real client-role session 403');
const initial=await state(a.id);
for(const invalid of [{newPassword:'short',confirmPassword:'short'},{confirmPassword:'mismatch'},{newPassword:'é'.repeat(37),confirmPassword:'é'.repeat(37)},{newPassword:password,confirmPassword:password},{code:'synthetic-recovery-only'}])assert.equal((await request('auth/change-password',body(invalid),a.token)).status,400);
assert.equal((await request('auth/change-password',body({currentPassword:'wrong'}),a.token)).status,403);
assert.equal((await request('auth/change-password',body({code:'000000'}),a.token)).status,403);
assert.deepEqual(await state(a.id),initial);console.log('PASS invalid policy/mismatch/UTF8 >72 bytes/current/TOTP do not mutate hash/counter/MFA/sessions');
assert.equal((await request('auth/change-password',body(),a.token,{Origin:'https://evil.example'})).status,403);
assert.equal((await request('auth/change-password',body(),a.token,{'Sec-Fetch-Site':'cross-site'})).status,403);
assert.equal((await request('auth/change-password',body(),undefined,{Cookie:'nexusgest_token='+a.token})).status,403);
const replay=await fixture();await pool.query('UPDATE users SET mfa_last_counter=$1 WHERE id=$2',[Math.floor(Date.now()/30000),replay.id]);const beforeReplay=await state(replay.id);assert.equal((await request('auth/change-password',body(),replay.token)).status,403);assert.deepEqual(await state(replay.id),beforeReplay);console.log('PASS CSRF cross-origin/no-origin cookie and consumed TOTP replay denied without mutation');
const ok=await fixture();const second=crypto.randomUUID();await pool.query("INSERT INTO auth_sessions(id,user_id,expires_at) VALUES($1,$2,now()+interval '1 hour')",[second,ok.id]);const before=await state(ok.id);
const result=await request('auth/change-password',body({id:a.id}),ok.token);assert.equal(result.status,200);assert.deepEqual(result.data,{ok:true});assert.match(result.cookie,/Max-Age=0/);const after=await state(ok.id);assert.equal(after.sessions,0);assert.equal(after.mfa_secret,before.mfa_secret);assert.deepEqual(after.mfa_recovery_hashes,before.mfa_recovery_hashes);assert.equal(await bcrypt.compare(password,after.password_hash),false);assert.equal(await bcrypt.compare(fresh,after.password_hash),true);assert.deepEqual(await state(a.id),initial);assert.equal((await request('auth/me',null,ok.token)).status,401);const secondToken=jwt.sign({id:ok.id,role:'admin',sid:second},process.env.JWT_SECRET,{expiresIn:'1h'});assert.equal((await request('auth/me',null,secondToken)).status,401);
assert.equal((await request('auth/login',{email:ok.email,password})).status,401);const challenge=await request('auth/login',{email:ok.email,password:fresh});assert.equal(challenge.data.mfaRequired,true);const logged=await request('auth/login',{email:ok.email,password:fresh,code:code(secret,1)});assert.equal(logged.status,200);assert.ok(logged.data.token);assert.equal((await request('auth/me',null,logged.data.token)).status,200);console.log('PASS success changes only session user; exact whitespace retained; all prior sessions revoked; old password denied; new password plus MFA works');
const concurrent=await fixture();const responses=await Promise.all(Array.from({length:6},()=>request('auth/change-password',body(),concurrent.token)));assert.equal(responses.filter(r=>r.status===200).length,1);assert.ok(responses.every(r=>[200,401,403].includes(r.status)));assert.equal((await state(concurrent.id)).sessions,0);console.log('PASS concurrent changes: exactly one commit, no replay/session bypass');
const rate=await fixture();const rateBefore=await state(rate.id);for(let i=0;i<10;i++)assert.equal((await request('auth/change-password',body({currentPassword:'wrong'}),rate.token,{'X-Forwarded-For':`192.0.2.${i}`})).status,403);const limited=await request('auth/change-password',body(),rate.token);assert.equal(limited.status,429);assert.deepEqual(await state(rate.id),rateBefore);console.log('PASS 10 failures/account limit survives changing spoofed IP; 429 no mutation');
const ipVictims=await Promise.all(Array.from({length:9},()=>fixture()));let ipLimited=false;for(const victim of ipVictims){for(let j=0;j<10;j++){const r=await request('auth/change-password',body({currentPassword:'wrong'}),victim.token);if(r.status===429){ipLimited=true;break;}assert.equal(r.status,403);}if(ipLimited)break;}assert.ok(ipLimited);console.log('PASS independent IP-wide failure limit across accounts');
console.log('ALL PASSWORD GATES PASS');
} finally {await pool.end();}
