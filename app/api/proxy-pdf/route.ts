import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const targetUrl = searchParams.get('url');

    if (!targetUrl) {
      return NextResponse.json({ success: false, message: 'URL parameter is required.' }, { status: 400 });
    }

    // Decode if needed
    const decodedUrl = decodeURIComponent(targetUrl);

    // If data URL, return buffer directly
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

    // Fetch remote resource
    const response = await fetch(decodedUrl);
    if (!response.ok) {
      return NextResponse.json(
        { success: false, message: `Failed to fetch upstream file (status ${response.status})` },
        { status: response.status }
      );
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let contentType = response.headers.get('content-type') || 'application/pdf';
    if (decodedUrl.endsWith('.pdf') || decodedUrl.includes('.pdf?')) {
      contentType = 'application/pdf';
    } else if (/\.(png|jpg|jpeg|webp|gif|svg)$/i.test(decodedUrl)) {
      const ext = decodedUrl.split('.').pop()?.toLowerCase();
      contentType = ext === 'jpg' ? 'image/jpeg' : `image/${ext}`;
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
