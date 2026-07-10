import { NextRequest } from 'next/server';
import { authMiddleware } from '../../../src/modules/auth/middlewares/auth.middleware';
import { BranchEmployeeController } from '../../../src/modules/branch-employee';

const branchEmployeeController = new BranchEmployeeController();

export async function GET(req: NextRequest) {
  return await authMiddleware(req, async (user: any) => {
    return await branchEmployeeController.getAll(req, user);
  });
}

export async function POST(req: NextRequest) {
  return await authMiddleware(req, async (user: any) => {
    return await branchEmployeeController.register(req, user);
  });
}

export async function PUT(req: NextRequest) {
  return await authMiddleware(req, async (user: any) => {
    return await branchEmployeeController.update(req, user);
  });
}

export async function DELETE(req: NextRequest) {
  return await authMiddleware(req, async (user: any) => {
    return await branchEmployeeController.delete(req, user);
  });
}
