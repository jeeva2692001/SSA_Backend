import { NextRequest } from 'next/server';
import { authMiddleware } from '../../../../../src/modules/auth/middlewares/auth.middleware';
import { RbacController } from '../../../../../src/modules/rbac';

const rbacController = new RbacController();

export async function POST(req: NextRequest) {
  return await authMiddleware(req, async (user: any) => {
    return await rbacController.togglePermission(req, user);
  });
}

export async function PATCH(req: NextRequest) {
  return await authMiddleware(req, async (user: any) => {
    return await rbacController.togglePermission(req, user);
  });
}
