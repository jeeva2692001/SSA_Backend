import { NextRequest } from 'next/server';
import { authMiddleware } from '../../../../../src/modules/auth/middlewares/auth.middleware';
import { RbacController } from '../../../../../src/modules/rbac';

const rbacController = new RbacController();

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ name: string }> | { name: string } }
) {
  const params = await context.params;
  return await authMiddleware(req, async (user: any) => {
    return await rbacController.deleteRole(req, user, params.name);
  });
}
