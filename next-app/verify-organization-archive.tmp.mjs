import dotenv from 'dotenv'; dotenv.config({path:'.env'});
import assert from 'node:assert/strict'; import {Pool} from 'pg';
const base='http://localhost:3000'; const pool=new Pool({connectionString:process.env.DATABASE_URL}); let id=null,cookie=''; const req=(path,opt={})=>fetch(`${base}${path}`,{...opt,headers:{cookie,'content-type':'application/json',...(opt.headers||{})}});
try {
 const login=await req('/api/auth/login',{method:'POST',body:JSON.stringify({username:'superadmin@pup.local',password:process.env.DEFAULT_STAFF_PASSWORD||'pupstaff'})}); assert.equal(login.status,200,await login.text()); cookie=login.headers.getSetCookie().map(c=>c.split(';')[0]).join('; ');
 const suffix=Date.now().toString(36).toUpperCase(); const name=`CRUD Archive Probe ${suffix}`; const acronym=`QA${suffix}`;
 let res=await req('/api/osas/organizations',{method:'POST',body:JSON.stringify({name,acronym,category:'Academic'})}); let json=await res.json(); assert.equal(res.status,201,JSON.stringify(json)); id=json.data.id;
 res=await req(`/api/osas/organizations/${id}`,{method:'PATCH',body:JSON.stringify({status:'Archived'})}); json=await res.json(); assert.equal(res.status,200,JSON.stringify(json)); assert.equal(json.data.status,'Archived');
 let row=await pool.query('SELECT status,archived_at FROM student_organizations WHERE id=$1',[id]); assert.equal(row.rows[0].status,'Archived'); assert.ok(row.rows[0].archived_at);
 res=await req(`/api/osas/organizations/${id}`,{method:'PATCH',body:JSON.stringify({status:'Inactive'})}); json=await res.json(); assert.equal(res.status,200,JSON.stringify(json));
 row=await pool.query('SELECT status,archived_at FROM student_organizations WHERE id=$1',[id]); assert.equal(row.rows[0].status,'Inactive'); assert.equal(row.rows[0].archived_at,null);
 res=await req(`/api/osas/organizations/${id}`,{method:'PATCH',body:JSON.stringify({status:'Active'})}); json=await res.json(); assert.equal(res.status,200,JSON.stringify(json));
 console.log('PASS: archive sets archived_at; leaving Archived status clears archived_at and restores list visibility');
} finally {
 if(id) await pool.query('DELETE FROM student_organizations WHERE id=$1',[id]).catch(()=>{});
 if(cookie) await fetch(`${base}/api/auth/logout`,{method:'POST',headers:{cookie}}).catch(()=>{});
 await pool.end();
}
