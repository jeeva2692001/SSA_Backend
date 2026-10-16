import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import path from 'path';

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

// Generate an authenticated/signed Cloudinary download URL to bypass 401 ACL/delivery restrictions
function getCloudinarySignedUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    if (!urlObj.hostname.includes('cloudinary.com')) return null;

    const cld = getCloudinary();
    const segments = urlObj.pathname.split('/').filter(Boolean);
    // Standard format: [ <cloudName>, <resourceType>, <deliveryType>, ...transformationsOrVersion, ...publicIdParts ]
    if (segments.length < 4) return null;

    const rawResourceType = segments[1]?.toLowerCase();
    const resourceType = (rawResourceType === 'raw' || rawResourceType === 'video') ? rawResourceType : 'image';
    const deliveryType = segments[2] || 'upload';

    let rest = segments.slice(3);
    // Strip versions (v123456789) and transformation tokens (e.g. s--...--, w_200, f_png)
    while (rest.length > 1 && (/^v\d+$/.test(rest[0]) || /^[a-z]_[^,]+/.test(rest[0]) || /^s--.*--$/.test(rest[0]))) {
      rest = rest.slice(1);
    }

    const fullPath = rest.join('/');
    const lastDot = fullPath.lastIndexOf('.');
    let publicId = fullPath;
    let format = '';

    if (resourceType === 'raw') {
      publicId = fullPath;
      format = lastDot !== -1 ? fullPath.slice(lastDot + 1) : '';
    } else {
      if (lastDot !== -1) {
        publicId = fullPath.slice(0, lastDot);
        format = fullPath.slice(lastDot + 1);
      } else {
        format = 'pdf';
      }
    }

    return cld.utils.private_download_url(publicId, format, {
      resource_type: resourceType,
      type: deliveryType,
      attachment: false,
    });
  } catch (e) {
    console.warn('[ProxyPDF] Could not generate Cloudinary private download URL:', e);
    return null;
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const targetUrl = searchParams.get('url');

    if (!targetUrl) {
      return NextResponse.json({ success: false, message: 'URL parameter is required.' }, { status: 400 });
    }

    // Decode if needed
    const decodedUrl = decodeURIComponent(targetUrl);

    // 1. If data URL, return buffer directly
    if (decodedUrl.startsWith('data:')) {
      const parts = decodedUrl.split(',');
      const mime = parts[0].match(/:(.*?);/)?.[1] || 'application/pdf';
      const buffer = Buffer.from(parts[1], 'base64');
      return new NextResponse(buffer, {
        status: 200,
        headers: {
          'Content-Type': mime,
          'Content-Disposition': 'inline',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      });
    }

    // 2. If local filesystem upload (/uploads/...)
    if (decodedUrl.startsWith('/uploads/') || decodedUrl.startsWith('uploads/')) {
      const cleanPath = decodedUrl.startsWith('/') ? decodedUrl.slice(1) : decodedUrl;
      const localFilePath = path.join(process.cwd(), 'public', cleanPath);
      if (fs.existsSync(localFilePath)) {
        const buffer = fs.readFileSync(localFilePath);
        let contentType = 'application/pdf';
        if (/\.(png|jpg|jpeg|webp|gif|svg)$/i.test(localFilePath)) {
          const ext = localFilePath.split('.').pop()?.toLowerCase();
          contentType = ext === 'jpg' ? 'image/jpeg' : `image/${ext}`;
        } else if (/\.(dwg|dxf|cad|rvt|ifc)$/i.test(localFilePath)) {
          contentType = 'application/octet-stream';
        }
        return new NextResponse(buffer, {
          status: 200,
          headers: {
            'Content-Type': contentType,
            'Content-Disposition': 'inline',
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'public, max-age=86400',
          },
        });
      }
    }

    // 3. Fetch remote resource (signed Cloudinary if applicable to prevent 401 ACL/delivery restrictions)
    let fetchUrl = decodedUrl;
    const isCloudinary = decodedUrl.includes('cloudinary.com');
    if (isCloudinary) {
      const signed = getCloudinarySignedUrl(decodedUrl);
      if (signed) {
        fetchUrl = signed;
      }
    }

    let response = await fetch(fetchUrl);

    // If signed URL failed or wasn't used and we received 401/403 on Cloudinary, attempt signed URL fallback
    if (!response.ok && fetchUrl !== decodedUrl) {
      console.warn(`[ProxyPDF] Signed fetch returned ${response.status}, retrying raw decodedUrl...`);
      const fallbackResponse = await fetch(decodedUrl);
      if (fallbackResponse.ok) {
        response = fallbackResponse;
      }
    } else if (!response.ok && isCloudinary && (response.status === 401 || response.status === 403)) {
      const signed = getCloudinarySignedUrl(decodedUrl);
      if (signed && signed !== fetchUrl) {
        const signedResponse = await fetch(signed);
        if (signedResponse.ok) {
          response = signedResponse;
        }
      }
    }

    if (!response.ok) {
      return NextResponse.json(
        { success: false, message: `Failed to fetch upstream file (status ${response.status})` },
        { status: response.status }
      );
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let contentType = response.headers.get('content-type') || 'application/pdf';
    if (decodedUrl.endsWith('.pdf') || decodedUrl.includes('.pdf?') || decodedUrl.includes('format=pdf') || buffer.slice(0, 5).toString('utf8').startsWith('%PDF')) {
      contentType = 'application/pdf';
    } else if (/\.(png|jpg|jpeg|webp|gif|svg)$/i.test(decodedUrl)) {
      const ext = decodedUrl.split('.').pop()?.toLowerCase();
      contentType = ext === 'jpg' ? 'image/jpeg' : `image/${ext}`;
    } else if (/\.(dwg|dxf|cad|rvt|ifc)$/i.test(decodedUrl)) {
      contentType = 'application/octet-stream';
    }

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': 'inline',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (err: any) {
    console.error('[ProxyPDF] Error streaming document:', err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
