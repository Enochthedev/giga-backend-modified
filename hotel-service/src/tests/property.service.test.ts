import { PropertyService } from '../services/property.service';
import { cleanDatabase, mockUser, mockPropertyData } from './setup';
import { NotFoundError } from '../utils/errors';

describe('PropertyService', () => {
    let propertyService: PropertyService;

    beforeAll(() => {
        propertyService = new PropertyService();
    });

    beforeEach(async () => {
        await cleanDatabase();
    });

    describe('createProperty', () => {
        it('should create a property successfully', async () => {
            const property = await propertyService.createProperty(mockUser.id, mockPropertyData);

            expect(property).toBeDefined();
            expect(property.id).toBeDefined();
            expect(property.name).toBe(mockPropertyData.name);
            expect(property.propertyType).toBe(mockPropertyData.propertyType);
            expect(property.city).toBe(mockPropertyData.city);
            expect(property.country).toBe(mockPropertyData.country);
            expect(property.status).toBe('draft');
            expect(property.rating).toBe(0);
            expect(property.reviewCount).toBe(0);
        });

        it('should create property owner if not exists', async () => {
            const property = await propertyService.createProperty(mockUser.id, mockPropertyData);
            expect(property.ownerId).toBeDefined();
        });
    });

    describe('getPropertyById', () => {
        it('should retrieve a property by ID', async () => {
            const createdProperty = await propertyService.createProperty(mockUser.id, mockPropertyData);
            const retrievedProperty = await propertyService.getPropertyById(createdProperty.id);

            expect(retrievedProperty).toBeDefined();
            expect(retrievedProperty.id).toBe(createdProperty.id);
            expect(retrievedProperty.name).toBe(mockPropertyData.name);
        });

        it('should throw NotFoundError for non-existent property', async () => {
            const nonExistentId = '123e4567-e89b-12d3-a456-426614174000';

            await expect(propertyService.getPropertyById(nonExistentId))
                .rejects.toThrow(NotFoundError);
        });
    });

    describe('updateProperty', () => {
        it('should update property successfully', async () => {
            const createdProperty = await propertyService.createProperty(mockUser.id, mockPropertyData);

            const updateData = {
                name: 'Updated Hotel Name',
                description: 'Updated description'
            };

            const updatedProperty = await propertyService.updateProperty(
                createdProperty.id,
                mockUser.id,
                updateData
            );

            expect(updatedProperty.name).toBe(updateData.name);
            expect(updatedProperty.description).toBe(updateData.description);
            expect(updatedProperty.city).toBe(mockPropertyData.city); // Unchanged
        });

        it('should throw NotFoundError for unauthorized update', async () => {
            const createdProperty = await propertyService.createProperty(mockUser.id, mockPropertyData);

            const updateData = { name: 'Unauthorized Update' };
            const unauthorizedUserId = 'unauthorized-user-id';

            await expect(propertyService.updateProperty(
                createdProperty.id,
                unauthorizedUserId,
                updateData
            )).rejects.toThrow(NotFoundError);
        });
    });

    describe('deleteProperty', () => {
        it('should delete property successfully', async () => {
            const createdProperty = await propertyService.createProperty(mockUser.id, mockPropertyData);

            await expect(propertyService.deleteProperty(createdProperty.id, mockUser.id))
                .resolves.not.toThrow();

            // Verify property is deleted
            await expect(propertyService.getPropertyById(createdProperty.id))
                .rejects.toThrow(NotFoundError);
        });

        it('should throw NotFoundError for unauthorized deletion', async () => {
            const createdProperty = await propertyService.createProperty(mockUser.id, mockPropertyData);
            const unauthorizedUserId = 'unauthorized-user-id';

            await expect(propertyService.deleteProperty(createdProperty.id, unauthorizedUserId))
                .rejects.toThrow(NotFoundError);
        });
    });

    describe('searchProperties', () => {
        beforeEach(async () => {
            // Create test properties
            await propertyService.createProperty(mockUser.id, {
                ...mockPropertyData,
                name: 'Hotel A',
                city: 'New York',
                country: 'USA',
                propertyType: 'hotel'
            });

            await propertyService.createProperty(mockUser.id, {
                ...mockPropertyData,
                name: 'Apartment B',
                city: 'Los Angeles',
                country: 'USA',
                propertyType: 'apartment'
            });
        });

        it('should search properties by city', async () => {
            const result = await propertyService.searchProperties({ city: 'New York' });

            expect(result.properties).toHaveLength(1);
            expect(result.properties[0].name).toBe('Hotel A');
            expect(result.total).toBe(1);
        });

        it('should search properties by property type', async () => {
            const result = await propertyService.searchProperties({ propertyType: 'apartment' });

            expect(result.properties).toHaveLength(1);
            expect(result.properties[0].name).toBe('Apartment B');
        });

        it('should return paginated results', async () => {
            const result = await propertyService.searchProperties({
                country: 'USA',
                page: 1,
                limit: 1
            });

            expect(result.properties).toHaveLength(1);
            expect(result.total).toBe(2);
            expect(result.page).toBe(1);
            expect(result.limit).toBe(1);
        });
    });

    describe('getPropertiesByOwner', () => {
        it('should return properties owned by user', async () => {
            await propertyService.createProperty(mockUser.id, {
                ...mockPropertyData,
                name: 'Owner Property 1'
            });

            await propertyService.createProperty(mockUser.id, {
                ...mockPropertyData,
                name: 'Owner Property 2'
            });

            const properties = await propertyService.getPropertiesByOwner(mockUser.id);

            expect(properties).toHaveLength(2);
            expect(properties.map(p => p.name)).toContain('Owner Property 1');
            expect(properties.map(p => p.name)).toContain('Owner Property 2');
        });

        it('should return empty array for user with no properties', async () => {
            const properties = await propertyService.getPropertiesByOwner('no-properties-user');
            expect(properties).toHaveLength(0);
        });
    });
});