# 📸 Metadata Stripping Guide - File Upload Service

## 🔒 **Security & Privacy Features**

The enhanced file upload service now includes comprehensive metadata stripping capabilities to protect user privacy and enhance security.

## ✨ **What Metadata Can Be Stripped**

### **EXIF Data (Exchangeable Image File Format)**
- **Camera Information**: Make, model, lens, aperture, shutter speed
- **Date & Time**: When the photo was taken
- **Location Data**: GPS coordinates, altitude
- **Technical Details**: ISO, focal length, flash settings
- **Software**: What software was used to edit the image

### **GPS Coordinates**
- **Latitude & Longitude**: Exact location where photo was taken
- **Altitude**: Height above sea level
- **Timestamp**: When the location was recorded

### **Other Metadata**
- **Color Profiles**: ICC color profiles
- **Face Recognition Data**: AI-generated face detection data
- **Perceptual Hashes**: Digital fingerprints of images
- **Quality Analysis**: Cloudinary's image quality metrics

## 🚀 **How to Use Metadata Stripping**

### **1. Basic Upload with Metadata Stripping**

```typescript
import { upload } from 'common';

// Strip ALL metadata (recommended for security)
const result = await upload.uploadFile(fileBuffer, {
  folder: 'user-profiles',
  stripMetadata: true, // This strips everything
});

// Strip only GPS coordinates (preserve other metadata)
const result = await upload.uploadFile(fileBuffer, {
  folder: 'user-profiles',
  stripGps: true, // This strips only GPS data
});

// Strip EXIF data specifically
const result = await upload.uploadFile(fileBuffer, {
  folder: 'user-profiles',
  stripExif: true, // This strips EXIF data
});
```

### **2. Upload Multiple Files with Metadata Stripping**

```typescript
const files = [file1, file2, file3];

const results = await upload.uploadMultipleFiles(files, {
  folder: 'user-gallery',
  stripMetadata: true, // Strip all metadata from all files
  maxFileSize: 5 * 1024 * 1024, // 5MB limit
});
```

### **3. Upload with Progress and Metadata Stripping**

```typescript
const result = await upload.uploadWithProgress(
  fileBuffer,
  {
    folder: 'user-uploads',
    stripMetadata: true,
  },
  (progress) => {
    console.log(`Upload progress: ${progress.progress}%`);
    if (progress.status === 'completed') {
      console.log('File uploaded successfully!');
    }
  }
);
```

### **4. Strip Metadata from Existing Files**

```typescript
// Strip all metadata from an already uploaded file
const result = await upload.stripMetadataFromExistingFile('existing-file-id', {
  stripExif: true,
});

// Strip only GPS data from an existing file
const result = await upload.stripMetadataFromExistingFile('existing-file-id', {
  stripGps: true,
});
```

### **5. Check What Metadata Exists in a File**

```typescript
// Get detailed metadata information
const metadata = await upload.getFileMetadata('file-id');

if (metadata) {
  console.log('EXIF Data:', metadata.exif);
  console.log('GPS Coordinates:', metadata.exif?.gps);
  console.log('Camera Info:', metadata.exif?.camera);
  console.log('Face Detection:', metadata.faces);
  console.log('Color Analysis:', metadata.colors);
}
```

## 🔧 **Configuration Options**

### **Upload Options Interface**

```typescript
interface UploadOptions {
  folder?: string;
  allowedFormats?: string[];
  maxFileSize?: number;
  transformation?: any;
  publicId?: string;
  
  // NEW: Metadata Stripping Options
  stripMetadata?: boolean;  // Strip ALL metadata
  stripExif?: boolean;      // Strip EXIF data specifically
  stripGps?: boolean;       // Strip GPS coordinates only
}
```

### **Metadata Stripping Behavior**

| Option | What It Strips | Use Case |
|--------|----------------|----------|
| `stripMetadata: true` | ALL metadata (EXIF, GPS, colors, faces, etc.) | **Maximum security & privacy** |
| `stripExif: true` | EXIF data including GPS | **Remove location and camera info** |
| `stripGps: true` | GPS coordinates only | **Keep camera info, remove location** |
| None specified | No metadata stripped | **Preserve all original data** |

## 🛡️ **Security Recommendations**

