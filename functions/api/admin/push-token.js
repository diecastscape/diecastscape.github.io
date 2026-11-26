import {getFirebaseContext,firestoreCommit,firestoreFields,jsonResponse} from "../../_lib/firebase-rest.js";

const ADMIN_UID="urSr9gyhwBMKBSmxKC5LRRnKW1P2";
const FIREBASE_API_KEY="AIzaSyAVhJ8wvmK9dv7ohG5jnGGETWJsEiRFrVs";

async function verifyAdmin(request) {
  const header=request.headers.get("Authorization")||"";
  const token=header.startsWith("Bearer ")?header.slice(7):"";
  if(!token)return false;
  const response=await fetch("https://identitytoolkit.googleapis.com/v1/accounts:lookup?key="+FIREBASE_API_KEY,{
    method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({idToken:token})
  });
  if(!response.ok)return false;
  const data=await response.json();
  return data.users?.some(user=>user.localId===ADMIN_UID)===true;
}

export async function onRequestPost({request,env}) {
  try {
    if(!await verifyAdmin(request))return jsonResponse({ok:false,error:"Admin authorization required."},401);
    const body=await request.json();
    const token=String(body.token||"").trim();
    const ownerUid=String(body.ownerUid||"");
    if(ownerUid!==ADMIN_UID)return jsonResponse({ok:false,error:"Admin device ownership could not be verified."},403);
    if(token.length<100||token.length>4096)return jsonResponse({ok:false,error:"Invalid browser notification token."},400);
    const firebase=await getFirebaseContext(env);
    const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(token));
    const id=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,"0")).join("");
    const base=firebase.base.replace("https://firestore.googleapis.com/v1/","");
    await firestoreCommit(firebase,undefined,[{
      update:{name:base+"/adminPushTokens/"+id,fields:firestoreFields({
        token,ownerUid,active:true,updatedAt:{__timestamp:new Date().toISOString()},platform:"web"
      })},
      updateMask:{fieldPaths:["token","ownerUid","active","updatedAt","platform"]}
    }]);
    return jsonResponse({ok:true});
  } catch(error) {
    console.error("Admin push token registration:",String(error?.message||error));
    return jsonResponse({ok:false,error:"Could not register this browser for notifications."},500);
  }
}
export async function onRequestGet(){return jsonResponse({ok:false,error:"Method Not Allowed",allowedMethod:"POST"},405);}
