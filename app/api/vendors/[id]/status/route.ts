import { NextRequest } from 'next/server';
import { authMiddleware } from '../../../../../src/modules/auth/middlewares/auth.middleware';
import { VendorController } from '../../../../../src/modules/vendor/controllers/vendor.controller';

const vendorController = new VendorController();

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  return await authMiddleware(req, async (user: any) => {
    return await vendorController.updateApprovalStatus(req, resolvedParams.id, user);
  });
}
