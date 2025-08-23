import { Router } from 'express';
import driverController from '../controllers/driver.controller';

const router = Router();

// Public routes
router.post('/register', driverController.registerDriver);

// Driver profile routes
router.get('/profile/:driverId', driverController.getDriverProfile);
router.put('/profile/:driverId', driverController.updateDriverProfile);

// Driver status and location routes
router.put('/:driverId/status', driverController.updateDriverStatus);
router.put('/:driverId/location', driverController.updateDriverLocation);

// Vehicle management routes
router.put('/:driverId/vehicle', driverController.updateVehicle);

// Driver statistics
router.get('/:driverId/stats', driverController.getDriverStats);

// Search routes
router.get('/available', driverController.findAvailableDrivers);

// Admin routes
router.put('/:driverId/verify', driverController.verifyDriver);
router.put('/:driverId/deactivate', driverController.deactivateDriver);

export default router;