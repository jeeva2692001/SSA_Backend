import { InventoryRepository, AssetFilterOptions, MaterialFilterOptions } from '../repositories/inventory.repository';
import { AssetModel, AssetStatus, AssetType } from '../models/asset.model';
import { MaterialStockModel, MaterialStatus } from '../models/material.model';

export const INITIAL_SEEDED_ASSETS: Array<Partial<AssetModel>> = [
  {
    assetCode: 'AST-701',
    assetId: 'SSA-WS-004',
    assetName: 'Precision 7920 Workstation',
    assetType: 'Workstation',
    department: 'BIM & Rendering',
    assignedTo: 'Siddharth Sen',
    purchaseDate: '2024-03-12',
    warrantyDate: '2027-03-12',
    status: 'Assigned',
    companyId: 'COM-001'
  },
  {
    assetCode: 'AST-702',
    assetId: 'SSA-SRV-02',
    assetName: 'PowerEdge T550 Core Server',
    assetType: 'Server',
    department: 'IT Operations',
    assignedTo: 'None',
    purchaseDate: '2023-08-01',
    warrantyDate: '2026-08-01',
    status: 'In Stock',
    companyId: 'COM-001'
  },
  {
    assetCode: 'AST-703',
    assetId: 'SSA-VR-01',
    assetName: 'Oculus Quest Pro 256GB',
    assetType: 'VR Headset',
    department: 'Studio A',
    assignedTo: 'Ananya Deshmukh',
    purchaseDate: '2025-01-10',
    warrantyDate: '2026-01-10',
    status: 'Assigned',
    companyId: 'COM-001'
  },
  {
    assetCode: 'AST-704',
    assetId: 'SSA-PLT-01',
    assetName: 'HP DesignJet Z9 Wide Plotter',
    assetType: 'Plotting Device',
    department: 'Admin Office',
    assignedTo: 'None',
    purchaseDate: '2022-11-20',
    warrantyDate: '2025-11-20',
    status: 'Under Repair',
    companyId: 'COM-001'
  },
  {
    assetCode: 'AST-705',
    assetId: 'SSA-LIC-08',
    assetName: 'Autodesk Revit AEC Collection Subscription',
    assetType: 'BIM Software License',
    department: 'Studio B',
    assignedTo: 'Aditi Rao',
    purchaseDate: '2025-05-01',
    warrantyDate: '2026-05-01',
    status: 'Assigned',
    companyId: 'COM-001'
  }
];

export const INITIAL_SEEDED_MATERIALS: Array<Partial<MaterialStockModel>> = [
  {
    materialCode: 'MAT-801',
    materialName: 'A0 Plotting Paper Roll (80gsm)',
    category: 'Plotting Supplies',
    stockLevel: 25,
    unit: 'Rolls',
    reorderPoint: 10,
    status: 'In Stock',
    companyId: 'COM-001'
  },
  {
    materialCode: 'MAT-802',
    materialName: 'A1 Plotting Paper Roll (120gsm)',
    category: 'Plotting Supplies',
    stockLevel: 8,
    unit: 'Rolls',
    reorderPoint: 12,
    status: 'Low Stock',
    companyId: 'COM-001'
  },
  {
    materialCode: 'MAT-803',
    materialName: 'BIM Server Fiber Connectors',
    category: 'Networking',
    stockLevel: 45,
    unit: 'Units',
    reorderPoint: 15,
    status: 'In Stock',
    companyId: 'COM-001'
  },
  {
    materialCode: 'MAT-804',
    materialName: 'Matte Finish Texture Sample Boards',
    category: 'Design Materials',
    stockLevel: 0,
    unit: 'Kits',
    reorderPoint: 5,
    status: 'Out of Stock',
    companyId: 'COM-001'
  }
];

export class InventoryService {
  private repo: InventoryRepository;

  constructor() {
    this.repo = new InventoryRepository();
  }

  async ensureSeeded(_companyId: string = 'COM-001'): Promise<void> {
    // Dummy seeding disabled to keep store & inventory clean and user-driven
    return;
  }

