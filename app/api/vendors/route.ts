import { NextRequest } from 'next/server';
import { authMiddleware } from '../../../src/modules/auth/middlewares/auth.middleware';
import { VendorController } from '../../../src/modules/vendor/controllers/vendor.controller';

const vendorController = new VendorController();

export async function GET(req: NextRequest) {
  return await authMiddleware(req, async (user: any) => {
    return await vendorController.getAllVendors(req, user);
  });
}

export async function POST(req: NextRequest) {
  return await authMiddleware(req, async (user: any) => {
    return await vendorController.createVendor(req, user);
  });
}
