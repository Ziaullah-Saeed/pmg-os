import { Router, type IRouter } from "express";
import healthRouter from "./health";
import companiesRouter from "./companies";
import contactsRouter from "./contacts";
import leadsRouter from "./leads";
import opportunitiesRouter from "./opportunities";
import activitiesRouter from "./activities";
import campaignsRouter from "./campaigns";
import tasksRouter from "./tasks";
import documentsRouter from "./documents";
import communicationsRouter from "./communications";
import dashboardRouter from "./dashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(dashboardRouter);
router.use(companiesRouter);
router.use(contactsRouter);
router.use(leadsRouter);
router.use(opportunitiesRouter);
router.use(activitiesRouter);
router.use(campaignsRouter);
router.use(tasksRouter);
router.use(documentsRouter);
router.use(communicationsRouter);

export default router;
