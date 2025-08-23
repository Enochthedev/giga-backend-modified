/**
 * Dashboard routes
 */

import { Router } from 'express';
import { DashboardController } from '../controllers/dashboard.controller';
import { validateRequest } from '../middleware/validation.middleware';
import {
    createDashboardSchema,
    updateDashboardSchema,
    executeWidgetQuerySchema,
    conversionFunnelSchema
} from '../validation/dashboard.validation';

const router = Router();
const dashboardController = new DashboardController();

// Real-time dashboard routes
router.get('/realtime', dashboardController.getRealTimeDashboard);
router.get('/metrics', dashboardController.getDashboardMetrics);

// Custom dashboard routes
router.post('/', validateRequest(createDashboardSchema), dashboardController.createDashboard);
router.get('/:dashboardId', dashboardController.getDashboard);
router.put('/:dashboardId', validateRequest(updateDashboardSchema), dashboardController.updateDashboard);

// Widget execution
router.post('/widgets/execute', validateRequest(executeWidgetQuerySchema), dashboardController.executeWidgetQuery);

// Business intelligence routes
router.get('/bi/revenue', dashboardController.getRevenueMetrics);
router.get('/bi/performance', dashboardController.getPerformanceMetrics);
router.post('/bi/funnel', validateRequest(conversionFunnelSchema), dashboardController.getConversionFunnel);
router.get('/bi/kpis', dashboardController.getKPIs);

export default router;