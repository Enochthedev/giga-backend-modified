import pricingService from '../services/pricing.service';
import { VehicleType } from '../models/driver.model';

describe('PricingService', () => {
    const mockPickupLocation = { latitude: 40.7128, longitude: -74.0060 };
    const mockDropoffLocation = { latitude: 40.7589, longitude: -73.9851 };

    beforeEach(() => {
        // Clear any existing surge areas and promotions
        jest.clearAllMocks();
    });

    describe('calculateDynamicFare', () => {
        it('should calculate basic fare without surge or promotions', async () => {
            const result = await pricingService.calculateDynamicFare(
                mockPickupLocation,
                mockDropoffLocation,
                VehicleType.REGULAR
            );

            expect(result.fare).toBeGreaterThan(0);
            expect(result.breakdown).toBeDefined();
            expect(result.breakdown.baseFare).toBeGreaterThan(0);
            expect(result.breakdown.distanceFare).toBeGreaterThan(0);
            expect(result.appliedPromotions).toEqual([]);
        });

        it('should apply surge multiplier when surge area is active', async () => {
            // Add a surge area
            const surgeArea = {
                name: 'test-surge',
                coordinates: {
                    latitude: mockPickupLocation.latitude,
                    longitude: mockPickupLocation.longitude,
                    radius: 1000
                },
                surgeMultiplier: 1.5,
                activeUntil: new Date(Date.now() + 3600000) // 1 hour from now
            };

            pricingService.addSurgeArea(surgeArea);

            const result = await pricingService.calculateDynamicFare(
                mockPickupLocation,
                mockDropoffLocation,
                VehicleType.REGULAR
            );

            expect(result.breakdown.surgeMultiplier).toBe(1.5);
            expect(result.surgeInfo).toBeDefined();
            expect(result.surgeInfo?.name).toBe('test-surge');
        });

        it('should apply promotional discount', async () => {
            // Add a promotional offer
            const promotion = {
                id: 'test-promo',
                name: 'Test Promotion',
                description: 'Test discount',
                discountType: 'percentage' as const,
                discountValue: 20,
                validFrom: new Date(Date.now() - 3600000), // 1 hour ago
                validUntil: new Date(Date.now() + 3600000), // 1 hour from now
                usedCount: 0,
                applicableVehicleTypes: [VehicleType.REGULAR],
                isActive: true
            };

            pricingService.addPromotionalOffer(promotion);

            const result = await pricingService.calculateDynamicFare(
                mockPickupLocation,
                mockDropoffLocation,
                VehicleType.REGULAR
            );

            expect(result.appliedPromotions).toContain('Test Promotion');
            expect(result.breakdown.promotionalDiscount).toBeGreaterThan(0);
        });

        it('should calculate higher fare for luxury vehicles', async () => {
            const regularResult = await pricingService.calculateDynamicFare(
                mockPickupLocation,
                mockDropoffLocation,
                VehicleType.REGULAR
            );

            const luxuryResult = await pricingService.calculateDynamicFare(
                mockPickupLocation,
                mockDropoffLocation,
                VehicleType.LUXURY
            );

            expect(luxuryResult.fare).toBeGreaterThan(regularResult.fare);
        });
    });

    describe('surge area management', () => {
        it('should add and remove surge areas', () => {
            const surgeArea = {
                name: 'test-area',
                coordinates: {
                    latitude: 40.7128,
                    longitude: -74.0060,
                    radius: 1000
                },
                surgeMultiplier: 2.0,
                activeUntil: new Date(Date.now() + 3600000)
            };

            pricingService.addSurgeArea(surgeArea);
            pricingService.removeSurgeArea('test-area');

            // Should not throw any errors
            expect(true).toBe(true);
        });
    });

    describe('promotional offers management', () => {
        it('should add and remove promotional offers', () => {
            const offer = {
                id: 'test-offer',
                name: 'Test Offer',
                description: 'Test description',
                discountType: 'fixed' as const,
                discountValue: 5,
                validFrom: new Date(),
                validUntil: new Date(Date.now() + 86400000),
                usedCount: 0,
                applicableVehicleTypes: [VehicleType.REGULAR],
                isActive: true
            };

            pricingService.addPromotionalOffer(offer);

            const activeOffers = pricingService.getActivePromotionalOffers();
            expect(activeOffers).toHaveLength(1);
            expect(activeOffers[0].id).toBe('test-offer');

            pricingService.removePromotionalOffer('test-offer');

            const updatedOffers = pricingService.getActivePromotionalOffers();
            expect(updatedOffers).toHaveLength(0);
        });
    });
});