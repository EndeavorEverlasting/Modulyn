import { Router, type IRouter } from "express";
import healthRouter from "./health";
import designsRouter from "./designs";

const router: IRouter = Router();

router.use(healthRouter);
router.use(designsRouter);

export default router;
