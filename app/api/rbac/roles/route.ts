import { NextRequest } from 'next/server';
import { authMiddleware } from '../../../../src/modules/auth/middlewares/auth.middleware';
import { RbacController } from '../../../../src/modules/rbac';

const rbacController = new RbacController();

export async function GET(req: NextRequest) {
  return await authMiddleware(req, async (user: any) => {
    return await rbacController.getRoles(req, user);
  });
}

export async function POST(req: NextRequest) {
  return await authMiddleware(req, async (user: any) => {
    return await rbacController.addRole(req, user);
  });
}
