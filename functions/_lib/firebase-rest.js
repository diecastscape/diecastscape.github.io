const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SCOPE = "https://www.googleapis.com/auth/datastore";

function b64url(value) {
  const bytes = typeof value === "string" ? new TextEncoder().encode(value) : value;
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
function pemBytes(pem) {
  const raw = pem.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g, "");
  const binary = atob(raw);
  return Uint8Array.from(binary, c => c.charCodeAt(0));
}
export function encodeValue(v) {
  if (v === null) return { nullValue: null };
  if (typeof v === "boolean") return { booleanValue: v };
  if (typeof v === "string") return { stringValue: v };
  if (typeof v === "number") return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(encodeValue) } };
  if (v && v.__timestamp) return { timestampValue: v.__timestamp };
  return { mapValue: { fields: Object.fromEntries(Object.entries(v || {}).map(([k, x]) => [k, encodeValue(x)])) } };
}
export function decodeValue(v) {
  if (!v) return null;
  if ("stringValue" in v) return v.stringValue;
  if ("integerValue" in v) return Number(v.integerValue);
  if ("doubleValue" in v) return v.doubleValue;
  if ("booleanValue" in v) return v.booleanValue;
  if ("nullValue" in v) return null;
  if ("timestampValue" in v) return v.timestampValue;
  if ("arrayValue" in v) return (v.arrayValue.values || []).map(decodeValue);
  if ("mapValue" in v) return decodeFields(v.mapValue.fields || {});
  return null;
}
export function decodeFields(fields) {
  return Object.fromEntries(Object.entries(fields || {}).map(([k, v]) => [k, decodeValue(v)]));
}
export async function getFirebaseContext(env) {
  const account = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT_JSON || "{}");
  if (account.type !== "service_account" || account.project_id !== "diecastscape" || !account.client_email || !account.private_key) throw new Error("Invalid Firebase service account.");
  const now = Math.floor(Date.now() / 1000);
  const unsigned = b64url(JSON.stringify({alg:"RS256",typ:"JWT"})) + "." + b64url(JSON.stringify({iss:account.client_email,scope:SCOPE,aud:TOKEN_URL,iat:now,exp:now+3600}));
  const key = await crypto.subtle.importKey("pkcs8", pemBytes(account.private_key), {name:"RSASSA-PKCS1-v1_5",hash:"SHA-256"}, false, ["sign"]);
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(unsigned));
  const response = await fetch(TOKEN_URL, {method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},body:new URLSearchParams({grant_type:"urn:ietf:params:oauth:grant-type:jwt-bearer",assertion:unsigned+"."+b64url(new Uint8Array(sig))})});
  const token = await response.json();
  if (!response.ok || !token.access_token) throw new Error("Firebase authentication failed.");
  return {token:token.access_token,base:"https://firestore.googleapis.com/v1/projects/diecastscape/databases/(default)/documents"};
}
export async function firestoreGet(ctx, path) {
  const r = await fetch(ctx.base + "/" + path, {headers:{authorization:"Bearer "+ctx.token}});
  if (r.status === 404) return null;
  const d = await r.json();
  if (!r.ok) throw new Error("Firestore read failed.");
  return {name:d.name,updateTime:d.updateTime,fields:decodeFields(d.fields)};
}
export async function firestoreListCollection(ctx, collection) {
  const documents = [];
  let pageToken = "";
  do {
    const query = new URLSearchParams({ pageSize: "1000" });
    if (pageToken) query.set("pageToken", pageToken);
    const response = await fetch(ctx.base + "/" + collection + "?" + query.toString(), {headers: { authorization: "Bearer " + ctx.token }});
    const data = await response.json();
    if (!response.ok) throw new Error("Firestore collection listing failed.");
    for (const doc of data.documents || []) documents.push({ name: doc.name, fields: decodeFields(doc.fields) });
    pageToken = data.nextPageToken || "";
  } while (pageToken);
  return documents;
}
export async function firestoreCreate(ctx, collection, id, fields) {
  const encoded = Object.fromEntries(Object.entries(fields).map(([k,v]) => [k,encodeValue(v)]));
  const r = await fetch(ctx.base + "/" + collection + "?documentId=" + encodeURIComponent(id), {method:"POST",headers:{authorization:"Bearer "+ctx.token,"content-type":"application/json"},body:JSON.stringify({fields:encoded})});
  const d = await r.json();
  if (!r.ok) throw new Error("Firestore create failed.");
  return d;
}
export function firestoreFields(fields) {
  return Object.fromEntries(Object.entries(fields).map(([k,v]) => [k,encodeValue(v)]));
}
export async function firestoreBegin(ctx) {
  const r = await fetch(ctx.base+":beginTransaction", {method:"POST",headers:{authorization:"Bearer "+ctx.token,"content-type":"application/json"},body:JSON.stringify({options:{readWrite:{}}})});
  const d = await r.json();
  if (!r.ok || !d.transaction) throw new Error("Firestore transaction failed.");
  return d.transaction;
}
export async function firestoreBatchGet(ctx, paths, transaction) {
  // Firestore batchGet expects resource names, not full HTTPS REST URLs.
  const resourceBase = ctx.base.replace("https://firestore.googleapis.com/v1/", "");
  const requestBody = { documents: paths.map(p => resourceBase + "/" + p) };
  if (transaction) requestBody.transaction = transaction;
  const r = await fetch(ctx.base+":batchGet", {method:"POST",headers:{authorization:"Bearer "+ctx.token,"content-type":"application/json"},body:JSON.stringify(requestBody)});
  const raw = await r.text();
  let d;
  try {
    d = JSON.parse(raw);
  } catch {
    d = raw.trim().split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line));
  }
  if (!r.ok) {
    const apiStatus = d && d.error && d.error.status ? String(d.error.status) : "UNKNOWN";
    const apiMessage = d && d.error && d.error.message ? String(d.error.message).slice(0,300) : "No API message returned.";
    throw new Error("Firestore batch read failed: HTTP " + r.status + " (" + apiStatus + "): " + apiMessage);
  }
  if (!Array.isArray(d)) d = [d];
  const map = new Map();
  for (const x of d) if (x.found) {
    const doc = {name:x.found.name,updateTime:x.found.updateTime,fields:decodeFields(x.found.fields)};
    const resourceBase=ctx.base.replace("https://firestore.googleapis.com/v1/","");
    map.set(ctx.base + "/" + doc.name.slice(resourceBase.length+1),doc);
  }
  return map;
}
export async function firestoreCommit(ctx, transaction, writes) {
  const r = await fetch(ctx.base+":commit", {method:"POST",headers:{authorization:"Bearer "+ctx.token,"content-type":"application/json"},body:JSON.stringify({transaction,writes})});
  const raw = await r.text();
  let d = {};
  try { d = raw ? JSON.parse(raw) : {}; } catch {}
  if (!r.ok) {
    const status = String(d && d.error && d.error.status || "UNKNOWN").slice(0,80);
    const message = String(d && d.error && d.error.message || "No API message returned.").replace(/[\\r\\n]+/g," ").slice(0,300);
    throw new Error("Firestore commit failed: HTTP " + r.status + " (" + status + "): " + message);
  }
  return d;
}
export function jsonResponse(data,status) {
  return new Response(JSON.stringify(data),{status:status||200,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}});
}