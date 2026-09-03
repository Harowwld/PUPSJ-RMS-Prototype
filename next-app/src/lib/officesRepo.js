import crypto from "node:crypto";
import { query, queryOne } from "./postgres.js";
export const DEFAULT_STAFF_PASSWORD=process.env.DEFAULT_STAFF_PASSWORD||"pupstaff";
const hash=v=>crypto.createHash("sha256").update(String(v)).digest("hex");
export const getDefaultOfficeAdminId=id=>`PUP${String(id||"").trim().toUpperCase()}-001`;
let columnsEnsured = false;
export async function ensureOfficeStationColumns() {
  if (columnsEnsured) return;
  try {
    await query(`
      ALTER TABLE offices ADD COLUMN IF NOT EXISTS station_name TEXT;
      ALTER TABLE offices ADD COLUMN IF NOT EXISTS storage_path TEXT;
      ALTER TABLE offices ADD COLUMN IF NOT EXISTS ingest_token TEXT;
      ALTER TABLE offices ADD COLUMN IF NOT EXISTS scanner_model TEXT;
      ALTER TABLE offices ADD COLUMN IF NOT EXISTS last_station_ping TIMESTAMPTZ;
    `);
    columnsEnsured = true;
  } catch {
    // ignore if table doesn't exist yet
  }
}

export async function listOffices({status,q}={}){
  await ensureOfficeStationColumns();
  const f=[],p=[];
  if(status){f.push(`status=$${p.length+1}`);p.push(status);}
  if(q){f.push(`(id ILIKE $${p.length+1} OR name ILIKE $${p.length+1} OR short_name ILIKE $${p.length+1})`);p.push(`%${q}%`);}
  return query(`SELECT * FROM offices ${f.length?"WHERE "+f.join(" AND "):""} ORDER BY created_at`,p);
}

export async function getOfficeById(id){
  await ensureOfficeStationColumns();
  return queryOne("SELECT * FROM offices WHERE id=$1",[id]);
}
export async function createDefaultOfficeAdmin({officeId,shortName}){const id=getDefaultOfficeAdminId(officeId),email=`admin.${officeId}@pup.local`;const e=await queryOne("SELECT * FROM staff WHERE id=$1 OR lower(email)=lower($2)",[id,email]);if(e)return {id:e.id,email:e.email,defaultPassword:null,created:false};await query("INSERT INTO staff(id,office_id,fname,lname,role,section,status,email,password_hash,password_last_changed,updated_at) VALUES($1,$2,$3,'Admin','Admin','Administrative','Active',$4,$5,NOW(),NOW())",[id,officeId,shortName||officeId,email,hash(DEFAULT_STAFF_PASSWORD)]);return {id,email,defaultPassword:DEFAULT_STAFF_PASSWORD,created:true};}
export async function createOffice({
  id,
  name,
  short_name,
  description,
  icon,
  accent_color,
  station_name,
  storage_path,
  ingest_token,
  scanner_model,
  moduleIds,
}) {
  if (!id || !name || !short_name) throw Error("Office id, name, and short_name are required.");
  const oid = String(id).trim().toLowerCase();
  if (!/^[a-z0-9]+$/.test(oid)) throw Error("Office id must contain only letters and numbers (no spaces or symbols).");
  if (await getOfficeById(oid)) throw Error(`Office with id '${oid}' already exists.`);

  const defaultStorage = storage_path || `.local/storage/${oid}/uploads`;
  const defaultStation = station_name || `${oid.toUpperCase()}-STATION-01`;
  const defaultToken = ingest_token || `token_${oid}_${crypto.randomBytes(8).toString("hex")}`;
  const defaultScanner = scanner_model || "High-Speed Document Scanner";

  await query(
    `INSERT INTO offices(id, name, short_name, description, icon, accent_color, station_name, storage_path, ingest_token, scanner_model, last_station_ping) 
     VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())`,
    [oid, name, short_name, description || null, icon || null, accent_color || "#800000", defaultStation, defaultStorage, defaultToken, defaultScanner]
  );

  const allMods = await query("SELECT id, is_system FROM modules");
  const enabledSet = new Set(Array.isArray(moduleIds) && moduleIds.length > 0 ? moduleIds.map(String) : allMods.map((m) => m.id));
  for (const m of allMods) {
    await query(
      `INSERT INTO office_modules(office_id, module_id, enabled, updated_at) 
       VALUES($1, $2, $3, NOW()) 
       ON CONFLICT(office_id, module_id) DO UPDATE SET enabled = EXCLUDED.enabled, updated_at = NOW()`,
      [oid, m.id, Boolean(m.is_system || enabledSet.has(m.id))]
    );
  }
  const a = await createDefaultOfficeAdmin({ officeId: oid, shortName: short_name });
  const o = await getOfficeById(oid);
  Object.defineProperty(o, "_admin", { value: a, enumerable: false });
  return o;
}

export async function updateOffice(id, p) {
  if (!await getOfficeById(id)) return null;
  await query(
    `UPDATE offices SET 
       name = COALESCE($1, name),
       short_name = COALESCE($2, short_name),
       description = COALESCE($3, description),
       icon = COALESCE($4, icon),
       accent_color = COALESCE($5, accent_color),
       status = COALESCE($6, status),
       station_name = COALESCE($7, station_name),
       storage_path = COALESCE($8, storage_path),
       ingest_token = COALESCE($9, ingest_token),
       scanner_model = COALESCE($10, scanner_model),
       last_station_ping = COALESCE($11, last_station_ping),
       updated_at = NOW() 
     WHERE id = $12`,
    [
      p.name !== undefined ? p.name : null,
      p.short_name !== undefined ? p.short_name : null,
      p.description !== undefined ? p.description : null,
      p.icon !== undefined ? p.icon : null,
      p.accent_color !== undefined ? p.accent_color : null,
      p.status !== undefined ? p.status : null,
      p.station_name !== undefined ? p.station_name : null,
      p.storage_path !== undefined ? p.storage_path : null,
      p.ingest_token !== undefined ? p.ingest_token : null,
      p.scanner_model !== undefined ? p.scanner_model : null,
      p.last_station_ping !== undefined ? p.last_station_ping : null,
      id,
    ]
  );
  return getOfficeById(id);
}
export const deactivateOffice=id=>updateOffice(id,{status:"Inactive"});export const activateOffice=id=>updateOffice(id,{status:"Active"});
export async function listOfficesWithStats(){
  await ensureOfficeStationColumns();
  return query("SELECT o.*,(SELECT COUNT(*) FROM office_modules om WHERE om.office_id=o.id AND om.enabled=true)::int module_count,(SELECT COUNT(*) FROM staff s WHERE s.office_id=o.id AND s.status='Active')::int staff_count FROM offices o ORDER BY o.created_at");
}

