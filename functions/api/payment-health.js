export async function onRequestGet({ env }) {
  const checks = {
    razorpayKeyIdPresent: Boolean(env.RAZORPAY_KEY_ID),
    razorpayKeySecretPresent: Boolean(env.RAZORPAY_KEY_SECRET),
    firebaseServiceAccountPresent: Boolean(env.FIREBASE_SERVICE_ACCOUNT_JSON),
    firebaseServiceAccountValid: false,
    firebaseProjectMatches: false
  };

  if (checks.firebaseServiceAccountPresent) {
    try {
      const account = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT_JSON);
      checks.firebaseServiceAccountValid =
        account?.type === "service_account" &&
        typeof account?.client_email === "string" &&
        typeof account?.private_key === "string" &&
        account.private_key.includes("BEGIN PRIVATE KEY") &&
        typeof account?.project_id === "string";

      checks.firebaseProjectMatches =
        account?.project_id === "diecastscape";
    } catch {
      checks.firebaseServiceAccountValid = false;
    }
  }

  const ok =
    checks.razorpayKeyIdPresent &&
    checks.razorpayKeySecretPresent &&
    checks.firebaseServiceAccountPresent &&
    checks.firebaseServiceAccountValid &&
    checks.firebaseProjectMatches;

  return new Response(JSON.stringify({
    ok,
    environment: "preview-config-check",
    checks
  }), {
    status: ok ? 200 : 503,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}
