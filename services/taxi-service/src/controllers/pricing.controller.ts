import { Request, Response } from 'express';
import pricingService from '../services/pricing.service';
import { VehicleType } from '../models/driver.model';
import catchAsync from '../utils/catch-async';
import httpStatus from 'http-status';

class PricingController {
    /**
     * Calculate dynamic fare estimate
     */
    calculateFare = catchAsync(async (req: Request, res: Response): Promise<void> => {
        const {
            pickupLatitude,
            pickupLongitude,
            dropoffLatitude,
            dropoffLongitude,
            vehicleType = VehicleType.REGULAR,
            customerId
        } = req.body;

        if (!pickupLatitude || !pickupLongitude || !dropoffLatitude || !dropoffLongitude) {
            res.status(httpStatus.BAD_REQUEST).json({
                success: false,
                message: 'Pickup and dropoff coordinates are required'
            });
            return;
        }

        const result = await pricingService.calculateDynamicFare(
            { latitude: parseFloat(pickupLatitude), longitude: parseFloat(pickupLongitude) },
            { latitude: parseFloat(dropoffLatitude), longitude: parseFloat(dropoffLongitude) },
            vehicleType,
            new Date(),
            customerId
        );

        res.json({
            success: true,
            data: {
                estimatedFare: result.fare,
                breakdown: result.breakdown,
                appliedPromotions: result.appliedPromotions,
                surgeInfo: result.surgeInfo
            }
        });
    });

    /**
     * Add surge area (admin only)
     */
    addSurgeArea = catchAsync(async (req: Request, res: Response): Promise<void> => {
        const { name, latitude, longitude, radius, surgeMultiplier, activeUntil } = req.body;

        if (!name || !latitude || !longitude || !radius || !surgeMultiplier || !activeUntil) {
            res.status(httpStatus.BAD_REQUEST).json({
                success: false,
                message: 'All surge area parameters are required'
            });
            return;
        }

        const surgeArea = {
            name,
            coordinates: {
                latitude: parseFloat(latitude),
                longitude: parseFloat(longitude),
                radius: parseInt(radius)
            },
            surgeMultiplier: parseFloat(surgeMultiplier),
            activeUntil: new Date(activeUntil)
        };

        pricingService.addSurgeArea(surgeArea);

        res.status(httpStatus.CREATED).json({
            success: true,
            message: 'Surge area added successfully',
            data: surgeArea
        });
    });

    /**
     * Remove surge area (admin only)
     */
    removeSurgeArea = catchAsync(async (req: Request, res: Response): Promise<void> => {
        const { areaName } = req.params;

        pricingService.removeSurgeArea(areaName);

        res.json({
            success: true,
            message: 'Surge area removed successfully'
        });
    });

    /**
     * Add promotional offer (admin only)
     */
    addPromotionalOffer = catchAsync(async (req: Request, res: Response): Promise<void> => {
        const {
            id,
            name,
            description,
            discountType,
            discountValue,
            minRideDistance,
            maxDiscount,
            validFrom,
            validUntil,
            usageLimit,
            applicableVehicleTypes
        } = req.body;

        if (!id || !name || !discountType || !discountValue || !validFrom || !validUntil) {
            res.status(httpStatus.BAD_REQUEST).json({
                success: false,
                message: 'Required promotional offer parameters are missing'
            });
            return;
        }

        const offer = {
            id,
            name,
            description,
            discountType,
            discountValue: parseFloat(discountValue),
            minRideDistance: minRideDistance ? parseFloat(minRideDistance) : undefined,
            maxDiscount: maxDiscount ? parseFloat(maxDiscount) : undefined,
            validFrom: new Date(validFrom),
            validUntil: new Date(validUntil),
            usageLimit: usageLimit ? parseInt(usageLimit) : undefined,
            usedCount: 0,
            applicableVehicleTypes: applicableVehicleTypes || Object.values(VehicleType),
            isActive: true
        };

        pricingService.addPromotionalOffer(offer);

        res.status(httpStatus.CREATED).json({
            success: true,
            message: 'Promotional offer added successfully',
            data: offer
        });
    });

    /**
     * Remove promotional offer (admin only)
     */
    removePromotionalOffer = catchAsync(async (req: Request, res: Response): Promise<void> => {
        const { offerId } = req.params;

        pricingService.removePromotionalOffer(offerId);

        res.json({
            success: true,
            message: 'Promotional offer removed successfully'
        });
    });

    /**
     * Get active promotional offers
     */
    getActivePromotions = catchAsync(async (req: Request, res: Response): Promise<void> => {
        const offers = pricingService.getActivePromotionalOffers();

        res.json({
            success: true,
            data: offers.map(offer => ({
                id: offer.id,
                name: offer.name,
                description: offer.description,
                discountType: offer.discountType,
                discountValue: offer.discountValue,
                maxDiscount: offer.maxDiscount,
                validUntil: offer.validUntil,
                applicableVehicleTypes: offer.applicableVehicleTypes
            }))
        });
    });
}

export default new PricingController();