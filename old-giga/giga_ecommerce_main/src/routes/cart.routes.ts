import { Router } from 'express';
import { getAllEndpointsHandler } from '../utils/endpointsUtil';

const router = Router();
const allEndpointsHandler = getAllEndpointsHandler(router);

router.get('/all-endpoints', allEndpointsHandler);







export default router;