import { getFirebaseContext } from "../../../functions/_lib/firebase-rest.js";
import { releaseExpiredAccessoryReservations } from "../../../functions/_lib/accessory-reservations.js";

async function cleanExpiredReservations(env) {
  const firebase = await getFirebaseContext(env);
  const released = await releaseExpiredAccessoryReservations(firebase);
  console.log(JSON.stringify({
    task: "accessories-reservation-cleanup",
    completedAt: new Date().toISOString(),
    releasedReservations: released
  }));
  return released;
}

export default {
  async scheduled(controller, env, ctx) {
    ctx.waitUntil(
      cleanExpiredReservations(env).catch(error => {
        console.error("Accessories reservation cleanup failed:", error?.message || error);
        throw error;
      })
    );
  },

  async fetch() {
    return new Response("Not Found", { status: 404 });
  }
};
