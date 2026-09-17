import express from "express";

const router = express.Router();

/* ===============================================================
   GUPSHUP INBOUND WEBHOOK
   ---------------------------------------------------------------
   Gupshup ko callback URL save karne ke liye ek live 200 chahiye.
   Ye abhi sirf acknowledge karta hai — OTP/session validation ka
   full logic (Redis/DB) baad me isi handler me aayega.

   GET  -> browser/Gupshup ka reachability check
   POST -> actual inbound message + delivery event callbacks
================================================================ */

router.get("/webhooks/gupshup-inbound", (_req, res) => {
  return res.status(200).send("OK");
});

router.post("/webhooks/gupshup-inbound", (req, res) => {
  // Payload shape capture karne ke liye — logic add hone tak rakhein
  console.log(
    "[GUPSHUP INBOUND]",
    JSON.stringify({ body: req.body, query: req.query }),
  );

  // Gupshup 200 ke alawa kuch bhi mile to retry/disable kar deta hai,
  // isliye processing se pehle hi acknowledge kar rahe hain.
  return res.status(200).send("OK");
});

export default router;
