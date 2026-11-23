(function () {
  let busy = false;
  function value(id) { return document.getElementById(id)?.value.trim() || ""; }
  function resetButton(button) {
    busy=false;
    if(button) { button.disabled=false; button.textContent="Pay Now"; }
  }
  async function releaseReservation(paymentRecordId) {
    if(!paymentRecordId)return;
    try {
      await fetch("/api/accessories/v2/cancel-order",{
        method:"POST",headers:{"content-type":"application/json"},
        body:JSON.stringify({paymentRecordId})
      });
    } catch(error) {
      console.warn("Reservation will expire automatically:",error);
    }
  }
  function loadCheckout() {
    if(window.Razorpay) return Promise.resolve();
    return new Promise((resolve,reject)=>{
      const script=document.createElement("script");
      script.src="https://checkout.razorpay.com/v1/checkout.js";
      script.onload=resolve;
      script.onerror=()=>reject(new Error("Unable to load secure payment checkout."));
      document.head.appendChild(script);
    });
  }
  async function payAccessories() {
    if(busy)return;
    const products=typeof getCartProducts==="function"?getCartProducts():[];
    if(!products.length){showToast("Your cart is empty.");return;}
    const customer={
      name:value("checkoutName"),address:value("checkoutAddress"),
      city:value("checkoutCity"),state:value("checkoutState"),
      postOffice:value("checkoutPostOffice"),pincode:value("checkoutPincode"),
      phone:value("checkoutPhone")
    };
    if(customer.name.length<2){showToast("Please enter your name.");document.getElementById("checkoutName")?.focus();return;}
    if(customer.address.length<5){showToast("Please enter your complete address.");document.getElementById("checkoutAddress")?.focus();return;}
    if(customer.city.length<2){showToast("Please enter your city.");document.getElementById("checkoutCity")?.focus();return;}
    if(customer.state.length<2){showToast("Please enter your state.");document.getElementById("checkoutState")?.focus();return;}
    if(customer.postOffice.length<2){showToast("Please enter your post office name.");document.getElementById("checkoutPostOffice")?.focus();return;}
    if(!/^\d{6}$/.test(customer.pincode)){showToast("Please enter a valid 6-digit pincode.");document.getElementById("checkoutPincode")?.focus();return;}
    if(!/^\d{10}$/.test(customer.phone)){showToast("Please enter a valid 10-digit phone number.");document.getElementById("checkoutPhone")?.focus();return;}

    busy=true;
    const button=document.getElementById("finalOnlinePayBtn");
    if(button){button.disabled=true;button.textContent="Preparing secure payment...";}
    try {
      const response=await fetch("/api/accessories/v2/create-order",{
        method:"POST",headers:{"content-type":"application/json"},
        body:JSON.stringify({items:products.map(item=>({id:String(item.id),qty:Number(item.qty)})),customer})
      });
      const order=await response.json();
      if(!response.ok)throw new Error(order.error||"Unable to prepare payment.");
      await loadCheckout();
      let paymentReturned=false;
      const checkout=new window.Razorpay({
        key:order.keyId,amount:order.amount,currency:order.currency,
        name:"Diecast.scape",description:"Accessories order",
        order_id:order.orderId,prefill:{name:customer.name,contact:customer.phone},
        notes:{paymentRecordId:order.paymentRecordId,category:"accessories",paymentVersion:"2"},
        theme:{color:"#13adbd"},
        modal:{ondismiss:()=>{if(!paymentReturned)releaseReservation(order.paymentRecordId);resetButton(button);}},
        handler:async function(paymentResponse) {
          paymentReturned=true;
          if(button)button.textContent="Verifying payment...";
          try {
            const verifyResponse=await fetch("/api/accessories/v2/verify-payment",{
              method:"POST",headers:{"content-type":"application/json"},
              body:JSON.stringify({...paymentResponse,paymentRecordId:order.paymentRecordId})
            });
            const result=await verifyResponse.json();
            if(!verifyResponse.ok||!result.ok) {
              const detail=result.diagnosticDetail?"\nDetails: "+result.diagnosticDetail:"";
              throw new Error((result.error||"Payment verification is pending.")+detail+
                "\nPayment ID: "+paymentResponse.razorpay_payment_id);
            }
            if(result.orderId) {
              try {
                const key="diecastscape_completed_orders";
                const saved=JSON.parse(localStorage.getItem(key)||"[]");
                const list=Array.isArray(saved)?saved:[];
                if(!list.includes(result.orderId))list.unshift(result.orderId);
                localStorage.setItem(key,JSON.stringify(list.slice(0,20)));
              } catch(storageError) {
                console.warn("Could not save this order on this device:",storageError);
              }
            }
            if(result.status==="paid_stock_issue") {
              alert("Payment received. Your order is recorded and needs a stock review. We will contact you.\nOrder ID: "+result.orderId);
            } else {
              alert("Payment successful! Your Accessories order is confirmed.\nOrder ID: "+result.orderId);
            }
            if(typeof clearCartDirectly==="function")clearCartDirectly();
          } catch(error) {
            console.error("Accessories payment v2 verification:",error);
            if(button) {
              button.disabled=true;
              button.textContent="Payment verification pending";
            }
            alert((error.message||"Payment verification is pending.")+
              "\nPlease do not pay again. Contact Diecast.scape with your payment ID.");
          } finally {
            if(button && button.textContent==="Payment verification pending") {
              busy=true;
            } else {
              resetButton(button);
            }
          }
        }
      });
      checkout.on("payment.failed",event=>{
        console.error("Razorpay payment failed:",event?.error?.code||"unknown");
        showToast("Payment was not completed. You can retry inside checkout, or close checkout to release the stock hold.");
        if(button)button.textContent="Payment checkout open";
      });
      checkout.open();
    } catch(error) {
      console.error("Accessories payment v2 checkout:",error);
      showToast(error.message||"Unable to start payment.");
      resetButton(button);
    }
  }
  document.addEventListener("DOMContentLoaded",()=>{
    document.getElementById("finalOnlinePayBtn")?.addEventListener("click",payAccessories);
  });
})();