import { NextRequest } from 'next/server';
import { authMiddleware } from '../../../../src/modules/auth/middlewares/auth.middleware';
import { InventoryController } from '../../../../src/modules/inventory/controllers/inventory.controller';

const controller = new InventoryController();

export async function GET(req: NextRequest) {
  return await authMiddleware(req, async (user: any) => {
    return await controller.getAllMaterials(req, user);
  });
}

export async function POST(req: NextRequest) {
  return await authMiddleware(req, async (user: any) => {
    return await controller.createMaterial(req, user);
  });
}
