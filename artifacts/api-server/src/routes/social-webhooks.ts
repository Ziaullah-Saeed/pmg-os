import { Router, type IRouter, type Request } from "express";
import {
  resolveWebhookChallenge,
  verifyMetaSignature,
  getMetaConfig,
  getWhatsAppConfig,
  getWebsiteFormSecret,
  handleMetaWebhook,
  handleWhatsAppInbound,
  handleWebsiteFormSubmission,
} from "../services/social-providers-service";

// ---------------------------------------------------------------------------
// Social Command — PUBLIC inbound webhook receivers (Phase 1 + WhatsApp).
//
// These are mounted BEFORE requireAuth in routes/index.ts — Meta and website
// forms POST unauthenticated. Security is per-source:
//   • Meta / WhatsApp — GET subscription handshake (hub.verify_token) + POST
//     HMAC signature (X-Hub-Signature-256) over the raw body.
//   • Website form     — optional shared secret (?secret=) matching WEBSITE_FORM_SECRET.
//
// Everything is inert until the matching env vars are set (see CLAUDE.md §5 /
// .env). Until then the handshake returns 403 and there is nothing to receive.
// ---------------------------------------------------------------------------

const router: IRouter = Router();

function rawBodyOf(req: Request): Buffer | undefined {
  return (req as unknown as { rawBody?: Buffer }).rawBody;
}

// --- Meta (Facebook Page / Lead Ads; Messenger + IG later) -----------------

router.get("/webhooks/meta", (req, res): void => {
  const result = resolveWebhookChallenge(req.query as Record<string, unknown>);
  if ("challenge" in result) { res.status(200).send(result.challenge); return; }
  res.status(403).json({ error: result.error });
});

router.post("/webhooks/meta", async (req, res): Promise<void> => {
  const sig = verifyMetaSignature(rawBodyOf(req), req.header("x-hub-signature-256"), getMetaConfig().appSecret);
  if (!sig.ok) { res.status(401).json({ error: "Invalid webhook signature", reason: sig.reason }); return; }
  try {
    const result = await handleMetaWebhook(req.body);
    // Always 200 so Meta doesn't retry-storm; report outcome in the body.
    res.status(200).json({ ok: true, ...result, verified: sig.verified });
  } catch (err: any) {
    res.status(200).json({ ok: false, error: err?.message ?? "meta webhook error" });
  }
});

// --- WhatsApp Cloud API ----------------------------------------------------

router.get("/webhooks/whatsapp", (req, res): void => {
  const result = resolveWebhookChallenge(req.query as Record<string, unknown>);
  if ("challenge" in result) { res.status(200).send(result.challenge); return; }
  res.status(403).json({ error: result.error });
});

router.post("/webhooks/whatsapp", async (req, res): Promise<void> => {
  const sig = verifyMetaSignature(rawBodyOf(req), req.header("x-hub-signature-256"), getWhatsAppConfig().appSecret);
  if (!sig.ok) { res.status(401).json({ error: "Invalid webhook signature", reason: sig.reason }); return; }
  try {
    const result = await handleWhatsAppInbound(req.body);
    res.status(200).json({ ok: true, ...result, verified: sig.verified });
  } catch (err: any) {
    res.status(200).json({ ok: false, error: err?.message ?? "whatsapp webhook error" });
  }
});

// --- First-party website form ----------------------------------------------

router.post("/webhooks/website-form", async (req, res): Promise<void> => {
  const secret = getWebsiteFormSecret();
  if (secret && req.query.secret !== secret) { res.status(401).json({ error: "Invalid form secret" }); return; }
  try {
    const result = await handleWebsiteFormSubmission(req.body ?? {});
    if (!result.processed) { res.status(422).json(result); return; }
    res.status(200).json({ ok: true, ...result });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err?.message ?? "form handler error" });
  }
});

export default router;
