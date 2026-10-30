import { NextRequest, NextResponse } from 'next/server';
import { InventoryService } from '../services/inventory.service';

export class InventoryController {
  private service: InventoryService;

  constructor() {
    this.service = new InventoryService();
  }

  // --- Asset Endpoints ---
  async getAllAssets(req: NextRequest, user: any) {
    try {
      const { searchParams } = new URL(req.url);
      const search = searchParams.get('search') || undefined;
      const assetType = searchParams.get('assetType') || undefined;
      const status = searchParams.get('status') || undefined;
      const department = searchParams.get('department') || undefined;

      const branchId = user?.role === 'Branch' ? (user?.branchId || undefined) : (searchParams.get('branchId') || undefined);

      const assets = await this.service.getAllAssets(
        {
          companyId: user?.companyId || 'COM-001',
          branchId,
          role: user?.role
        },
        { search, assetType, status, department }
      );

      return NextResponse.json({ success: true, data: assets }, { status: 200 });
    } catch (err: any) {
      console.error('[InventoryController] getAllAssets error:', err);
      return NextResponse.json({ success: false, message: err.message }, { status: 500 });
    }
  }

  async getAssetById(_req: NextRequest, id: string) {
    try {
      const asset = await this.service.getAssetById(id);
      if (!asset) {
        return NextResponse.json({ success: false, message: 'Asset not found.' }, { status: 404 });
      }
      return NextResponse.json({ success: true, data: asset }, { status: 200 });
    } catch (err: any) {
      return NextResponse.json({ success: false, message: err.message }, { status: 500 });
    }
  }

  async createAsset(req: NextRequest, user: any) {
    try {
      const body = await req.json();
      const asset = await this.service.createAsset(body, {
        companyId: user?.companyId || 'COM-001',
        branchId: user?.branchId || null
      });
      return NextResponse.json({
        success: true,
        data: asset,
        message: `Asset "${asset.assetName}" (${asset.assetId}) created successfully.`
      }, { status: 201 });
    } catch (err: any) {
      return NextResponse.json({ success: false, message: err.message }, { status: 400 });
    }
  }

  async updateAsset(req: NextRequest, id: string, user: any) {
    try {
      const body = await req.json();
      const updated = await this.service.updateAsset(id, body, {
        companyId: user?.companyId
      });
      if (!updated) {
        return NextResponse.json({ success: false, message: 'Asset not found.' }, { status: 404 });
      }
      return NextResponse.json({
        success: true,
        data: updated,
        message: 'Asset updated successfully.'
      }, { status: 200 });
    } catch (err: any) {
      return NextResponse.json({ success: false, message: err.message }, { status: 400 });
    }
  }

  async deleteAsset(_req: NextRequest, id: string, _user: any) {
    try {
      const success = await this.service.deleteAsset(id);
      if (!success) {
        return NextResponse.json({ success: false, message: 'Asset not found.' }, { status: 404 });
      }
      return NextResponse.json({ success: true, message: 'Asset removed successfully.' }, { status: 200 });
    } catch (err: any) {
      return NextResponse.json({ success: false, message: err.message }, { status: 500 });
    }
  }

  // --- Material & Stock Endpoints ---
  async getAllMaterials(req: NextRequest, user: any) {
    try {
      const { searchParams } = new URL(req.url);
      const search = searchParams.get('search') || undefined;
      const category = searchParams.get('category') || undefined;
      const status = searchParams.get('status') || undefined;
      const branchId = user?.role === 'Branch' ? (user?.branchId || undefined) : (searchParams.get('branchId') || undefined);

      const materials = await this.service.getAllMaterials(
        {
          companyId: user?.companyId || 'COM-001',
          branchId,
          role: user?.role
        },
        { search, category, status }
      );

      return NextResponse.json({ success: true, data: materials }, { status: 200 });
    } catch (err: any) {
      console.error('[InventoryController] getAllMaterials error:', err);
      return NextResponse.json({ success: false, message: err.message }, { status: 500 });
    }
  }

  async getMaterialById(_req: NextRequest, id: string) {
    try {
      const mat = await this.service.getMaterialById(id);
      if (!mat) {
        return NextResponse.json({ success: false, message: 'Material not found.' }, { status: 404 });
      }
      return NextResponse.json({ success: true, data: mat }, { status: 200 });
    } catch (err: any) {
      return NextResponse.json({ success: false, message: err.message }, { status: 500 });
    }
  }

  async createMaterial(req: NextRequest, user: any) {
    try {
      const body = await req.json();
      const material = await this.service.createMaterial(body, {
        companyId: user?.companyId || 'COM-001',
        branchId: user?.branchId || null
      });
      return NextResponse.json({
        success: true,
        data: material,
        message: `Material "${material.materialName}" registered successfully.`
      }, { status: 201 });
    } catch (err: any) {
      return NextResponse.json({ success: false, message: err.message }, { status: 400 });
    }
  }

  async updateMaterial(req: NextRequest, id: string, user: any) {
    try {
      const body = await req.json();
      const updated = await this.service.updateMaterial(id, body, {
        companyId: user?.companyId
      });
      if (!updated) {
        return NextResponse.json({ success: false, message: 'Material not found.' }, { status: 404 });
      }
      return NextResponse.json({
        success: true,
        data: updated,
        message: 'Material record updated successfully.'
      }, { status: 200 });
    } catch (err: any) {
      return NextResponse.json({ success: false, message: err.message }, { status: 400 });
    }
  }

  async deleteMaterial(_req: NextRequest, id: string, _user: any) {
    try {
      const success = await this.service.deleteMaterial(id);
      if (!success) {
        return NextResponse.json({ success: false, message: 'Material not found.' }, { status: 404 });
      }
      return NextResponse.json({ success: true, message: 'Material record deleted successfully.' }, { status: 200 });
    } catch (err: any) {
      return NextResponse.json({ success: false, message: err.message }, { status: 500 });
    }
  }
}
