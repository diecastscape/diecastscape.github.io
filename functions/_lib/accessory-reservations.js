import {
  firestoreGet,firestoreBatchGet,firestoreCommit,firestoreFields,decodeValue,firestoreListCollection
} from "./firebase-rest.js";

export const ACCESSORY_RESERVATION_MS=5*60*1000;

export const ACCESSORY_COMBO_RECIPES={
  "#CL00":[
    {productCode:"#TR10",pieces:8},
    {productCode:"#OB06",pieces:5},
    {productCode:"#DN01",pieces:1},
    {productCode:"#LJ02",pieces:2},
    {productCode:"#TC10",pieces:10},
    {productCode:"#DE02",pieces:1},
    {productCode:"#FB01",pieces:1},
    {productCode:"#BR04",pieces:3}
  ]
};

const resourceBase=ctx=>ctx.base.replace("https://firestore.googleapis.com/v1/","");
const docPath=(ctx,path)=>resourceBase(ctx)+"/"+path;
const safeReserved=value=>Number.isInteger(Number(value))&&Number(value)>=0?Number(value):0;
const productIdFromName=name=>String(name||"").split("/").pop();

async function listExpiredSessions(firebase,now) {
  const expiresAt=new Date(now).toISOString();
  const query={
    structuredQuery:{
      from:[{collectionId:"paymentSessions"}],
      where:{fieldFilter:{
        field:{fieldPath:"expiresAt"},
        op:"LESS_THAN_OR_EQUAL",
        value:{stringValue:expiresAt}
      }},
      orderBy:[{field:{fieldPath:"expiresAt"},direction:"ASCENDING"}],
      limit:100
    }
  };
  const response=await fetch(firebase.base+":runQuery",{
    method:"POST",
    headers:{authorization:"Bearer "+firebase.token,"content-type":"application/json"},
    body:JSON.stringify(query)
  });
  const data=await response.json();
  if(!response.ok)throw new Error("Expired reservation query failed.");
  return (Array.isArray(data)?data:[])
    .filter(row=>row.document)
    .map(row=>({
      name:row.document.name,
      fields:Object.fromEntries(Object.entries(row.document.fields||{}).map(([key,value])=>[key,decodeValue(value)]))
    }));
}

function packSize(code) {
  const match=String(code||"").trim().toUpperCase().match(/(\d{2})$/);
  const size=match?Number(match[1]):1;
  return Number.isInteger(size)&&size>0?size:1;
}

async function loadProductIndex(firebase) {
  const listed=await firestoreListCollection(firebase,"accessoriesProducts");
  const ids=listed.map(doc=>productIdFromName(doc.name)).filter(Boolean);
  const paths=ids.map(id=>"accessoriesProducts/"+encodeURIComponent(id));
  const docs=await firestoreBatchGet(firebase,paths);
  const byId=new Map(),byCode=new Map(),duplicateCodes=new Set();
  for(const path of paths) {
    const doc=docs.get(firebase.base+"/"+path);
    if(!doc)continue;
    const id=productIdFromName(doc.name);
    const code=String(doc.fields.productCode||"").trim().toUpperCase();
    const row={id,...doc};
    byId.set(id,row);
    if(code) {
      if(byCode.has(code))duplicateCodes.add(code);
      else byCode.set(code,row);
    }
  }
  return {byId,byCode,duplicateCodes};
}

async function releaseOne(firebase,sessionId,expectedExpiry,terminalStatus) {
  for(let attempt=0;attempt<4;attempt++) {
    const sessionPath="paymentSessions/"+encodeURIComponent(sessionId);
    const session=await firestoreGet(firebase,sessionPath);
    if(!session||session.fields.status!=="reserved")return false;
    if(expectedExpiry&&session.fields.expiresAt!==expectedExpiry)return false;
    const reservations=Array.isArray(session.fields.stockReservations)?session.fields.stockReservations:[];
    const paths=[sessionPath,...reservations.map(row=>"accessoriesProducts/"+encodeURIComponent(row.productId))];
    const docs=await firestoreBatchGet(firebase,paths);
    const freshSession=docs.get(firebase.base+"/"+sessionPath);
    if(!freshSession||freshSession.fields.status!=="reserved")return false;
    const now=Date.now(),expiry=Date.parse(freshSession.fields.expiresAt||"");
    if(terminalStatus==="expired"&&(!Number.isFinite(expiry)||expiry>now))return false;
    const writes=[];
    for(const row of reservations) {
      const path="accessoriesProducts/"+encodeURIComponent(row.productId);
      const product=docs.get(firebase.base+"/"+path);
      if(!product)continue;
      const current=safeReserved(product.fields.reservedStock);
      const next=Math.max(0,current-Number(row.pieces||0));
      writes.push({
        update:{name:product.name,fields:firestoreFields({reservedStock:next,reservationUpdatedAt:{__timestamp:new Date().toISOString()}})},
        updateMask:{fieldPaths:["reservedStock","reservationUpdatedAt"]},
        currentDocument:{updateTime:product.updateTime}
      });
    }
    writes.push({
      update:{name:freshSession.name,fields:firestoreFields({
        status:terminalStatus,releasedAt:{__timestamp:new Date().toISOString()}
      })},
      updateMask:{fieldPaths:["status","releasedAt"]},
      currentDocument:{updateTime:freshSession.updateTime}
    });
    try { await firestoreCommit(firebase,undefined,writes); return true; }
    catch(error) {
      if(!/ABORTED|FAILED_PRECONDITION|ALREADY_EXISTS|409/i.test(String(error?.message||error))||attempt===3)throw error;
    }
  }
  return false;
}

