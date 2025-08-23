// Mock sharp import for development - replace with actual sharp in production
let sharp: any;
try {
    sharp = require('sharp');
} catch (error) {
    // Mock sharp for testing/development
    sharp = () => ({
        resize: () => ({
            jpeg: () => ({
                toBuffer: () => Promise.resolve(Buffer.from('processed image'))
            }),
            png: () => ({
                toBuffer: () => Promise.resolve(Buffer.from('processed image'))
            }),
            webp: () => ({
                toBuffer: () => Promise.resolve(Buffer.from('processed image'))
            })
        }),
        jpeg: () => ({
            toBuffer: () => Promise.resolve(Buffer.from('processed image'))
        }),
        png: () => ({
            toBuffer: () => Promise.resolve(Buffer.from('processed image'))
        }),
        webp: () => ({
            toBuffer: () => Promise.resolve(Buffer.from('processed image'))
        }),
        composite: () => ({
            toBuffer: () => Promise.resolve(Buffer.from('processed image'))
        }),
        metadata: () => Promise.resolve({
            width: 800,
            height: 600,
            format: 'jpeg',
            channels: 3,
            hasAlpha: false
        })
    });
}

import { FileProcessingOptions } from '../types/file-types';
import { uploadConfig } from '../config/upload-config';

export class ImageProcessingService {
    async processImage(imageBuffer: Buffer, options: FileProcessingOptions): Promise<Buffer> {
        try {
            let sharpInstance = sharp(imageBuffer);

            // Apply resize if specified
            if (options.resize) {
                const { width, height, fit = 'cover' } = options.resize;
                sharpInstance = sharpInstance.resize(width, height, { fit });
            }

            // Apply quality settings
            const quality = options.quality || uploadConfig.defaultImageQuality;
            const format = options.format || 'jpeg';

            switch (format) {
                case 'jpeg':
                    sharpInstance = sharpInstance.jpeg({ quality });
                    break;
                case 'png':
                    sharpInstance = sharpInstance.png({ quality });
                    break;
                case 'webp':
                    sharpInstance = sharpInstance.webp({ quality });
                    break;
                default:
                    sharpInstance = sharpInstance.jpeg({ quality });
            }

            // Apply watermark if specified
            if (options.watermark) {
                sharpInstance = await this.applyWatermark(sharpInstance, options.watermark);
            }

            return sharpInstance.toBuffer();
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            throw new Error(`Failed to process image: ${errorMessage}`);
        }
    }

    async getImageMetadata(imageBuffer: Buffer): Promise<any> {
        try {
            const metadata = await sharp(imageBuffer).metadata();
            return {
                width: metadata.width,
                height: metadata.height,
                format: metadata.format,
                channels: metadata.channels,
                density: metadata.density,
                hasAlpha: metadata.hasAlpha,
                orientation: metadata.orientation
            };
        } catch (error) {
            console.error('Error getting image metadata:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            throw new Error(`Failed to extract image metadata: ${errorMessage}`);
        }
    }

    async resizeImage(
        imageBuffer: Buffer,
        width?: number,
        height?: number,
        fit: 'cover' | 'contain' | 'fill' | 'inside' | 'outside' = 'cover'
    ): Promise<Buffer> {
        try {
            // Apply max dimensions if not specified
            const maxWidth = width || uploadConfig.maxImageWidth;
            const maxHeight = height || uploadConfig.maxImageHeight;

            return sharp(imageBuffer)
                .resize(maxWidth, maxHeight, { fit })
                .jpeg({ quality: uploadConfig.defaultImageQuality })
                .toBuffer();
        } catch (error) {
            console.error('Error resizing image:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            throw new Error(`Failed to resize image: ${errorMessage}`);
        }
    }

    async createThumbnail(imageBuffer: Buffer, size: number = 150): Promise<Buffer> {
        try {
            return sharp(imageBuffer)
                .resize(size, size, { fit: 'cover' })
                .jpeg({ quality: 80 })
                .toBuffer();
        } catch (error) {
            console.error('Error creating thumbnail:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            throw new Error(`Failed to create thumbnail: ${errorMessage}`);
        }
    }

    async optimizeImage(imageBuffer: Buffer, quality: number = 80): Promise<Buffer> {
        try {
            const metadata = await sharp(imageBuffer).metadata();

            // Choose optimal format based on image characteristics
            if (metadata.hasAlpha) {
                return sharp(imageBuffer)
                    .png({ quality })
                    .toBuffer();
            } else {
                return sharp(imageBuffer)
                    .jpeg({ quality, progressive: true })
                    .toBuffer();
            }
        } catch (error) {
            console.error('Error optimizing image:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            throw new Error(`Failed to optimize image: ${errorMessage}`);
        }
    }

    async convertFormat(
        imageBuffer: Buffer,
        format: 'jpeg' | 'png' | 'webp',
        quality: number = 80
    ): Promise<Buffer> {
        try {
            let sharpInstance = sharp(imageBuffer);

            switch (format) {
                case 'jpeg':
                    return sharpInstance.jpeg({ quality }).toBuffer();
                case 'png':
                    return sharpInstance.png({ quality }).toBuffer();
                case 'webp':
                    return sharpInstance.webp({ quality }).toBuffer();
                default:
                    throw new Error(`Unsupported format: ${format}`);
            }
        } catch (error) {
            console.error('Error converting image format:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            throw new Error(`Failed to convert image format: ${errorMessage}`);
        }
    }

    async generateResponsiveImages(imageBuffer: Buffer): Promise<{ [key: string]: Buffer }> {
        try {
            const sizes = [
                { name: 'thumbnail', width: 150, height: 150 },
                { name: 'small', width: 400, height: 300 },
                { name: 'medium', width: 800, height: 600 },
                { name: 'large', width: 1200, height: 900 }
            ];

            const responsiveImages: { [key: string]: Buffer } = {};

            for (const size of sizes) {
                responsiveImages[size.name] = await sharp(imageBuffer)
                    .resize(size.width, size.height, { fit: 'cover' })
                    .jpeg({ quality: uploadConfig.defaultImageQuality })
                    .toBuffer();
            }

            return responsiveImages;
        } catch (error) {
            console.error('Error generating responsive images:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            throw new Error(`Failed to generate responsive images: ${errorMessage}`);
        }
    }

    private async applyWatermark(
        sharpInstance: any,
        watermark: { text?: string; image?: string; position?: string }
    ): Promise<any> {
        try {
            if (watermark.text) {
                // Text watermark implementation would require additional setup
                // For now, we'll skip text watermarks as they require complex SVG generation
                console.warn('Text watermarks not implemented yet');
                return sharpInstance;
            }

            if (watermark.image) {
                // Image watermark
                const watermarkBuffer = Buffer.from(watermark.image, 'base64');
                const position = this.getWatermarkGravity(watermark.position);

                return sharpInstance.composite([{
                    input: watermarkBuffer,
                    gravity: position,
                    blend: 'over'
                }]);
            }

            return sharpInstance;
        } catch (error) {
            console.error('Error applying watermark:', error);
            return sharpInstance; // Return original if watermark fails
        }
    }

    private getWatermarkGravity(position?: string): string {
        switch (position) {
            case 'top-left':
                return 'northwest';
            case 'top-right':
                return 'northeast';
            case 'bottom-left':
                return 'southwest';
            case 'bottom-right':
                return 'southeast';
            case 'center':
                return 'center';
            default:
                return 'southeast'; // Default to bottom-right
        }
    }
}