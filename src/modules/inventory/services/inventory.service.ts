import { InventoryRepository, AssetFilterOptions, MaterialFilterOptions } from '../repositories/inventory.repository';
import { AssetModel, AssetStatus, AssetType } from '../models/asset.model';
import { MaterialStockModel, MaterialStatus } from '../models/material.model';

export const INITIAL_SEEDED_ASSETS: Array<Partial<AssetModel>> = [];

export const INITIAL_SEEDED_MATERIALS: Array<Partial<MaterialStockModel>> = [];

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
    const trimmedAssetName = data.assetName.trim();
    if (/^\d+$/.test(trimmedAssetName)) {
      throw new Error('Asset Name / Model cannot consist solely of numeric digits. It must contain alphabetic characters.');
    }
    if (!/[a-zA-Z]/.test(trimmedAssetName)) {
      throw new Error('Asset Name / Model must contain alphabetic characters and cannot consist solely of numbers or special characters.');
    }

    if (!data.assetId || !data.assetId.trim()) {
      throw new Error('Asset ID / Inventory Tag is required.');
    }
    const trimmedAssetTag = data.assetId.trim();
    if (/^\d+$/.test(trimmedAssetTag)) {
      throw new Error('Asset Tag / Serial Code cannot consist solely of numeric digits. It must contain letters (e.g., SSA-WS-012).');
    }
    if (!/[a-zA-Z]/.test(trimmedAssetTag)) {
      throw new Error('Asset Tag / Serial Code must contain alphabetic characters and cannot consist solely of numbers or special characters.');
    }
    if (!/^[a-zA-Z0-9\-_/]+$/.test(trimmedAssetTag)) {
      throw new Error('Asset Tag / Serial Code can only contain letters, numbers, hyphens (-), underscores (_), and slashes (/).');
    }
    if (!data.assetType || !String(data.assetType).trim()) {
      throw new Error('Classification type is required.');
    }
    if (!data.department || !data.department.trim()) {
      throw new Error('Department is required.');
    }
    if (!data.status || !String(data.status).trim()) {
      throw new Error('Initial status is required.');
    }
    if (!data.assignedTo || !data.assignedTo.trim()) {
      throw new Error('Assigned staff / allocation option is required.');
    }

    if (data.purchaseDate && data.warrantyDate) {
      const pDate = new Date(data.purchaseDate);
      const wDate = new Date(data.warrantyDate);
      if (!isNaN(pDate.getTime()) && !isNaN(wDate.getTime()) && wDate < pDate) {
        throw new Error('Warranty expiry date cannot be earlier than the purchase date.');
      }
    }

    const companyId = context.companyId || 'COM-001';

    // Duplicate Asset check (same Asset Tag / Serial Code or same Asset Name + Tag)
    const existingAssets = await this.repo.findAllAssets({ companyId });
    const trimmedTag = data.assetId.trim().toLowerCase();
    const trimmedName = data.assetName.trim().toLowerCase();

    const duplicate = existingAssets.find(a =>
      (a.assetId && a.assetId.trim().toLowerCase() === trimmedTag) ||
      (a.id && a.id.trim().toLowerCase() === trimmedTag)
    );

    if (duplicate) {
      if (duplicate.assetName && duplicate.assetName.trim().toLowerCase() === trimmedName) {
        throw new Error(`Duplicate Asset: An asset with Name "${duplicate.assetName}" and Tag "${duplicate.assetId}" is already registered.`);
      }
      throw new Error(`Duplicate Asset Tag: An asset with Tag / Serial Code "${duplicate.assetId}" is already registered.`);
    }

    const assetCode = data.assetCode || (await this.repo.getNextAssetCode());

    // Synchronize assignment and status
    let finalStatus = data.status || 'In Stock';
    if (data.assignedTo && data.assignedTo !== 'None') {
      finalStatus = 'Assigned';
    } else if (finalStatus === 'Assigned') {
      finalStatus = 'In Stock';
    }

    return await this.repo.createAsset({
      ...data,
      assetCode,
      companyId,
      branchId: data.branchId ?? context.branchId ?? null,
      status: finalStatus
    });
  }

  async updateAsset(
    idOrTag: string,
    data: Partial<AssetModel>,
    _context: { companyId?: string }
  ): Promise<AssetModel | null> {
    const existing = await this.repo.findAssetByIdOrTag(idOrTag);
    if (!existing) return null;

    if (data.assetName !== undefined) {
      if (!data.assetName || !data.assetName.trim()) {
        throw new Error('Asset name is required.');
      }
      const trimmedAssetName = data.assetName.trim();
      if (/^\d+$/.test(trimmedAssetName)) {
        throw new Error('Asset Name / Model cannot consist solely of numeric digits. It must contain alphabetic characters.');
      }
      if (!/[a-zA-Z]/.test(trimmedAssetName)) {
        throw new Error('Asset Name / Model must contain alphabetic characters and cannot consist solely of numbers or special characters.');
      }
    }

    if (data.assetId !== undefined) {
      if (!data.assetId || !data.assetId.trim()) {
        throw new Error('Asset ID / Inventory Tag is required.');
      }
      const trimmedAssetTag = data.assetId.trim();
      if (/^\d+$/.test(trimmedAssetTag)) {
        throw new Error('Asset Tag / Serial Code cannot consist solely of numeric digits. It must contain letters (e.g., SSA-WS-012).');
      }
      if (!/[a-zA-Z]/.test(trimmedAssetTag)) {
        throw new Error('Asset Tag / Serial Code must contain alphabetic characters and cannot consist solely of numbers or special characters.');
      }
      if (!/^[a-zA-Z0-9\-_/]+$/.test(trimmedAssetTag)) {
        throw new Error('Asset Tag / Serial Code can only contain letters, numbers, hyphens (-), underscores (_), and slashes (/).');
      }
    }

    const effectivePurchaseDate = data.purchaseDate !== undefined ? data.purchaseDate : existing.purchaseDate;
    const effectiveWarrantyDate = data.warrantyDate !== undefined ? data.warrantyDate : existing.warrantyDate;
    if (effectivePurchaseDate && effectiveWarrantyDate) {
      const pDate = new Date(effectivePurchaseDate);
      const wDate = new Date(effectiveWarrantyDate);
      if (!isNaN(pDate.getTime()) && !isNaN(wDate.getTime()) && wDate < pDate) {
        throw new Error('Warranty expiry date cannot be earlier than the purchase date.');
      }
    }

    if (data.assetId) {
      const companyId = _context.companyId || existing.companyId || 'COM-001';
      const existingAssets = await this.repo.findAllAssets({ companyId });
      const trimmedTag = data.assetId.trim().toLowerCase();
      const trimmedName = (data.assetName || existing.assetName || '').trim().toLowerCase();
      const duplicate = existingAssets.find(
        a => a.id !== existing.id && (
          (a.assetId && a.assetId.trim().toLowerCase() === trimmedTag) ||
          (a.id && a.id.trim().toLowerCase() === trimmedTag)
        )
      );
      if (duplicate) {
        if (duplicate.assetName && duplicate.assetName.trim().toLowerCase() === trimmedName) {
          throw new Error(`Duplicate Asset: An asset with Name "${duplicate.assetName}" and Tag "${duplicate.assetId}" is already registered.`);
        }
        throw new Error(`Duplicate Asset Tag: An asset with Tag / Serial Code "${duplicate.assetId}" is already registered.`);
      }
    }

    // Synchronize assignment and status if updated
    if (data.assignedTo !== undefined) {
      if (data.assignedTo && data.assignedTo !== 'None') {
        data.status = 'Assigned';
      } else if (data.status === 'Assigned' || existing.status === 'Assigned') {
        data.status = 'In Stock';
      }
    }

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
    const trimmedMatName = data.materialName.trim();
    if (/^\d+$/.test(trimmedMatName)) {
      throw new Error('Material description cannot consist solely of numeric digits. It must contain alphabetic characters.');
    }
    if (!/[a-zA-Z]/.test(trimmedMatName)) {
      throw new Error('Material description must contain alphabetic characters and cannot consist solely of numbers or special characters.');
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
    if (data.materialName !== undefined) {
      if (!data.materialName || !data.materialName.trim()) {
        throw new Error('Material name is required.');
      }
      const trimmedMatName = data.materialName.trim();
      if (/^\d+$/.test(trimmedMatName)) {
        throw new Error('Material description cannot consist solely of numeric digits. It must contain alphabetic characters.');
      }
      if (!/[a-zA-Z]/.test(trimmedMatName)) {
        throw new Error('Material description must contain alphabetic characters and cannot consist solely of numbers or special characters.');
      }
    }

    return await this.repo.updateMaterial(idOrCode, data);
  }

  async deleteMaterial(idOrCode: string): Promise<boolean> {
    return await this.repo.deleteMaterial(idOrCode);
  }
}
