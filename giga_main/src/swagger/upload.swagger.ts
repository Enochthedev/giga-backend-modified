/**
 * @swagger
 * components:
 *   schemas:
 *     FileUploadRequest:
 *       type: object
 *       required:
 *         - file
 *       properties:
 *         file:
 *           type: string
 *           format: binary
 *           description: File to upload (JPG, PNG, GIF, WebP)
 *         folder:
 *           type: string
 *           description: Cloudinary folder to store the file
 *           example: "user-profiles"
 *         stripMetadata:
 *           type: boolean
 *           description: Whether to strip all metadata from the file
 *           example: true
 *         stripExif:
 *           type: boolean
 *           description: Whether to strip EXIF data from the file
 *           example: false
 *         stripGps:
 *           type: boolean
 *           description: Whether to strip GPS coordinates from the file
 *           example: false
 *         transformation:
 *           type: object
 *           description: Custom Cloudinary transformations to apply
 *           example:
 *             width: 800
 *             height: 600
 *             crop: "fill"
 *             quality: "auto"
 *     
 *     FileUploadResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: "File uploaded successfully"
 *         data:
 *           type: object
 *           properties:
 *             url:
 *               type: string
 *               format: uri
 *               description: Public URL of the uploaded file
 *               example: "https://res.cloudinary.com/cloud-name/image/upload/v1234567890/folder/file.jpg"
 *             publicId:
 *               type: string
 *               description: Cloudinary public ID of the file
 *               example: "folder/file"
 *             format:
 *               type: string
 *               description: File format
 *               example: "jpg"
 *             bytes:
 *               type: number
 *               description: File size in bytes
 *               example: 1024000
 *             width:
 *               type: number
 *               description: Image width in pixels
 *               example: 1920
 *             height:
 *               type: number
 *               description: Image height in pixels
 *               example: 1080
 *             metadataStripped:
 *               type: boolean
 *               description: Whether metadata was stripped from the file
 *               example: true
 *             secureUrl:
 *               type: string
 *               format: uri
 *               description: Secure HTTPS URL of the file
 *               example: "https://res.cloudinary.com/cloud-name/image/upload/v1234567890/folder/file.jpg"
 *     
 *     MultipleFileUploadRequest:
 *       type: object
 *       required:
 *         - files
 *       properties:
 *         files:
 *           type: array
 *           items:
 *             type: string
 *             format: binary
 *           description: Array of files to upload
 *         folder:
 *           type: string
 *           description: Cloudinary folder to store the files
 *           example: "user-profiles"
 *         stripMetadata:
 *           type: boolean
 *           description: Whether to strip all metadata from all files
 *           example: true
 *         stripExif:
 *           type: boolean
 *           description: Whether to strip EXIF data from all files
 *           example: false
 *         stripGps:
 *           type: boolean
 *           description: Whether to strip GPS coordinates from all files
 *           example: false
 *         transformation:
 *           type: object
 *           description: Custom Cloudinary transformations to apply to all files
 *     
 *     MultipleFileUploadResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: "Files uploaded successfully"
 *         data:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/FileUploadResponse'
 *         summary:
 *           type: object
 *           properties:
 *             total:
 *               type: number
 *               description: Total number of files processed
 *               example: 5
 *             successful:
 *               type: number
 *               description: Number of files uploaded successfully
 *               example: 4
 *             failed:
 *               type: number
 *               description: Number of files that failed to upload
 *               example: 1
 *             metadataStripped:
 *               type: number
 *               description: Number of files with metadata stripped
 *               example: 4
 *     
 *     FileMetadataResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         data:
 *           type: object
 *           properties:
 *             exif:
 *               type: object
 *               description: EXIF metadata from the file
 *               properties:
 *                 gps:
 *                   type: object
 *                   description: GPS coordinates (if present)
 *                   properties:
 *                     latitude:
 *                       type: number
 *                       example: 40.7128
 *                     longitude:
 *                       type: number
 *                       example: -74.0060
 *                 camera:
 *                   type: string
 *                   description: Camera model used
 *                   example: "iPhone 12"
 *                 dateTime:
 *                   type: string
 *                   format: date-time
 *                   description: Date and time when photo was taken
 *                   example: "2024-01-15T10:30:00Z"
 *             imageMetadata:
 *               type: object
 *               description: Basic image metadata
 *               properties:
 *                 format:
 *                   type: string
 *                   example: "JPEG"
 *                 colorspace:
 *                   type: string
 *                   example: "sRGB"
 *                 channels:
 *                   type: number
 *                   example: 3
 *             faces:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   confidence:
 *                     type: number
 *                     example: 0.95
 *                   boundingBox:
 *                     type: object
 *                     properties:
 *                       x:
 *                         type: number
 *                         example: 100
 *                       y:
 *                         type: number
 *                         example: 150
 *                       width:
 *                         type: number
 *                         example: 200
 *                       height:
 *                         type: number
 *                         example: 200
 *             colors:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   red:
 *                     type: number
 *                     example: 255
 *                   green:
 *                     type: number
 *                     example: 0
 *                   blue:
 *                     type: number
 *                     example: 0
 *                   percentage:
 *                     type: number
 *                     example: 25.5
 *             perceptualHash:
 *               type: string
 *               description: Perceptual hash for image similarity detection
 *               example: "a1b2c3d4e5f6"
 *             accessibility:
 *               type: object
 *               description: Accessibility analysis results
 *               properties:
 *                 colorblindAccessibilityScore:
 *                   type: number
 *                   minimum: 0
 *                   maximum: 1
 *                   example: 0.8
 *                 contrastScore:
 *                   type: number
 *                   minimum: 0
 *                   maximum: 1
 *                   example: 0.9
 *             qualityAnalysis:
 *               type: object
 *               description: Image quality analysis
 *               properties:
 *                 qualityScore:
 *                   type: number
 *                   minimum: 0
 *                   maximum: 1
 *                   example: 0.85
 *                 sharpness:
 *                   type: number
 *                   minimum: 0
 *                   maximum: 1
 *                   example: 0.9
 *                 noise:
 *                   type: number
 *                   minimum: 0
 *                   maximum: 1
 *                   example: 0.1
 *     
 *     FileUpdateRequest:
 *       type: object
 *       required:
 *         - publicId
 *       properties:
 *         publicId:
 *           type: string
 *           description: Cloudinary public ID of the file to update
 *           example: "user-profiles/profile-123"
 *         transformation:
 *           type: object
 *           description: Cloudinary transformations to apply
 *           example:
 *             width: 800
 *             height: 600
 *             crop: "fill"
 *             quality: "auto"
 *     
 *     FileDeleteResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: "File deleted successfully"
 *         data:
 *           type: object
 *           properties:
 *             publicId:
 *               type: string
 *               description: Public ID of the deleted file
 *               example: "user-profiles/profile-123"
 *             result:
 *               type: string
 *               example: "ok"
 *     
 *     MetadataStrippingRequest:
 *       type: object
 *       required:
 *         - publicId
 *       properties:
 *         publicId:
 *           type: string
 *           description: Cloudinary public ID of the file
 *           example: "user-profiles/profile-123"
 *         stripExif:
 *           type: boolean
 *           description: Whether to strip EXIF data
 *           example: true
 *         stripGps:
 *           type: boolean
 *           description: Whether to strip GPS coordinates
 *           example: false
 *     
 *     UploadWidgetConfig:
 *       type: object
 *       properties:
 *         cloudName:
 *           type: string
 *           description: Cloudinary cloud name
 *           example: "my-cloud"
 *         folder:
 *           type: string
 *           description: Default folder for uploads
 *           example: "user-profiles"
 *         transformation:
 *           type: object
 *           description: Default transformations to apply
 *           properties:
 *             strip:
 *               type: string
 *               description: Metadata stripping setting
 *               example: "all"
 *         maxFileSize:
 *           type: number
 *           description: Maximum file size in bytes
 *           example: 10485760
 *         allowedFormats:
 *           type: array
 *           items:
 *             type: string
 *           description: Allowed file formats
 *           example: ["jpg", "jpeg", "png", "gif", "webp"]
 *     
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: false
 *         message:
 *           type: string
 *           example: "Upload failed"
 *         error:
 *           type: string
 *           example: "UPLOAD_ERROR"
 *         details:
 *           type: object
 *           description: Additional error information
 *     
 *   securitySchemes:
 *     BearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *       description: JWT token for authentication
 */