### **For User Profile Pictures**
```typescript
// Always strip metadata for profile pictures
const result = await upload.uploadFile(profilePicture, {
  folder: 'user-profiles',
  stripMetadata: true, // Remove all potentially sensitive data
});
```

### **For Public Gallery Images**
```typescript
// Strip GPS but keep some metadata for artistic purposes
const result = await upload.uploadFile(galleryImage, {
  folder: 'public-gallery',
  stripGps: true, // Remove location data only
});
```

### **For Document Uploads**
```typescript
// Strip all metadata for sensitive documents
const result = await upload.uploadFile(document, {
  folder: 'documents',
  stripMetadata: true, // Maximum privacy
});
```

## 📱 **Frontend Integration Examples**

### **React Component Example**

```tsx
import React, { useState } from 'react';
import { upload } from 'common';

const FileUpload = () => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleFileUpload = async (file: File) => {
    setUploading(true);
    
    try {
      const result = await upload.uploadWithProgress(
        file,
        {
          folder: 'user-uploads',
          stripMetadata: true, // Always strip metadata for security
        },
        (progress) => {
          setProgress(progress.progress);
        }
      );

      if (result.success) {
        console.log('File uploaded:', result.url);
        console.log('Metadata stripped:', result.metadataStripped);
      }
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <input 
        type="file" 
        onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
        accept="image/*"
      />
      {uploading && <div>Uploading... {progress}%</div>}
    </div>
  );
};
```

### **Vue.js Component Example**

```vue
<template>
  <div>
    <input 
      type="file" 
      @change="handleFileUpload" 
      accept="image/*"
    />
    <div v-if="uploading">Uploading... {{ progress }}%</div>
  </div>
</template>

<script>
import { upload } from 'common';

export default {
  data() {
    return {
      uploading: false,
      progress: 0
    };
  },
  methods: {
    async handleFileUpload(event) {
      const file = event.target.files[0];
      if (!file) return;

      this.uploading = true;
      
      try {
        const result = await upload.uploadWithProgress(
          file,
          {
            folder: 'user-uploads',
            stripMetadata: true,
          },
          (progress) => {
            this.progress = progress.progress;
          }
        );

        if (result.success) {
          console.log('File uploaded:', result.url);
          console.log('Metadata stripped:', result.metadataStripped);
        }
      } catch (error) {
        console.error('Upload failed:', error);
      } finally {
        this.uploading = false;
      }
    }
  }
};
</script>
```

## 🔍 **Testing Metadata Stripping**

### **Test Script**

```typescript
import { upload } from 'common';

async function testMetadataStripping() {
  // 1. Upload a file with metadata
  const originalResult = await upload.uploadFile(testFile, {
    folder: 'test',
    stripMetadata: false, // Don't strip initially
  });

  if (originalResult.success) {
    // 2. Check what metadata exists
    const metadata = await upload.getFileMetadata(originalResult.publicId!);
    console.log('Original metadata:', metadata);

    // 3. Strip metadata from existing file
    const strippedResult = await upload.stripMetadataFromExistingFile(
      originalResult.publicId!,
      { stripExif: true }
    );

    if (strippedResult.success) {
      // 4. Check metadata after stripping
      const strippedMetadata = await upload.getFileMetadata(strippedResult.publicId!);
      console.log('Metadata after stripping:', strippedMetadata);
    }
  }
}
```

## ⚠️ **Important Notes**

1. **Metadata stripping is irreversible** - Once stripped, metadata cannot be recovered
2. **GPS data can reveal user location** - Always strip for user privacy
3. **EXIF data can reveal device information** - Consider security implications
4. **Cloudinary transformations are applied during upload** - Plan your transformations carefully
5. **Metadata stripping adds processing time** - Balance security with performance

## 🎯 **Best Practices**

1. **Always strip metadata for user uploads** - Protect user privacy
2. **Use `stripMetadata: true` for sensitive content** - Maximum security
3. **Consider `stripGps: true` for public content** - Remove location data
4. **Test metadata stripping in development** - Verify behavior before production
5. **Document your metadata policies** - Clear guidelines for your team

The enhanced upload service now provides enterprise-grade security and privacy protection for all file uploads! 🛡️✨
