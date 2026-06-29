import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '../services/auth.service';
import { UserModel } from '../models/user.model';

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  async login(req: NextRequest): Promise<NextResponse> {
    try {
      const body = await req.json();
      const { userId, password } = body;

      if (!userId || !password) {
        return NextResponse.json(
          { message: 'User ID and password are required.' },
          { status: 400 }
        );
      }

      const result = await this.authService.login(userId, password);
      return NextResponse.json(result, { status: 200 });
    } catch (error: any) {
      console.error('Error in AuthController.login:', error.message);
      return NextResponse.json(
        { message: error.message || 'Authentication failed.' },
        { status: 401 }
      );
    }
  }

  async register(req: NextRequest): Promise<NextResponse> {
    try {
      const body = await req.json();
      const user = await this.authService.register(body);
      
      const userResponse = {
        id: `USR-${String(user.id).padStart(3, '0')}`,
        userId: user.userId,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
      };

      return NextResponse.json(userResponse, { status: 201 });
    } catch (error: any) {
      console.error('Error in AuthController.register:', error.message);
      return NextResponse.json(
        { message: error.message || 'Registration failed.' },
        { status: 400 }
      );
    }
  }

  async getProfile(req: NextRequest, currentUser: UserModel): Promise<NextResponse> {
    try {
      const userResponse = {
        id: `USR-${String(currentUser.id).padStart(3, '0')}`,
        userId: currentUser.userId,
        name: currentUser.name,
        email: currentUser.email,
        role: currentUser.role,
        avatar: currentUser.avatar,
      };
      return NextResponse.json(userResponse, { status: 200 });
    } catch (error: any) {
      console.error('Error in AuthController.getProfile:', error.message);
      return NextResponse.json(
        { message: 'Failed to retrieve profile.' },
        { status: 500 }
      );
    }
  }
}
