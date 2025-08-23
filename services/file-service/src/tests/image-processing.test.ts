import { ImageProcessingService } from '../services/image-processing-service';

describe('ImageProcessingService', () => {
    let imageProcessingService: ImageProcessingService;

    beforeEach(() => {
        imageProcessingService = new ImageProcessingService();
    });

    describe('getImageMetadata', () => {
        it('should extract image metadata', async () => {
            const mockBuffer = Buffer.from('test image data');

            const metadata = await imageProcessingService.getImageMetadata(mockBuffer);

            expect(metadata).toMatchObject({
                width: 800,
                height: 600,
                format: 'jpeg',
                channels: 3,
                hasAlpha: false
            });
        });
    });

    describe('resizeImage', () => {
        it('should resize image with specified dimensions', async () => {
            const mockBuffer = Buffer.from('test image data');

            const result = await imageProcessingService.resizeImage(mockBuffer, 400, 300);

            expect(result).toBeInstanceOf(Buffer);
            expect(result.toString()).toBe('processed image');
        });
    });

    describe('createThumbnail', () => {
        it('should create a thumbnail', async () => {
            const mockBuffer = Buffer.from('test image data');

            const result = await imageProcessingService.createThumbnail(mockBuffer, 150);

            expect(result).toBeInstanceOf(Buffer);
            expect(result.toString()).toBe('processed image');
        });
    });

    describe('optimizeImage', () => {
        it('should optimize image', async () => {
            const mockBuffer = Buffer.from('test image data');

            const result = await imageProcessingService.optimizeImage(mockBuffer, 80);

            expect(result).toBeInstanceOf(Buffer);
        });
    });

    describe('convertFormat', () => {
        it('should convert image to JPEG format', async () => {
            const mockBuffer = Buffer.from('test image data');

            const result = await imageProcessingService.convertFormat(mockBuffer, 'jpeg', 80);

            expect(result).toBeInstanceOf(Buffer);
            expect(result.toString()).toBe('processed image');
        });

        it('should convert image to PNG format', async () => {
            const mockBuffer = Buffer.from('test image data');

            const result = await imageProcessingService.convertFormat(mockBuffer, 'png', 80);

            expect(result).toBeInstanceOf(Buffer);
        });

        it('should convert image to WebP format', async () => {
            const mockBuffer = Buffer.from('test image data');

            const result = await imageProcessingService.convertFormat(mockBuffer, 'webp', 80);

            expect(result).toBeInstanceOf(Buffer);
        });

        it('should throw error for unsupported format', async () => {
            const mockBuffer = Buffer.from('test image data');

            await expect(imageProcessingService.convertFormat(mockBuffer, 'gif' as any, 80))
                .rejects.toThrow('Unsupported format: gif');
        });
    });

    describe('generateResponsiveImages', () => {
        it('should generate multiple image sizes', async () => {
            const mockBuffer = Buffer.from('test image data');

            const result = await imageProcessingService.generateResponsiveImages(mockBuffer);

            expect(result).toHaveProperty('thumbnail');
            expect(result).toHaveProperty('small');
            expect(result).toHaveProperty('medium');
            expect(result).toHaveProperty('large');

            Object.values(result).forEach(buffer => {
                expect(buffer).toBeInstanceOf(Buffer);
            });
        });
    });
});