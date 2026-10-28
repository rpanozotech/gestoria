import assert from "node:assert/strict";
import crypto from "node:crypto";
import pg from "pg";
import bcrypt from "bcryptjs";
import {newMfaSecret,sealSecret,totp} from "../dist/utils/auth-security.js";
assert.equal(new URL(process.env.DATABASE_URL).hostname,"portal-gate-db","isolated DB required");
const db=new pg.Pool({connectionString:process.env.DATABASE_URL});
async function req(path,body,token){const r=await fetch("http://127.0.0.1:5000/api/"+path,{method:body?"POST":"GET",headers:{"Content-Type":"application/json",...(token?{Authorization:"Bearer "+token}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(15000)});return {status:r.status,data:await r.json()};}
try{
const secret=newMfaSecret(),password=crypto.randomBytes(20).toString("base64url"),email="isolated-operator@example.invalid";
await db.query("INSERT INTO users(email,password_hash,full_name,role,is_active,mfa_secret) VALUES($1,$2,$3,$4,true,$5)",[email,await bcrypt.hash(password,10),"Isolated Test Operator","admin",sealSecret(secret)]);
const login=await req("auth/login",{email,password,code:totp(secret).generate()});assert.equal(login.status,200);assert.ok(login.data.token);const staff=login.data.token;
assert.equal((await req("clients",{full_name:"Isolated Test Client",bsn:"100000001"})).status,401);
const a=await req("clients",{full_name:"Isolated Test Client",bsn:"100000001"},staff);const b=await req("clients",{full_name:"Isolated Test Client",bsn:"100000002"},staff);
assert.equal(a.status,201);assert.equal(b.status,201);assert.equal(a.data.client.status,"activo");assert.ok(a.data.portal_access.username);assert.ok(a.data.portal_access.password);assert.notEqual(a.data.portal_access.username,b.data.portal_access.username);assert.notEqual(a.data.portal_access.password,b.data.portal_access.password);
console.log("PASS new CRM clients without email get distinct per-client username/password; default active; anonymous creation denied");
for(const c of [a,b]){const u=(await db.query("select email,password_hash,role from users where id=$1",[c.data.client.user_id])).rows[0];assert.equal(u.role,"cliente");assert.equal(u.email,c.data.portal_access.username+"@portal.local");assert.notEqual(u.password_hash,c.data.portal_access.password);assert.equal(await bcrypt.compare(c.data.portal_access.password,u.password_hash),true);}
console.log("PASS password hashed at rest; internal unique identities; no linking to pre-existing users or role escalation");
const pa=await req("auth/portal-login",{identifier:a.data.portal_access.username,password:a.data.portal_access.password});const pb=await req("auth/portal-login",{identifier:b.data.portal_access.username,password:b.data.portal_access.password});assert.equal(pa.status,200);assert.equal(pb.status,200);
assert.equal((await req("portal/me",null,pa.data.token)).data.client.id,a.data.client.id);assert.equal((await req("portal/me",null,pb.data.token)).data.client.id,b.data.client.id);assert.equal((await req("clients",null,pa.data.token)).status,403);assert.equal((await req("auth/portal-login",{identifier:a.data.portal_access.username,password:b.data.portal_access.password})).status,401);
console.log("PASS both generated logins authenticate; sessions isolated to own client; mismatched password and CRM access rejected");
const before=(await db.query("select (select count(*)::int from users) as users,(select count(*)::int from clients) as clients")).rows[0];assert.equal((await req("clients",{full_name:"Isolated Duplicate Client",bsn:"100000001"},staff)).status,409);const after=(await db.query("select (select count(*)::int from users) as users,(select count(*)::int from clients) as clients")).rows[0];assert.deepEqual(before,after);
console.log("PASS duplicate BSN rolls back atomically without orphan portal user");
const inactive=await req("clients",{full_name:"Isolated Prospect Client",bsn:"100000003",status:"prospecto"},staff);assert.equal(inactive.status,201);assert.equal(inactive.data.client.status,"activo");assert.ok(inactive.data.portal_access);assert.equal((await req("auth/portal-login",{identifier:inactive.data.portal_access.username,password:inactive.data.portal_access.password})).status,200);
console.log("PASS explicitly requested prospect creates active client with working portal login");
const suspended=await req(`clients/${a.data.client.id}/deactivate`,{status:"inactivo"},staff);assert.equal(suspended.status,200);
const another=await req("clients",{full_name:"Isolated Another Client",bsn:"100000004",status:"inactivo"},staff);assert.equal(another.status,201);assert.equal(another.data.client.status,"activo");
assert.equal((await db.query("select status from clients where id=$1",[a.data.client.id])).rows[0].status,"inactivo");assert.equal((await req("portal/me",null,pa.data.token)).status,401);
console.log("PASS requested inactive affects only new creation policy; existing suspension unchanged and old session denied");
const imported=await req("clients/import",{csv:"full_name,bsn\nIsolated Imported Client,100000005"},staff);assert.equal(imported.status,201);assert.equal(imported.data.created.length,1);const importedClient=imported.data.created[0];assert.equal(importedClient.status,"activo");assert.ok(importedClient.portal_access);assert.equal((await req("auth/portal-login",{identifier:importedClient.portal_access.username,password:importedClient.portal_access.password})).status,200);
console.log("PASS CSV client import also receives active individual portal account and working credentials");
console.log("ALL AUTOMATIC PORTAL PROVISIONING GATES PASS; no credentials printed");
}finally{await db.end()}