export async function releaseExpiredAccessoryReservations(firebase,now=Date.now()) {
  const sessions=await listExpiredSessions(firebase,now);
  let released=0;
  for(const row of sessions) {
    if(row.fields.status!=="reserved")continue;
    const expiry=Date.parse(row.fields.expiresAt||"");
    if(Number.isFinite(expiry)&&expiry<=now) {
      const id=productIdFromName(row.name);
      if(await releaseOne(firebase,id,row.fields.expiresAt,"expired"))released++;
    }
  }
  return released;
}

export async function releaseAccessoryReservation(firebase,sessionId,status="released") {
  return releaseOne(firebase,sessionId,null,status);
}

export async function reserveAccessoryStock(firebase,sessionId,cartRows,sessionFields,now=Date.now()) {
  const expiresAt=new Date(now+ACCESSORY_RESERVATION_MS).toISOString();
  for(let attempt=0;attempt<4;attempt++) {
    const {byId,byCode,duplicateCodes}=await loadProductIndex(firebase);
    const verifiedItems=[];
    const requirements=new Map();
    let productTotal=0;

    for(const row of cartRows) {
      const product=byId.get(row.id);
      if(!product||product.fields.active!==true)
        throw new Error("PRODUCT_UNAVAILABLE:"+(product?.fields.name||row.id));
      const fields=product.fields;
      const price=Number(fields.price);
      const code=String(fields.productCode||"").trim().toUpperCase();
      if(!Number.isFinite(price)||price<=0||!/^#[A-Z0-9]{4}$/.test(code))
        throw new Error("PRODUCT_DATA_INVALID:"+(fields.name||row.id));
      const isCombo=Boolean(ACCESSORY_COMBO_RECIPES[code]);
      const pack=isCombo?0:packSize(code);
      const subtotal=Math.round(price*row.qty*100)/100;
      productTotal+=subtotal;
      verifiedItems.push({
        productId:row.id,name:String(fields.name||"Accessory"),
        quantityText:String(fields.quantity||""),productCode:code,
        qty:row.qty,packSize:pack,isCombo,unitPrice:price,subtotal
      });

      if(isCombo) {
        const recipe=ACCESSORY_COMBO_RECIPES[code];
        for(const component of recipe) {
          if(ACCESSORY_COMBO_RECIPES[component.productCode]||!Number.isInteger(component.pieces)||component.pieces<1)
            throw new Error("COMBO_RECIPE_INVALID:"+code);
          if(duplicateCodes.has(component.productCode))
            throw new Error("DUPLICATE_PRODUCT_CODE:"+component.productCode);
          const part=byCode.get(component.productCode);
          if(!part||part.fields.active!==true)
            throw new Error("COMBO_COMPONENT_UNAVAILABLE:"+component.productCode);
          const previous=requirements.get(part.id)||{productId:part.id,productCode:component.productCode,productName:String(part.fields.name||component.productCode),pieces:0};
          previous.pieces+=component.pieces*row.qty;
          requirements.set(part.id,previous);
        }
      } else {
        const previous=requirements.get(product.id)||{productId:product.id,productCode:code,productName:String(fields.name||code),pieces:0};
        previous.pieces+=pack*row.qty;
        requirements.set(product.id,previous);
      }
    }

    const reservationRows=[...requirements.values()];
    const productPaths=reservationRows.map(row=>"accessoriesProducts/"+encodeURIComponent(row.productId));
    const sessionPath="paymentSessions/"+encodeURIComponent(sessionId);
    const docs=await firestoreBatchGet(firebase,[...productPaths,sessionPath]);
    const freshSession=docs.get(firebase.base+"/"+sessionPath);
    if(freshSession)throw new Error("PAYMENT_SESSION_ALREADY_EXISTS");

    const writes=[];
    for(const row of reservationRows) {
      const path="accessoriesProducts/"+encodeURIComponent(row.productId);
      const product=docs.get(firebase.base+"/"+path);
      if(!product)throw new Error("STOCK_PRODUCT_MISSING:"+row.productCode);
      const stock=Number(product.fields.stock);
      const reserved=safeReserved(product.fields.reservedStock);
      if(product.fields.active!==true||!Number.isInteger(stock)||stock<0||stock-reserved<row.pieces)
        throw new Error("INSUFFICIENT_STOCK:"+row.productName);
      writes.push({
        update:{name:product.name,fields:firestoreFields({
          reservedStock:reserved+row.pieces,reservationUpdatedAt:{__timestamp:new Date(now).toISOString()}
        })},
        updateMask:{fieldPaths:["reservedStock","reservationUpdatedAt"]},
        currentDocument:{updateTime:product.updateTime}
      });
    }
    const session={
      ...sessionFields,status:"reserved",createdAt:{__timestamp:new Date(now).toISOString()},
      expiresAt,stockReservations:reservationRows
    };
    writes.push({
      update:{name:docPath(firebase,sessionPath),fields:firestoreFields(session)},
      currentDocument:{exists:false}
    });
    try {
      await firestoreCommit(firebase,undefined,writes);
      return {items:verifiedItems,stockReservations:reservationRows,productTotal:Math.round(productTotal*100)/100,expiresAt};
    } catch(error) {
      const message=String(error?.message||error);
      if(!/ABORTED|FAILED_PRECONDITION|ALREADY_EXISTS|409/i.test(message)||attempt===3)throw error;
    }
  }
  throw new Error("STOCK_RESERVATION_RETRIES_EXHAUSTED");
}