  // Assets
  async getAllAssets(
    context: { companyId?: string; branchId?: string | null; role?: string },
    options: { search?: string; assetType?: string; status?: string; department?: string } = {}
  ): Promise<AssetModel[]> {
    const companyId = context.companyId || 'COM-001';

    const filterOptions: AssetFilterOptions = {
      companyId: context.role === 'Super Admin' ? undefined : companyId,
      branchId: context.branchId ? context.branchId : undefined,
      search: options.search,
      assetType: options.assetType,
      status: options.status,
      department: options.department
    };

    const res = await this.repo.findAllAssets(filterOptions);
    return res;
  }

  async getAssetById(idOrTag: string): Promise<AssetModel | null> {
    return await this.repo.findAssetByIdOrTag(idOrTag);
  }

  async createAsset(
    data: Partial<AssetModel>,
    context: { companyId?: string; branchId?: string | null }
  ): Promise<AssetModel> {
    if (!data.assetName || !data.assetName.trim()) {
      throw new Error('Asset name is required.');
    }
    if (!data.assetId || !data.assetId.trim()) {
      throw new Error('Asset ID / Inventory Tag is required.');
    }

    const companyId = context.companyId || 'COM-001';
    const assetCode = data.assetCode || (await this.repo.getNextAssetCode());

    return await this.repo.createAsset({
      ...data,
      assetCode,
      companyId,
      branchId: data.branchId ?? context.branchId ?? null,
      status: data.status || 'In Stock'
    });
  }

  async updateAsset(
    idOrTag: string,
    data: Partial<AssetModel>,
    _context: { companyId?: string }
  ): Promise<AssetModel | null> {
    return await this.repo.updateAsset(idOrTag, data);
  }

  async deleteAsset(idOrTag: string): Promise<boolean> {
    return await this.repo.deleteAsset(idOrTag);
  }

  // Materials & Stock
  async getAllMaterials(
    context: { companyId?: string; branchId?: string | null; role?: string },
    options: { search?: string; category?: string; status?: string } = {}
  ): Promise<MaterialStockModel[]> {
    const companyId = context.companyId || 'COM-001';

    const filterOptions: MaterialFilterOptions = {
      companyId: context.role === 'Super Admin' ? undefined : companyId,
      branchId: context.branchId ? context.branchId : undefined,
      search: options.search,
      category: options.category,
      status: options.status
    };

    return await this.repo.findAllMaterials(filterOptions);
  }

  async getMaterialById(idOrCode: string): Promise<MaterialStockModel | null> {
    return await this.repo.findMaterialByIdOrCode(idOrCode);
  }

  async createMaterial(
    data: Partial<MaterialStockModel>,
    context: { companyId?: string; branchId?: string | null }
  ): Promise<MaterialStockModel> {
    if (!data.materialName || !data.materialName.trim()) {
      throw new Error('Material name is required.');
    }

    const companyId = context.companyId || 'COM-001';
    const materialCode = data.materialCode || (await this.repo.getNextMaterialCode());
    const stockLevel = Number(data.stockLevel || 0);
    const reorderPoint = Number(data.reorderPoint || 5);

    let status: MaterialStatus = 'In Stock';
    if (stockLevel === 0) status = 'Out of Stock';
    else if (stockLevel <= reorderPoint) status = 'Low Stock';

    return await this.repo.createMaterial({
      ...data,
      materialCode,
      stockLevel,
      reorderPoint,
      status: data.status || status,
      companyId,
      branchId: data.branchId ?? context.branchId ?? null
    });
  }

  async updateMaterial(
    idOrCode: string,
    data: Partial<MaterialStockModel>,
    _context: { companyId?: string }
  ): Promise<MaterialStockModel | null> {
    return await this.repo.updateMaterial(idOrCode, data);
  }

  async deleteMaterial(idOrCode: string): Promise<boolean> {
    return await this.repo.deleteMaterial(idOrCode);
  }
}
