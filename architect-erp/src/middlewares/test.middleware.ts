import { NextRequest, NextResponse } from 'next/server';

export async function testMiddleware(req: NextRequest, next: () => Promise<NextResponse>) {
  console.log(`[Middleware] Processing test request to ${req.nextUrl.pathname}`);
  
  // Here you could add authentication or validation logic
  // For example, checking headers, tokens, etc.

  // Execute the next handler
  return await next();
}