/**
 * @swagger
 * tags:
 *   - name: File Upload
 *     description: File upload and management endpoints with metadata stripping
 */

/**
 * @swagger
 * /api/v1/upload:
 *   post:
 *     summary: Upload a single file
 *     description: Uploads a file to Cloudinary with optional metadata stripping and transformations
 *     tags: [File Upload]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             $ref: '#/components/schemas/FileUploadRequest'
 *           example:
 *             file: "(binary)"
 *             folder: "user-profiles"
 *             stripMetadata: true
 *             transformation:
 *               width: 800
 *               height: 600
 *               crop: "fill"
 *     responses:
 *       200:
 *         description: File uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/FileUploadResponse'
 *       400:
 *         description: Bad request - validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized - invalid or missing token
 *       413:
 *         description: File too large - exceeds maximum size limit
 *       415:
 *         description: Unsupported file type
 *       500:
 *         description: Internal server error - upload failed
 * 
 * /api/v1/upload/batch:
 *   post:
 *     summary: Upload multiple files
 *     description: Uploads multiple files to Cloudinary with batch processing and metadata stripping
 *     tags: [File Upload]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             $ref: '#/components/schemas/MultipleFileUploadRequest'
 *           example:
 *             files: ["(binary)", "(binary)", "(binary)"]
 *             folder: "user-profiles"
 *             stripMetadata: true
 *             transformation:
 *               width: 800
 *               height: 600
 *               crop: "fill"
 *     responses:
 *       200:
 *         description: Files uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MultipleFileUploadResponse'
 *       400:
 *         description: Bad request - validation error
 *       401:
 *         description: Unauthorized - invalid or missing token
 *       413:
 *         description: Files too large or too many files
 *       415:
 *         description: Unsupported file types
 *       500:
 *         description: Internal server error - upload failed
 * 
 * /api/v1/upload/url:
 *   post:
 *     summary: Upload file from URL
 *     description: Uploads a file to Cloudinary from a public URL with metadata stripping
 *     tags: [File Upload]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - url
 *             properties:
 *               url:
 *                 type: string
 *                 format: uri
 *                 description: Public URL of the file to upload
 *                 example: "https://example.com/image.jpg"
 *               folder:
 *                 type: string
 *                 description: Cloudinary folder to store the file
 *                 example: "user-profiles"
 *               stripMetadata:
 *                 type: boolean
 *                 description: Whether to strip all metadata
 *                 example: true
 *               stripExif:
 *                 type: boolean
 *                 description: Whether to strip EXIF data
 *                 example: false
 *               stripGps:
 *                 type: boolean
 *                 description: Whether to strip GPS coordinates
 *                 example: false
 *               transformation:
 *                 type: object
 *                 description: Custom transformations to apply
 *     responses:
 *       200:
 *         description: File uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/FileUploadResponse'
 *       400:
 *         description: Bad request - invalid URL or parameters
 *       401:
 *         description: Unauthorized - invalid or missing token
 *       422:
 *         description: Unprocessable entity - URL not accessible or invalid file
 *       500:
 *         description: Internal server error - upload failed
 * 
 * /api/v1/upload/metadata/{publicId}:
 *   get:
 *     summary: Get file metadata
 *     description: Retrieves detailed metadata information for a file including EXIF, GPS, faces, colors, and quality analysis
 *     tags: [File Upload]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: publicId
 *         required: true
 *         schema:
 *           type: string
 *         description: Cloudinary public ID of the file
 *         example: "user-profiles/profile-123"
 *     responses:
 *       200:
 *         description: File metadata retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/FileMetadataResponse'
 *       400:
 *         description: Bad request - invalid public ID
 *       401:
 *         description: Unauthorized - invalid or missing token
 *       404:
 *         description: File not found
 *       500:
 *         description: Internal server error
 * 
 * /api/v1/upload/strip-metadata:
 *   post:
 *     summary: Strip metadata from existing file
 *     description: Applies metadata stripping to an already uploaded file without re-uploading
 *     tags: [File Upload]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MetadataStrippingRequest'
 *           example:
 *             publicId: "user-profiles/profile-123"
 *             stripExif: true
 *             stripGps: false
 *     responses:
 *       200:
 *         description: Metadata stripped successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/FileUploadResponse'
 *       400:
 *         description: Bad request - invalid parameters
 *       401:
 *         description: Unauthorized - invalid or missing token
 *       404:
 *         description: File not found
 *       500:
 *         description: Internal server error
 * 
 * /api/v1/upload/{publicId}:
 *   put:
 *     summary: Update file with transformations
 *     description: Applies new transformations to an existing file without re-uploading
 *     tags: [File Upload]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: publicId
 *         required: true
 *         schema:
 *           type: string
 *         description: Cloudinary public ID of the file
 *         example: "user-profiles/profile-123"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/FileUpdateRequest'
 *           example:
 *             publicId: "user-profiles/profile-123"
 *             transformation:
 *               width: 800
 *               height: 600
 *               crop: "fill"
 *               quality: "auto"
 *     responses:
 *       200:
 *         description: File updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/FileUploadResponse'
 *       400:
 *         description: Bad request - invalid parameters
 *       401:
 *         description: Unauthorized - invalid or missing token
 *       404:
 *         description: File not found
 *       500:
 *         description: Internal server error
 * 
 *   delete:
 *     summary: Delete file
 *     description: Permanently deletes a file from Cloudinary
 *     tags: [File Upload]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: publicId
 *         required: true
 *         schema:
 *           type: string
 *         description: Cloudinary public ID of the file
 *         example: "user-profiles/profile-123"
 *     responses:
 *       200:
 *         description: File deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/FileDeleteResponse'
 *       400:
 *         description: Bad request - invalid public ID
 *       401:
 *         description: Unauthorized - invalid or missing token
 *       404:
 *         description: File not found
 *       500:
 *         description: Internal server error
 * 
 * /api/v1/upload/batch/delete:
 *   post:
 *     summary: Delete multiple files
 *     description: Permanently deletes multiple files from Cloudinary
 *     tags: [File Upload]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - publicIds
 *             properties:
 *               publicIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of Cloudinary public IDs to delete
 *                 example: ["user-profiles/profile-1", "user-profiles/profile-2"]
 *     responses:
 *       200:
 *         description: Files deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Files deleted successfully"
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/FileDeleteResponse'
 *                 summary:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: number
 *                       example: 5
 *                     successful:
 *                       type: number
 *                       example: 4
 *                     failed:
 *                       type: number
 *                       example: 1
 *       400:
 *         description: Bad request - invalid public IDs
 *       401:
 *         description: Unauthorized - invalid or missing token
 *       500:
 *         description: Internal server error
 * 
 * /api/v1/upload/widget-config:
 *   get:
 *     summary: Get upload widget configuration
 *     description: Returns configuration for the Cloudinary upload widget including metadata stripping defaults
 *     tags: [File Upload]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: folder
 *         schema:
 *           type: string
 *         description: Default folder for uploads
 *         example: "user-profiles"
 *     responses:
 *       200:
 *         description: Upload widget configuration retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UploadWidgetConfig'
 *       401:
 *         description: Unauthorized - invalid or missing token
 *       500:
 *         description: Internal server error
 */
