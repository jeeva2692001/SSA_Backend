import { NextRequest } from 'next/server';
import { authMiddleware } from '../../../../src/modules/auth/middlewares/auth.middleware';
import { BranchController } from '../../../../src/modules/branch';

const branchController = new BranchController();

export async function POST(req: NextRequest) {
  return await authMiddleware(req, async (user: any) => {
    return await branchController.checkPassword(req, user);
  });
}
