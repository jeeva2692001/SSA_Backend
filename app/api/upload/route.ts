import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import path from 'path';
import { authMiddleware } from '../../../src/modules/auth/middlewares/auth.middleware';

// Helper to get configured Cloudinary instance
function getCloudinary() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME || 'sbsymyo4';
  const apiKey = process.env.CLOUDINARY_API_KEY || '421495547388578';
  const apiSecret = process.env.CLOUDINARY_API_SECRET || 'UMYh-b3HhK521tbFiwtDz1diR8k';

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });
  return cloudinary;
}

export async function POST(req: NextRequest) {
  return await authMiddleware(req, async (user: any) => {
    try {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      const targetFolder = (formData.get('folder') as string) || process.env.CLOUDINARY_FOLDER || 'project_drawings';

      if (!file) {
        return NextResponse.json({ success: false, message: 'No file provided.' }, { status: 400 });
      }

      // File Format Validation (BUG-028: Reject unsupported executable, script, and archive files)
      const fileNameLower = file.name.toLowerCase();
      const fileExt = fileNameLower.split('.').pop() || '';
      const DISALLOWED_EXTENSIONS = ['exe', 'msi', 'bat', 'cmd', 'sh', 'bin', 'js', 'ts', 'vbs', 'ps1', 'zip', 'rar', 'tar', 'gz', '7z', 'iso', 'dll', 'jar', 'scr', 'apk', 'app'];
      const ALLOWED_EXTENSIONS = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'csv', 'txt', 'rtf', 'dwg', 'dxf', 'cad', 'rvt', 'ifc', 'png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'];

      if (DISALLOWED_EXTENSIONS.includes(fileExt) || !ALLOWED_EXTENSIONS.includes(fileExt)) {
        return NextResponse.json({
          success: false,
          message: `Unsupported file format (.${fileExt}). Executable, script, and archive files (.exe, .msi, .bat, .js, .zip) are not permitted. Supported document formats: PDF, DOC, DOCX, XLS, XLSX, DWG, PNG, JPG.`
        }, { status: 400 });
      }

      // Photograph Folder Restriction (BUG-036: TC-SSA-DOC-SITE-043)
      if (targetFolder.includes('site_photos')) {
        const ALLOWED_PHOTO_EXTS = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
        if (!ALLOWED_PHOTO_EXTS.includes(fileExt) || (!file.type.startsWith('image/') && file.type !== '')) {
          return NextResponse.json({
            success: false,
            message: `Unsupported photograph format (.${fileExt}). Only image files (JPG, JPEG, PNG, WEBP) are allowed for site inspection photographs. Documents and application files (.xlsx, .pdf, .apk) are not permitted.`
          }, { status: 400 });
        }
      }

      const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB (accommodates DWG/CAD deliverable files)
      if (file.size > MAX_FILE_SIZE_BYTES) {
        return NextResponse.json({
          success: false,
          message: 'File size exceeds the maximum permitted limit of 50 MB per file.'
        }, { status: 400 });
      }

      // Convert Next.js File to Buffer
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const isDwgOrCad = /\.(dwg|dxf|cad|rvt|ifc)$/i.test(file.name) || file.type.includes('acad') || file.type.includes('dwg');
      const isImageOrPdf = file.type.startsWith('image/') || file.type === 'application/pdf' || /\.(png|jpg|jpeg|webp|gif|svg|pdf)$/i.test(file.name);
      const resourceType = isDwgOrCad ? 'raw' : (isImageOrPdf ? 'auto' : 'raw');

      let fileUrl = '';
      let publicId = '';

      try {
        const cloudinaryInstance = getCloudinary();
        // Upload to Cloudinary using stream into designated folder
        const result = await new Promise<any>((resolve, reject) => {
          cloudinaryInstance.uploader.upload_stream(
            {
              resource_type: resourceType,
              folder: targetFolder,
              use_filename: true,
              unique_filename: true,
            },
            (error, result) => {
              if (error) {
                console.error('[UploadRoute] Cloudinary upload error:', error);
                reject(error);
              } else {
                resolve(result);
              }
            }
          ).end(buffer);
        });

        fileUrl = result.secure_url || result.url;
        publicId = result.public_id;
      } catch (cloudErr) {
        console.warn('[UploadRoute] Cloudinary failed, saving to local public/uploads directory:', cloudErr);
        const uploadsDir = path.join(process.cwd(), 'public', 'uploads', targetFolder);
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }
        const safeName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
        const filePath = path.join(uploadsDir, safeName);
        fs.writeFileSync(filePath, buffer);
        fileUrl = `/uploads/${targetFolder}/${safeName}`;
        publicId = safeName;
      }

      return NextResponse.json({
        success: true,
        url: fileUrl,
        secure_url: fileUrl,
        name: file.name,
        size: file.size,
        type: file.type,
        publicId: publicId,
        folder: targetFolder,
      });
    } catch (err: any) {
      console.error('[UploadRoute] Upload handler error:', err);
      return NextResponse.json({ success: false, message: err.message }, { status: 500 });
    }
  });
}
