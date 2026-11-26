const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SCOPES = "https://www.googleapis.com/auth/datastore https://www.googleapis.com/auth/firebase.messaging";
const ADMIN_UID = "urSr9gyhwBMKBSmxKC5LRRnKW1P2";
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
async function serviceToken(env) {
  const account = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT_JSON || "{}");
  if (account.type !== "service_account" || account.project_id !== "diecastscape" || !account.client_email || !account.private_key) {
    throw new Error("Invalid Firebase service account.");
  }
  const now = Math.floor(Date.now() / 1000);
  const unsigned = b64url(JSON.stringify({alg:"RS256",typ:"JWT"})) + "." +
    b64url(JSON.stringify({iss:account.client_email,scope:SCOPES,aud:TOKEN_URL,iat:now,exp:now+3600}));
  const key = await crypto.subtle.importKey("pkcs8", pemBytes(account.private_key),
    {name:"RSASSA-PKCS1-v1_5",hash:"SHA-256"}, false, ["sign"]);
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(unsigned));
  const response = await fetch(TOKEN_URL, {
    method:"POST", headers:{"content-type":"application/x-www-form-urlencoded"},
    body:new URLSearchParams({grant_type:"urn:ietf:params:oauth:grant-type:jwt-bearer",assertion:unsigned+"."+b64url(new Uint8Array(signature))})
  });
  const data = await response.json();
  if (!response.ok || !data.access_token) throw new Error("Firebase push authentication failed.");
  return data.access_token;
}
export async function sendAdminPushNotification(env, {orderId, amount}) {
  const token = await serviceToken(env);
  const base = "https://firestore.googleapis.com/v1/projects/diecastscape/databases/(default)/documents";
  const response = await fetch(base + "/adminPushTokens?pageSize=1000", {
    headers:{authorization:"Bearer "+token}
  });
  const collection = await response.json();
  if (!response.ok) throw new Error("Could not load admin notification devices.");
  const tokens = (collection.documents || [])
    .filter(doc => doc.fields?.active?.booleanValue === true &&
      doc.fields?.ownerUid?.stringValue === ADMIN_UID &&
      doc.fields?.token?.stringValue)
    .map(doc => doc.fields.token.stringValue);
  if (!tokens.length) return {sent:0,total:0};
  const title = "New Accessories Order — " + String(orderId);
  const body = "Payment received: ₹" + Number(amount || 0).toLocaleString("en-IN");
  let sent = 0;
  for (const deviceToken of tokens) {
    const result = await fetch("https://fcm.googleapis.com/v1/projects/diecastscape/messages:send", {
      method:"POST",
      headers:{authorization:"Bearer "+token,"content-type":"application/json"},
      body:JSON.stringify({message:{
        token:deviceToken,
        data:{title,body,orderId:String(orderId),url:"/admin/dashboard.html#accessoriesOrders"},
        webpush:{headers:{Urgency:"high"}}
      }})
    });
    if (result.ok) sent++;
    else {
      const error = await result.json().catch(() => ({}));
      const status = String(error.error?.details?.[0]?.errorCode || error.error?.status || "");
      if (status === "UNREGISTERED" || status === "INVALID_ARGUMENT") {
        // Stale browser tokens are ignored; the admin can re-enable notifications.
      } else {
        console.error("FCM delivery failed:", status || result.status);
      }
    }
  }
  return {sent,total:tokens.length};
}


export async function sendAdminTestPushNotification(env) {
  const accessToken = await serviceToken(env);
  const base = "https://firestore.googleapis.com/v1/projects/diecastscape/databases/(default)/documents";
  const response = await fetch(base + "/adminPushTokens?pageSize=1000", {
    headers: { authorization: "Bearer " + accessToken }
  });
  const collection = await response.json();
  if (!response.ok) throw new Error("Could not load admin notification devices.");
  const tokens = (collection.documents || [])
    .filter(doc => doc.fields?.active?.booleanValue === true &&
      doc.fields?.ownerUid?.stringValue === ADMIN_UID &&
      doc.fields?.token?.stringValue)
    .map(doc => doc.fields.token.stringValue);
  if (!tokens.length) return { sent: 0, total: 0, failure: "NO_REGISTERED_TOKENS" };
  let sent = 0;
  let firstFailure = null;
  for (const deviceToken of tokens) {
    const result = await fetch("https://fcm.googleapis.com/v1/projects/diecastscape/messages:send", {
      method: "POST",
      headers: { authorization: "Bearer " + accessToken, "content-type": "application/json" },
      body: JSON.stringify({ message: {
        token: deviceToken,
        data: {
          title: "Diecast.scape — Test Notification",
          body: "Your admin order notifications are working.",
          orderId: "admin-notification-test",
          url: "/admin/dashboard.html"
        },
        webpush: { headers: { Urgency: "high" } }
      }})
    });
    if (result.ok) sent++;
    else {
      const error = await result.json().catch(() => ({}));
      const details = error.error?.details || [];
      const errorCode = details.find(item => item.errorCode)?.errorCode;
      const status = String(errorCode || error.error?.status || ("HTTP_" + result.status));
      if (!firstFailure) firstFailure = status;
      console.error("FCM test delivery failed:", status, result.status);
    }
  }
  return { sent, total: tokens.length, failure: firstFailure };
}
