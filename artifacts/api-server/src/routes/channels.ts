import { Router } from "express";
import {
  listChannels, getChannel, createChannel, updateChannel, deleteChannel,
  connectChannel, disconnectChannel, reconnectChannel, triggerSync,
  listChannelSources, createChannelSource, updateChannelSource, deleteChannelSource,
  recordAttribution, getAttributionEvents, getAttributionSummary, correctAttribution,
  listForms, createForm, updateForm, deleteForm,
  listLandingPages, createLandingPage, updateLandingPage, deleteLandingPage,
  startCsvImport, processCsvRows, listImports, reconcileImport,
  getChannelAnalytics, getChannelTypeDefinitions, seedDefaultChannels,
} from "../services/channel-manager";

const router = Router();

router.get("/types", (_req, res) => {
  res.json(getChannelTypeDefinitions());
});

router.get("/analytics", async (_req, res) => {
  try {
    const data = await getChannelAnalytics();
    res.json(data);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post("/seed", async (_req, res) => {
  try {
    await seedDefaultChannels();
    res.json({ ok: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.get("/", async (_req, res) => {
  try {
    const channels = await listChannels();
    res.json(channels);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.get("/:id", async (req, res) => {
  try {
    const ch = await getChannel(parseInt(req.params.id));
    if (!ch) return res.status(404).json({ error: "Not found" });
    res.json(ch);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post("/", async (req, res) => {
  try {
    const ch = await createChannel(req.body);
    res.status(201).json(ch);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.patch("/:id", async (req, res) => {
  try {
    const ch = await updateChannel(parseInt(req.params.id), req.body);
    res.json(ch);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.delete("/:id", async (req, res) => {
  try {
    await deleteChannel(parseInt(req.params.id));
    res.json({ ok: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post("/:id/connect", async (req, res) => {
  try {
    const { mode, config, credentials } = req.body;
    const ch = await connectChannel(parseInt(req.params.id), mode ?? "automatic", config, credentials);
    res.json(ch);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post("/:id/disconnect", async (req, res) => {
  try {
    const ch = await disconnectChannel(parseInt(req.params.id));
    res.json(ch);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post("/:id/reconnect", async (req, res) => {
  try {
    const ch = await reconnectChannel(parseInt(req.params.id));
    res.json(ch);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post("/:id/sync", async (req, res) => {
  try {
    const result = await triggerSync(parseInt(req.params.id));
    res.json(result);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.get("/:id/sources", async (req, res) => {
  try {
    const sources = await listChannelSources(parseInt(req.params.id));
    res.json(sources);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post("/:id/sources", async (req, res) => {
  try {
    const src = await createChannelSource({ ...req.body, channelId: parseInt(req.params.id) });
    res.status(201).json(src);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.patch("/sources/:sourceId", async (req, res) => {
  try {
    const src = await updateChannelSource(parseInt(req.params.sourceId), req.body);
    res.json(src);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.delete("/sources/:sourceId", async (req, res) => {
  try {
    await deleteChannelSource(parseInt(req.params.sourceId));
    res.json({ ok: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.get("/attribution/events", async (req, res) => {
  try {
    const events = await getAttributionEvents({
      leadId: req.query.leadId ? parseInt(req.query.leadId as string) : undefined,
      channelId: req.query.channelId ? parseInt(req.query.channelId as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
    });
    res.json(events);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.get("/attribution/summary", async (_req, res) => {
  try {
    const summary = await getAttributionSummary();
    res.json(summary);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post("/attribution/record", async (req, res) => {
  try {
    const evt = await recordAttribution(req.body);
    res.status(201).json(evt);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.patch("/attribution/:eventId", async (req, res) => {
  try {
    const evt = await correctAttribution(parseInt(req.params.eventId), req.body);
    res.json(evt);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.get("/forms/list", async (req, res) => {
  try {
    const forms = await listForms({
      channelId: req.query.channelId ? parseInt(req.query.channelId as string) : undefined,
    });
    res.json(forms);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post("/forms", async (req, res) => {
  try {
    const form = await createForm(req.body);
    res.status(201).json(form);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.patch("/forms/:id", async (req, res) => {
  try {
    const form = await updateForm(parseInt(req.params.id), req.body);
    res.json(form);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.delete("/forms/:id", async (req, res) => {
  try {
    await deleteForm(parseInt(req.params.id));
    res.json({ ok: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.get("/pages/list", async (req, res) => {
  try {
    const pages = await listLandingPages({
      channelId: req.query.channelId ? parseInt(req.query.channelId as string) : undefined,
    });
    res.json(pages);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post("/pages", async (req, res) => {
  try {
    const page = await createLandingPage(req.body);
    res.status(201).json(page);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.patch("/pages/:id", async (req, res) => {
  try {
    const page = await updateLandingPage(parseInt(req.params.id), req.body);
    res.json(page);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.delete("/pages/:id", async (req, res) => {
  try {
    await deleteLandingPage(parseInt(req.params.id));
    res.json({ ok: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.get("/imports/list", async (req, res) => {
  try {
    const imports = await listImports({
      channelId: req.query.channelId ? parseInt(req.query.channelId as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
    });
    res.json(imports);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post("/imports/start", async (req, res) => {
  try {
    const imp = await startCsvImport(req.body);
    res.status(201).json(imp);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post("/imports/:id/process", async (req, res) => {
  try {
    const { rows, fieldMapping, entityType } = req.body;
    const result = await processCsvRows(parseInt(req.params.id), rows, fieldMapping, entityType);
    res.json(result);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post("/imports/:id/reconcile", async (req, res) => {
  try {
    const result = await reconcileImport(parseInt(req.params.id), req.body.notes ?? "");
    res.json(result);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;
