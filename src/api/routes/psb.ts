import { Router } from "express";
import { psbGetController } from "../controllers/psb";
import { cityPayQueryValidator } from "../middleware/cityPayQueryValidator";
import { operatorSelect } from "../middleware/operatorSelect";

const psbRouter = Router();
psbRouter.get('/:prefix(psb|post|abonotdel)', operatorSelect, cityPayQueryValidator, psbGetController);

export default psbRouter;
