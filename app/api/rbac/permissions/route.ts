import { NextRequest } from 'next/server';
import { authMiddleware } from '../../../../src/modules/auth/middlewares/auth.middleware';
import { RbacController } from '../../../../src/modules/rbac';

const rbacController = new RbacController();

export async function GET(req: NextRequest) {
  return await authMiddleware(req, async () => {
    return await rbacController.getCatalogue(req);
  });
}
