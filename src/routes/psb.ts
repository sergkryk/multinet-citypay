import { Router } from "express";
import { psbGetController } from "../controllers/psb/psb";

const psbRouter = Router();
psbRouter.get("/", psbGetController);

export default psbRouter;
