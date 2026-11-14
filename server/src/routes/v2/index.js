// API v2 root router, mounted at /api/v2 in app.js.
// v2 is where all new and reworked endpoints go. v1 endpoints that have a v2
// successor live in routes/v1-deprecated/ and send a Deprecation header; they
// are kept, never deleted, until every client has moved.
import { Router } from "express";
import catalogV2Router from "./catalog.route.js";
import { v2ErrorHandler } from "../../utils/apiV2.js";

const v2Router = Router();
v2Router.use(catalogV2Router);
v2Router.use(v2ErrorHandler);
export default v2Router;
