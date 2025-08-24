import { Router } from 'express';
import ridesApi from './ride.route';

const router = Router();
router.get('/health', (_, res) => res.status(200).send('ok'));
router.use('/api/v1', ridesApi);

export default router;
