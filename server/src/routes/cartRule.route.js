import { Router } from "express";
import { evaluateCartRulesController } from "../controller/cartRule.controller.js";

const cartRuleRouter = Router();
cartRuleRouter.post("/cart-rules/evaluate", evaluateCartRulesController);

export default cartRuleRouter;
