import { NextRequest } from 'next/server';
import { authMiddleware } from '../../../../src/modules/auth/middlewares/auth.middleware';
import { PerformanceController } from '../../../../src/modules/employee';

const performanceController = new PerformanceController();

export async function GET(req: NextRequest) {
  return await authMiddleware(req, async (user: any) => {
    return await performanceController.get(req, user);
  });
}

export async function POST(req: NextRequest) {
  return await authMiddleware(req, async (user: any) => {
    return await performanceController.create(req, user);
  });
}

export async function PUT(req: NextRequest) {
  return await authMiddleware(req, async (user: any) => {
    return await performanceController.update(req, user);
  });
}

export async function DELETE(req: NextRequest) {
  return await authMiddleware(req, async (user: any) => {
    return await performanceController.delete(req, user);
  });
}
