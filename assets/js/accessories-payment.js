(function () {
  let busy = false;

  function showPaymentResult(status,orderId){
    let modal=document.getElementById("accessoriesPaymentResultModal");
    if(!modal){
      const style=document.createElement("style");
      style.textContent=".accessories-result-modal[hidden]{display:none!important}.accessories-result-modal{position:fixed;inset:0;z-index:10050;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(7,16,31,.72);backdrop-filter:blur(5px)}.accessories-result-card{width:min(100%,390px);padding:27px 23px 22px;border-radius:20px;background:#fff;box-shadow:0 22px 70px rgba(0,0,0,.28);text-align:center}.accessories-result-brand{color:#13adbd;font-size:10px;font-weight:900;letter-spacing:1.6px}.accessories-result-card h2{margin:15px 0 8px;color:#102344;font-size:22px}.accessories-result-card p{color:#637184;font-size:13px;line-height:1.65}.accessories-result-order{margin:20px 0;padding:13px;border:1px solid #dcebef;border-radius:12px;background:#f5fafb}.accessories-result-order span,.accessories-result-order strong{display:block}.accessories-result-order span{color:#7c8998;font-size:9px;font-weight:800;letter-spacing:1.2px}.accessories-result-order strong{margin-top:5px;color:#102344;font-size:19px}.accessories-result-card button{width:100%;min-height:46px;border:0;border-radius:11px;background:#13adbd;color:#fff;font-weight:850}.accessories-result-modal.is-review .accessories-result-card h2{color:#9b6410}.accessories-result-modal.is-review .accessories-result-order{border-color:#f1dfbd;background:#fffaf0}";
      document.head.appendChild(style);
      modal=document.createElement("div");modal.id="accessoriesPaymentResultModal";modal.className="accessories-result-modal";
      modal.innerHTML='<div class="accessories-result-card" role="dialog" aria-modal="true" aria-labelledby="accessoriesPaymentResultTitle"><div class="accessories-result-brand">DIECAST.SCAPE · ORDER UPDATE</div><h2 id="accessoriesPaymentResultTitle"></h2><p id="accessoriesPaymentResultMessage"></p><div class="accessories-result-order"><span>ORDER ID</span><strong id="accessoriesPaymentResultOrderId"></strong></div><button type="button" id="accessoriesPaymentResultClose">Continue</button></div>';
      document.body.appendChild(modal);
      modal.addEventListener("click",event=>{if(event.target===modal||event.target.id==="accessoriesPaymentResultClose")modal.hidden=true;});
    }
    const review=status==="paid_stock_issue";
    modal.classList.toggle("is-review",review);
    modal.querySelector("#accessoriesPaymentResultTitle").textContent=review?"Payment Received — Order Under Review":"Payment Successful — Order Confirmed";
    modal.querySelector("#accessoriesPaymentResultMessage").textContent=review?"Your payment is safely recorded. We are reviewing stock availability and will contact you about the next step.":"Your Accessories order is confirmed. Thank you for shopping with Diecast.scape.";
    modal.querySelector("#accessoriesPaymentResultOrderId").textContent=orderId||"—";
    modal.hidden=false;
  }
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
            showPaymentResult(result.status,result.orderId);
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