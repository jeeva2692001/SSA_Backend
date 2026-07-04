import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '../services/auth.service';

const authService = new AuthService();

export async function authMiddleware(req: NextRequest, next: (user: any) => Promise<NextResponse>) {
  const authHeader = req.headers.get('authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ message: 'Authorization token is required.' }, { status: 401 });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = await authService.verifyToken(token);
    
    let user = null;
    if (decoded.role === 'Company') {
      user = await authService.getCompanyById(decoded.id);
    } else {
      user = await authService.getUserById(decoded.id);
    }

    if (!user) {
      return NextResponse.json({ message: 'User does not exist.' }, { status: 401 });
    }

    // Attach role to the user object dynamically
    (user as any).role = decoded.role;

    return await next(user);
  } catch (error: any) {
    console.error('[AuthMiddleware] Verification failed:', error.message);
    return NextResponse.json({ message: 'Invalid or expired authorization token.' }, { status: 401 });
  }
}
