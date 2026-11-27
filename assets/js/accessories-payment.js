(function () {
  let busy = false;
  let selectedCheckoutOption = "";

  function showPaymentResult(status,orderId){
    let modal=document.getElementById("accessoriesPaymentResultModal");
    if(!modal){
      const style=document.createElement("style");
      style.textContent=".accessories-result-modal[hidden]{display:none!important}.accessories-result-modal{position:fixed;inset:0;z-index:10050;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(7,16,31,.72);backdrop-filter:blur(5px)}.accessories-result-card{width:min(100%,390px);padding:27px 23px 22px;border-radius:20px;background:#fff;box-shadow:0 22px 70px rgba(0,0,0,.28);text-align:center}.accessories-result-brand{color:#13adbd;font-size:10px;font-weight:900;letter-spacing:1.6px}.accessories-result-card h2{margin:15px 0 8px;color:#102344;font-size:22px}.accessories-result-card p{color:#637184;font-size:13px;line-height:1.65}.accessories-result-order{margin:20px 0;padding:13px;border:1px solid #dcebef;border-radius:12px;background:#f5fafb}.accessories-result-order span,.accessories-result-order strong{display:block}.accessories-result-order span{color:#7c8998;font-size:9px;font-weight:800;letter-spacing:1.2px}.accessories-result-order strong{margin-top:5px;color:#102344;font-size:19px}.accessories-result-card button{width:100%;min-height:46px;border:0;border-radius:11px;background:#13adbd;color:#fff;font-weight:850}.accessories-result-view-order{display:flex;align-items:center;justify-content:center;width:100%;min-height:46px;margin:0 0 9px;border-radius:11px;background:#13adbd;color:#fff;text-decoration:none;font-size:14px;font-weight:850;box-sizing:border-box}.accessories-result-card button{background:#edf2f6;color:#263247}.accessories-result-modal.is-review .accessories-result-card h2{color:#9b6410}.accessories-result-modal.is-review .accessories-result-order{border-color:#f1dfbd;background:#fffaf0}";
      document.head.appendChild(style);
      modal=document.createElement("div");modal.id="accessoriesPaymentResultModal";modal.className="accessories-result-modal";
      modal.innerHTML='<div class="accessories-result-card" role="dialog" aria-modal="true" aria-labelledby="accessoriesPaymentResultTitle"><div class="accessories-result-brand">DIECAST.SCAPE · ORDER UPDATE</div><h2 id="accessoriesPaymentResultTitle"></h2><p id="accessoriesPaymentResultMessage"></p><div class="accessories-result-order"><span>ORDER ID</span><strong id="accessoriesPaymentResultOrderId"></strong></div><a class="accessories-result-view-order" href="/your-orders/">View Your Order</a><button type="button" id="accessoriesPaymentResultClose">Continue Shopping</button></div>';
      document.body.appendChild(modal);
      modal.addEventListener("click",event=>{if(event.target===modal||event.target.id==="accessoriesPaymentResultClose")modal.hidden=true;});
    }
    const review=status==="paid_stock_issue";
    const pending=status==="verification_pending";
    modal.classList.toggle("is-review",review||pending);
    modal.querySelector("#accessoriesPaymentResultTitle").textContent=pending?"Payment verification is taking longer":(review?"Payment Received — Order Under Review":"Payment Successful — Order Confirmed");
    modal.querySelector("#accessoriesPaymentResultMessage").textContent=pending
      ?"Your payment is safe with us. Verification may take longer. Stock availability may change while we complete the check. We will verify the payment and update your order here. Please do not pay again."
      :(review?"Your payment is safely recorded. We are reviewing stock availability and will contact you about the next step.":"Your Accessories order is confirmed. Thank you for shopping with Diecast.scape.");
    modal.querySelector("#accessoriesPaymentResultOrderId").textContent=orderId||"Verification in progress";
    modal.hidden=false;
  }
  function value(id) { return document.getElementById(id)?.value.trim() || ""; }

  function updateCheckoutOptionDetails() {
    const details=document.getElementById("checkoutOptionDetails");
    const continueButton=document.getElementById("checkoutContinueBtn");
    if(!details||!continueButton)return;

    document.querySelectorAll("[data-checkout-option]").forEach(card=>{
      const active=card.dataset.checkoutOption===selectedCheckoutOption;
      card.classList.toggle("is-selected",active);
      card.setAttribute("aria-pressed",String(active));
    });

    continueButton.disabled=!selectedCheckoutOption;
    const subtotal=typeof getCartProductTotal==="function"?getCartProductTotal():0;
    const shipping=typeof getShipping==="function"?getShipping(subtotal):0;
    const orderTotal=subtotal+shipping;
    const money=value=>"₹"+Number(value||0).toLocaleString("en-IN");

    if(selectedCheckoutOption==="COD") {
      const codTotal=orderTotal+20;
      details.innerHTML=`
        <div class="checkout-option-heading">Partial COD payment summary</div>
        <div class="cod-summary-row"><span>Product total</span><strong>${money(subtotal)}</strong></div>
        <div class="cod-summary-row"><span>Shipping</span><strong>${shipping===0?"FREE":money(shipping)}</strong></div>
        <div class="cod-summary-row"><span>COD charge</span><strong>₹20</strong></div>
        <div class="cod-summary-row cod-summary-total"><span>Total order value</span><strong>${money(codTotal)}</strong></div>
        <div class="cod-summary-row"><span>Pay now (advance)</span><strong>₹99</strong></div>
        <div class="cod-summary-row"><span>Pay at delivery</span><strong>${money(codTotal-99)}</strong></div>
        <p class="cod-summary-note">Pay ₹99 securely to confirm this COD order. The remaining amount is payable to the courier at delivery. COD is available on product totals of ₹399 or more.</p>
        <div class="cod-terms-note" role="note" aria-label="Cash on Delivery terms">
          <strong>Important – Cash on Delivery</strong>
          <ul>
            <li>The ₹99 advance payment is non-refundable if you refuse or do not accept the parcel at delivery.</li>
            <li>Order cancellation is allowed only before dispatch.</li>
            <li>Once the order has been dispatched, cancellation is not available.</li>
          </ul>
        </div>`;
    } else if(selectedCheckoutOption==="PREPAID") {
      details.innerHTML=`
        <div class="checkout-option-heading">Secure online payment</div>
        <div class="cod-summary-row"><span>Product total</span><strong>${money(subtotal)}</strong></div>
        <div class="cod-summary-row"><span>Shipping</span><strong>${shipping===0?"FREE":money(shipping)}</strong></div>
        <div class="cod-summary-row cod-summary-total"><span>Total amount to pay</span><strong>${money(orderTotal)}</strong></div>
        <p class="cod-summary-note">You will be redirected to Razorpay's secure payment checkout. Your payment is protected, and your order will be confirmed after successful payment verification.</p>`;
    } else if(selectedCheckoutOption==="WHATSAPP") {
      details.innerHTML=`
        <div class="checkout-option-heading">Place your order through WhatsApp</div>
        <div class="cod-summary-row"><span>Product total</span><strong>${money(subtotal)}</strong></div>
        <div class="cod-summary-row"><span>Shipping</span><strong>${shipping===0?"FREE":money(shipping)}</strong></div>
        <div class="cod-summary-row cod-summary-total"><span>Order total</span><strong>${money(orderTotal)}</strong></div>
        <p class="cod-summary-note">Tap Continue and you will be redirected to WhatsApp to place your order directly with Diecast.scape.</p>`;
    } else {
      details.innerHTML='<p class="checkout-option-placeholder">Choose one of the three options above to see your order details.</p>';
    }
  }
  function resetButton(button, originalText="Pay Now") {
    busy=false;
    if(button) { button.disabled=false; button.textContent=originalText; }
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
  const PENDING_ISSUE_KEY="diecastscape_pending_payment_issues";
  function readPendingIssues(){
    try{return JSON.parse(localStorage.getItem(PENDING_ISSUE_KEY)||"[]").filter(Boolean);}
    catch{return [];}
  }
  function savePendingIssueLocally(issue){
    try{
      const rows=readPendingIssues().filter(row=>row.paymentRecordId!==issue.paymentRecordId);
      rows.push(issue);
      localStorage.setItem(PENDING_ISSUE_KEY,JSON.stringify(rows.slice(-5)));
    }catch(error){console.warn("Could not save pending payment backup on this device:",error);}
  }
  async function submitPendingIssue(issue){
    const response=await fetch("/api/accessories/v2/report-pending-payment",{
      method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(issue)
    });
    const result=await response.json();
    if(!response.ok||!result.ok)throw new Error(result.error||"Pending payment report could not be saved.");
    const remaining=readPendingIssues().filter(row=>row.paymentRecordId!==issue.paymentRecordId);
    try{localStorage.setItem(PENDING_ISSUE_KEY,JSON.stringify(remaining));}catch{}
    return result;
  }
  async function retryPendingIssues(){
    for(const issue of readPendingIssues()){
      try{await submitPendingIssue(issue);}
      catch(error){console.warn("Pending payment report will retry later:",error);break;}
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
  async function payAccessories(paymentMode="PREPAID") {
    if(busy)return;
    const consent=document.getElementById("checkoutPolicyConsent");
    if(!consent?.checked){showToast("Please accept all three policies before continuing.");consent?.focus();return;}
    const productSubtotal=typeof getCartProductTotal==="function"?getCartProductTotal():0;
    if(paymentMode==="COD"&&productSubtotal<399){showToast("Cash on Delivery is available on product totals of ₹399 or more.");return;}
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
    const button=document.getElementById("checkoutContinueBtn");
    const originalButtonText=button?.textContent.trim()||"Continue";
    if(button){button.disabled=true;button.textContent="Preparing secure payment...";}
    try {
      const response=await fetch("/api/accessories/v2/create-order",{
        method:"POST",headers:{"content-type":"application/json"},
        body:JSON.stringify({items:products.map(item=>({id:String(item.id),qty:Number(item.qty)})),customer,paymentMode,policiesAccepted:true})
      });
      const order=await response.json();
      if(!response.ok)throw new Error(order.error||"Unable to prepare payment.");
      await loadCheckout();
      let paymentReturned=false;
      const checkout=new window.Razorpay({
        key:order.keyId,amount:order.amount,currency:order.currency,
        name:"Diecast.scape",description:paymentMode==="COD"?"Accessories COD advance payment":"Accessories order",
        order_id:order.orderId,prefill:{name:customer.name,contact:customer.phone},
        notes:{paymentRecordId:order.paymentRecordId,category:"accessories",paymentMode,paymentVersion:"2"},
        theme:{color:"#13adbd"},
        modal:{ondismiss:()=>{if(!paymentReturned)releaseReservation(order.paymentRecordId);resetButton(button,originalButtonText);}},
        handler:async function(paymentResponse) {
          paymentReturned=true;
          if(button)button.textContent="Verifying payment...";
          try {
            const verifyResponse=await fetch("/api/accessories/v2/verify-payment",{
              method:"POST",headers:{"content-type":"application/json"},
              body:JSON.stringify({...paymentResponse,paymentRecordId:order.paymentRecordId,customer})
            });
            const result=await verifyResponse.json();
            if(!verifyResponse.ok||!result.ok) {
              const detail=result.diagnosticDetail?"\nDetails: "+result.diagnosticDetail:"";
              throw new Error((result.error||"Payment verification is pending.")+detail+
                "\nPayment ID: "+paymentResponse.razorpay_payment_id);
            }
            if(result.orderId) {
              try {
                localStorage.setItem("diecastscape_completed_orders",JSON.stringify([result.orderId]));
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
            const pendingIssue={
              ...paymentResponse,paymentRecordId:order.paymentRecordId,customer,
              diagnosticStage:"client_verification",
              diagnosticDetail:String(error?.message||"Payment verification did not complete.").slice(0,500),
              reportedAt:new Date().toISOString()
            };
            savePendingIssueLocally(pendingIssue);
            try{await submitPendingIssue(pendingIssue);}
            catch(reportError){console.warn("Pending payment details saved on this browser; server report will retry:",reportError);}
            showPaymentResult("verification_pending","");
          } finally {
            if(button && button.textContent==="Payment verification pending") {
              busy=true;
            } else {
              resetButton(button,originalButtonText);
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
      resetButton(button,originalButtonText);
    }
  }
  document.addEventListener("DOMContentLoaded",()=>{
    document.querySelectorAll("[data-checkout-option]").forEach(card=>{
      card.addEventListener("click",()=>{
        selectedCheckoutOption=card.dataset.checkoutOption||"";
        updateCheckoutOptionDetails();
      });
    });
    document.getElementById("checkoutContinueBtn")?.addEventListener("click",()=>{
      if(!selectedCheckoutOption){showToast("Please choose a checkout option.");return;}
      const consent=document.getElementById("checkoutPolicyConsent");
      if(!consent?.checked){showToast("Please accept all three policies before continuing.");consent?.focus();return;}
      if(selectedCheckoutOption==="COD")payAccessories("COD");
      else if(selectedCheckoutOption==="PREPAID")payAccessories("PREPAID");
      else if(selectedCheckoutOption==="WHATSAPP") {
        if(typeof proceedOrderWhatsApp==="function")proceedOrderWhatsApp();
        else showToast("WhatsApp ordering is temporarily unavailable. Please try again.");
      }
    });
    updateCheckoutOptionDetails();
    retryPendingIssues();
  });
})();