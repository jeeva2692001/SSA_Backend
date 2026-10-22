import { NextRequest } from 'next/server';
import { authMiddleware } from '../../../../src/modules/auth/middlewares/auth.middleware';
import { LeaveController } from '../../../../src/modules/employee';

const leaveController = new LeaveController();

export async function GET(req: NextRequest) {
  return await authMiddleware(req, async (user: any) => {
    return await leaveController.get(req, user);
  });
}

export async function POST(req: NextRequest) {
  return await authMiddleware(req, async (user: any) => {
    return await leaveController.apply(req, user);
  });
}

export async function PUT(req: NextRequest) {
  return await authMiddleware(req, async (user: any) => {
    return await leaveController.updateStatus(req, user);
  });
}
