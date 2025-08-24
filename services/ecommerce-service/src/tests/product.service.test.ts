import { ProductService } from '../services/product.service';
import { CreateProductRequest } from '../types';

describe('ProductService', () => {
    const mockVendorId = '123e4567-e89b-12d3-a456-426614174000';

    const mockProductData: CreateProductRequest = {
        name: 'Test Product',
        description: 'A test product description',
        sku: 'TEST-001',
        price: 29.99,
        comparePrice: 39.99,
        brand: 'Test Brand',
        tags: ['test', 'product'],
        isActive: true,
        isFeatured: false,
        trackInventory: true,
        initialInventory: 100
    };

    describe('createProduct', () => {
        it('should create a product successfully', async () => {
            const product = await ProductService.createProduct(mockProductData, mockVendorId);

            expect(product).toBeDefined();
            expect(product.name).toBe(mockProductData.name);
            expect(product.sku).toBe(mockProductData.sku);
            expect(product.price).toBe(mockProductData.price);
            expect(product.vendorId).toBe(mockVendorId);
            expect(product.isActive).toBe(true);
        });

        it('should throw error for duplicate SKU', async () => {
            // Create first product
            await ProductService.createProduct(mockProductData, mockVendorId);

            // Try to create another product with same SKU
            await expect(
                ProductService.createProduct(mockProductData, mockVendorId)
            ).rejects.toThrow('Product with this SKU already exists');
        });

        it('should validate price constraints', async () => {
            const invalidProductData = {
                ...mockProductData,
                price: -10
            };

            // This should be caught by validation middleware in real app
            // Here we test the service layer assumption that data is valid
            await expect(
                ProductService.createProduct(invalidProductData, mockVendorId)
            ).rejects.toThrow();
        });
    });

    describe('getProductById', () => {
        it('should return product with details', async () => {
            const createdProduct = await ProductService.createProduct(mockProductData, mockVendorId);
            const product = await ProductService.getProductById(createdProduct.id);

            expect(product).toBeDefined();
            expect(product.id).toBe(createdProduct.id);
            expect(product.name).toBe(mockProductData.name);
            expect(product.variants).toBeDefined();
            expect(Array.isArray(product.variants)).toBe(true);
        });

        it('should throw error for non-existent product', async () => {
            const nonExistentId = '123e4567-e89b-12d3-a456-426614174999';

            await expect(
                ProductService.getProductById(nonExistentId)
            ).rejects.toThrow('Product not found');
        });
    });

    describe('updateProduct', () => {
        it('should update product successfully', async () => {
            const createdProduct = await ProductService.createProduct(mockProductData, mockVendorId);

            const updateData = {
                name: 'Updated Product Name',
                price: 35.99
            };

            const updatedProduct = await ProductService.updateProduct(
                createdProduct.id,
                updateData,
                mockVendorId
            );

            expect(updatedProduct.name).toBe(updateData.name);
            expect(updatedProduct.price).toBe(updateData.price);
            expect(updatedProduct.sku).toBe(mockProductData.sku); // Should remain unchanged
        });

        it('should throw error when vendor tries to update another vendor\'s product', async () => {
            const createdProduct = await ProductService.createProduct(mockProductData, mockVendorId);
            const otherVendorId = '123e4567-e89b-12d3-a456-426614174001';

            await expect(
                ProductService.updateProduct(
                    createdProduct.id,
                    { name: 'Hacked Name' },
                    otherVendorId
                )
            ).rejects.toThrow('Not authorized to update this product');
        });
    });

    describe('searchProducts', () => {
        beforeEach(async () => {
            // Create test products
            await ProductService.createProduct({
                ...mockProductData,
                name: 'iPhone 14',
                sku: 'IPHONE-14',
                brand: 'Apple',
                tags: ['phone', 'electronics']
            }, mockVendorId);

            await ProductService.createProduct({
                ...mockProductData,
                name: 'Samsung Galaxy',
                sku: 'GALAXY-S23',
                brand: 'Samsung',
                tags: ['phone', 'android']
            }, mockVendorId);
        });

        it('should search products by name', async () => {
            const result = await ProductService.searchProducts({ q: 'iPhone' });

            expect(result.products).toBeDefined();
            expect(result.products.length).toBeGreaterThan(0);
            expect(result.products[0].name).toContain('iPhone');
            expect(result.pagination).toBeDefined();
        });

        it('should filter products by brand', async () => {
            const result = await ProductService.searchProducts({ brand: 'Apple' });

            expect(result.products).toBeDefined();
            expect(result.products.length).toBeGreaterThan(0);
            expect(result.products[0].brand).toBe('Apple');
        });

        it('should return pagination info', async () => {
            const result = await ProductService.searchProducts({ limit: 1 });

            expect(result.pagination).toBeDefined();
            expect(result.pagination.page).toBe(1);
            expect(result.pagination.limit).toBe(1);
            expect(result.pagination.total).toBeGreaterThan(0);
        });
    });

    describe('deleteProduct', () => {
        it('should delete product successfully', async () => {
            const createdProduct = await ProductService.createProduct(mockProductData, mockVendorId);

            await ProductService.deleteProduct(createdProduct.id, mockVendorId);

            await expect(
                ProductService.getProductById(createdProduct.id)
            ).rejects.toThrow('Product not found');
        });

        it('should throw error when vendor tries to delete another vendor\'s product', async () => {
            const createdProduct = await ProductService.createProduct(mockProductData, mockVendorId);
            const otherVendorId = '123e4567-e89b-12d3-a456-426614174001';

            await expect(
                ProductService.deleteProduct(createdProduct.id, otherVendorId)
            ).rejects.toThrow('Not authorized to delete this product');
        });
    });
});