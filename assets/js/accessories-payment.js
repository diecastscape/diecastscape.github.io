(function () {
  let busy = false;

  function value(id) {
    return document.getElementById(id)?.value.trim() || "";
  }

  function loadCheckout() {
    if (window.Razorpay) return Promise.resolve();
    return new Promise((resolve,reject) => {
      const script=document.createElement("script");
      script.src="https://checkout.razorpay.com/v1/checkout.js";
      script.onload=resolve;
      script.onerror=()=>reject(new Error("Unable to load secure payment checkout."));
      document.head.appendChild(script);
    });
  }

  async function payAccessories() {
    if(busy) return;
    const products=typeof getCartProducts==="function"?getCartProducts():[];
    if(!products.length) { showToast("Your cart is empty."); return; }
    const total=products.reduce((sum,item)=>sum+(Number(item.price)||0)*(Number(item.qty)||0),0);
    if(total<199) { showToast("Minimum order value is ₹199."); return; }
    if(document.getElementById("checkoutWithoutDetails")?.checked) {
      showToast("Online payment requires delivery details. Use WhatsApp for stock checks without details."); return;
    }
    const customer={
      name:value("checkoutName"),address:value("checkoutAddress"),
      postOffice:value("checkoutPostOffice"),pincode:value("checkoutPincode"),phone:value("checkoutPhone")
    };
    if(customer.name.length<2) { showToast("Please enter your name."); document.getElementById("checkoutName")?.focus(); return; }
    if(customer.address.length<5) { showToast("Please enter your complete address."); document.getElementById("checkoutAddress")?.focus(); return; }
    if(!/^\d{6}$/.test(customer.pincode)) { showToast("Please enter a valid 6-digit pincode."); document.getElementById("checkoutPincode")?.focus(); return; }
    if(!/^\d{10}$/.test(customer.phone)) { showToast("Please enter a valid 10-digit phone number."); document.getElementById("checkoutPhone")?.focus(); return; }

    busy=true;
    const button=document.getElementById("finalOnlinePayBtn");
    if(button) { button.disabled=true; button.textContent="Preparing payment..."; }

    try {
      const response=await fetch("/api/accessories/create-order",{
        method:"POST",headers:{"content-type":"application/json"},
        body:JSON.stringify({items:products.map(item=>({id:String(item.id),qty:Number(item.qty)})),customer})
      });
      const order=await response.json();
      if(!response.ok) throw new Error(order.error||"Unable to prepare payment.");
      await loadCheckout();

      const razorpay=new window.Razorpay({
        key:order.keyId,amount:order.amount,currency:order.currency,
        name:"Diecast.scape",description:"Accessories order",order_id:order.orderId,
        prefill:{name:customer.name,contact:customer.phone},
        notes:{paymentRecordId:order.paymentRecordId,category:"accessories"},
        theme:{color:"#13adbd"},
        modal:{ondismiss:()=>{
          busy=false;
          if(button) { button.disabled=false; button.textContent="Pay Online"; }
        }},
        handler:async function(paymentResponse) {
          if(button) button.textContent="Verifying payment...";
          try {
            const verified=await fetch("/api/accessories/verify-payment",{
              method:"POST",headers:{"content-type":"application/json"},
              body:JSON.stringify({...paymentResponse,paymentRecordId:order.paymentRecordId})
            });
            const result=await verified.json();
            if(result.status==="paid_stock_issue"&&result.orderId) {
              alert("Payment received. Your order needs a stock review, and Diecast.scape will contact you.\\nOrder ID: "+result.orderId);
              if(typeof clearCartDirectly==="function") clearCartDirectly();
              return;
            }
            if(!verified.ok||!result.ok) throw new Error(result.message||result.error||"Payment verification is pending.");
            alert("Payment successful! Your accessories order is confirmed.\\nOrder ID: "+(result.orderId||"Please contact us if you need the order ID."));
            if(typeof clearCartDirectly==="function") clearCartDirectly();
          } catch(error) {
            console.error("Payment verification error:",error);
            alert((error.message||"Payment verification is pending.")+"\\nPlease do not pay again. Contact Diecast.scape and share this payment ID: "+paymentResponse.razorpay_payment_id);
          } finally {
            busy=false;
            if(button) { button.disabled=false; button.textContent="Pay Online"; }
          }
        }
      });
      razorpay.on("payment.failed",event=>{
        console.error("Razorpay payment failed:",event?.error?.code);
        showToast("Payment was not completed. You can try again.");
      });
      razorpay.open();
    } catch(error) {
      console.error("Accessories online payment error:",error);
      showToast(error.message||"Unable to start payment.");
      busy=false;
      if(button) { button.disabled=false; button.textContent="Pay Online"; }
    }
  }

  document.addEventListener("DOMContentLoaded",()=>{
    document.getElementById("finalOnlinePayBtn")?.addEventListener("click",payAccessories);
  });
})();
