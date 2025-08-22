import { Router } from "express";
import appsApi from "./user.routes";
import adminApi from "./admin.routes";
import oauthApi from "./oauth.routes";

const router = Router();
router.get('/health', (_, res) => res.status(200).send('ok'));
router.use('/api/v1', appsApi);
router.use('/api/v1/auth', oauthApi);
router.use('/admin', adminApi);
export default router;

