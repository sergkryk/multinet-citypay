import { Router } from "express";
import { psbGetController } from "../controllers/psb";

const psbRouter = Router();
psbRouter.get('/:prefix(psb|post|abonotdel|pay)', psbGetController);

export default psbRouter;
