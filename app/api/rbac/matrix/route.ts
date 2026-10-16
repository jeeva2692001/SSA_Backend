import { NextRequest } from 'next/server';
import { authMiddleware } from '../../../../src/modules/auth/middlewares/auth.middleware';
import { RbacController } from '../../../../src/modules/rbac';

const rbacController = new RbacController();

export async function GET(req: NextRequest) {
  return await authMiddleware(req, async (user: any) => {
    return await rbacController.getMatrix(req, user);
  });
}
