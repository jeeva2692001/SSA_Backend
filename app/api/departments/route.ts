import { NextRequest } from 'next/server';
import { authMiddleware } from '../../../src/modules/auth/middlewares/auth.middleware';
import { DepartmentController } from '../../../src/modules/company';

const departmentController = new DepartmentController();

export async function GET(req: NextRequest) {
  return await authMiddleware(req, async (user: any) => {
    return await departmentController.getAll(req, user);
  });
}

export async function POST(req: NextRequest) {
  return await authMiddleware(req, async (user: any) => {
    return await departmentController.create(req, user);
  });
}

export async function PUT(req: NextRequest) {
  return await authMiddleware(req, async (user: any) => {
    return await departmentController.update(req, user);
  });
}

export async function DELETE(req: NextRequest) {
  return await authMiddleware(req, async (user: any) => {
    return await departmentController.delete(req, user);
  });
}
