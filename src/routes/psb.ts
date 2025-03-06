import { Router } from "express";
import { psbGetController } from "../controllers/psb";

const psbRouter = Router();
psbRouter.get('/:prefix(psb|post|abonotdel)', psbGetController);

export default psbRouter;
