import { getDataSource } from '../../../shared/config/data-source';
import { AssetModel, AssetStatus, AssetType } from '../models/asset.model';
import { MaterialStockModel, MaterialStatus } from '../models/material.model';
import { Repository, Like, FindOptionsWhere } from 'typeorm';

export interface AssetFilterOptions {
  companyId?: string;
  branchId?: string | null;
  search?: string;
  assetType?: AssetType | string;
  status?: AssetStatus | string;
  department?: string;
}

export interface MaterialFilterOptions {
  companyId?: string;
  branchId?: string | null;
  search?: string;
  category?: string;
  status?: MaterialStatus | string;
}

export class InventoryRepository {
  private async getAssetRepo(): Promise<Repository<AssetModel>> {
    const dataSource = await getDataSource();
    try {
      return dataSource.getRepository(AssetModel);
    } catch {
      const meta = dataSource.entityMetadatas.find(
        m => m.name === 'AssetModel' || m.tableName === 'assets' || (typeof m.target === 'function' && m.target.name === 'AssetModel')
      );
      if (meta) {
        return dataSource.getRepository(meta.target as any);
      }
      return dataSource.getRepository('AssetModel' as any);
    }
  }

  private async getMaterialRepo(): Promise<Repository<MaterialStockModel>> {
    const dataSource = await getDataSource();
    try {
      return dataSource.getRepository(MaterialStockModel);
    } catch {
      const meta = dataSource.entityMetadatas.find(
        m => m.name === 'MaterialStockModel' || m.tableName === 'materials' || (typeof m.target === 'function' && m.target.name === 'MaterialStockModel')
      );
      if (meta) {
        return dataSource.getRepository(meta.target as any);
      }
      return dataSource.getRepository('MaterialStockModel' as any);
    }
  }

  // --- Asset Methods ---

  async findAllAssets(options: AssetFilterOptions = {}): Promise<AssetModel[]> {
    const repo = await this.getAssetRepo();
    const where: FindOptionsWhere<AssetModel> = {};

    if (options.companyId) where.companyId = options.companyId;
    if (options.branchId) where.branchId = options.branchId;
    if (options.assetType && options.assetType !== 'ALL') where.assetType = options.assetType as AssetType;
    if (options.status && options.status !== 'ALL') where.status = options.status as AssetStatus;
    if (options.department && options.department !== 'ALL') where.department = options.department;

    if (options.search && options.search.trim()) {
      const q = options.search.trim();
      return await repo.find({
        where: [
          { ...where, assetName: Like(`%${q}%`) },
          { ...where, assetId: Like(`%${q}%`) },
          { ...where, assetCode: Like(`%${q}%`) },
          { ...where, assignedTo: Like(`%${q}%`) },
          { ...where, department: Like(`%${q}%`) },
        ],
        order: { createdAt: 'DESC' }
      });
    }

    return await repo.find({ where, order: { createdAt: 'DESC' } });
  }

  async findAssetByIdOrTag(idOrTag: string): Promise<AssetModel | null> {
    const repo = await this.getAssetRepo();
    return await repo.findOne({
      where: [
        { id: idOrTag },
        { assetId: idOrTag },
        { assetCode: idOrTag }
      ]
    });
  }

  async createAsset(data: Partial<AssetModel>): Promise<AssetModel> {
    const repo = await this.getAssetRepo();
    const entity = repo.create(data);
    return await repo.save(entity);
  }

  async updateAsset(idOrTag: string, data: Partial<AssetModel>): Promise<AssetModel | null> {
    const repo = await this.getAssetRepo();
    const existing = await this.findAssetByIdOrTag(idOrTag);
    if (!existing) return null;
    Object.assign(existing, data);
    return await repo.save(existing);
  }

  async deleteAsset(idOrTag: string): Promise<boolean> {
    const repo = await this.getAssetRepo();
    const existing = await this.findAssetByIdOrTag(idOrTag);
    if (!existing) return false;
    await repo.remove(existing);
    return true;
  }

  async countAssets(where: FindOptionsWhere<AssetModel> = {}): Promise<number> {
    const repo = await this.getAssetRepo();
    return await repo.count({ where });
  }

  async getNextAssetCode(): Promise<string> {
    const repo = await this.getAssetRepo();
    const assets = await repo.find({ order: { createdAt: 'DESC' }, take: 20 });
    let maxNum = 700;
    for (const a of assets) {
      if (a.assetCode && a.assetCode.startsWith('AST-')) {
        const num = parseInt(a.assetCode.replace('AST-', ''), 10);
        if (!isNaN(num) && num > maxNum) maxNum = num;
      }
    }
    return `AST-${maxNum + 1}`;
  }

  // --- Material Methods ---

  async findAllMaterials(options: MaterialFilterOptions = {}): Promise<MaterialStockModel[]> {
    const repo = await this.getMaterialRepo();
    const where: FindOptionsWhere<MaterialStockModel> = {};

    if (options.companyId) where.companyId = options.companyId;
    if (options.branchId) where.branchId = options.branchId;
    if (options.category && options.category !== 'ALL') where.category = options.category;
    if (options.status && options.status !== 'ALL') where.status = options.status as MaterialStatus;

    if (options.search && options.search.trim()) {
      const q = options.search.trim();
      return await repo.find({
        where: [
          { ...where, materialName: Like(`%${q}%`) },
          { ...where, materialCode: Like(`%${q}%`) },
          { ...where, category: Like(`%${q}%`) },
        ],
        order: { createdAt: 'DESC' }
      });
    }

    return await repo.find({ where, order: { createdAt: 'DESC' } });
  }

  async findMaterialByIdOrCode(idOrCode: string): Promise<MaterialStockModel | null> {
    const repo = await this.getMaterialRepo();
    return await repo.findOne({
      where: [
        { id: idOrCode },
        { materialCode: idOrCode }
      ]
    });
  }

  async createMaterial(data: Partial<MaterialStockModel>): Promise<MaterialStockModel> {
    const repo = await this.getMaterialRepo();
    const entity = repo.create(data);
    return await repo.save(entity);
  }

  async updateMaterial(idOrCode: string, data: Partial<MaterialStockModel>): Promise<MaterialStockModel | null> {
    const repo = await this.getMaterialRepo();
    const existing = await this.findMaterialByIdOrCode(idOrCode);
    if (!existing) return null;

    // Recalculate status if stockLevel or reorderPoint changed
    const newStock = data.stockLevel !== undefined ? Number(data.stockLevel) : existing.stockLevel;
    const newReorder = data.reorderPoint !== undefined ? Number(data.reorderPoint) : existing.reorderPoint;
    if (data.stockLevel !== undefined || data.reorderPoint !== undefined) {
      if (newStock === 0) data.status = 'Out of Stock';
      else if (newStock <= newReorder) data.status = 'Low Stock';
      else data.status = 'In Stock';
    }

    Object.assign(existing, data);
    return await repo.save(existing);
  }

  async deleteMaterial(idOrCode: string): Promise<boolean> {
    const repo = await this.getMaterialRepo();
    const existing = await this.findMaterialByIdOrCode(idOrCode);
    if (!existing) return false;
    await repo.remove(existing);
    return true;
  }

  async countMaterials(where: FindOptionsWhere<MaterialStockModel> = {}): Promise<number> {
    const repo = await this.getMaterialRepo();
    return await repo.count({ where });
  }

  async getNextMaterialCode(): Promise<string> {
    const repo = await this.getMaterialRepo();
    const materials = await repo.find({ order: { createdAt: 'DESC' }, take: 20 });
    let maxNum = 800;
    for (const m of materials) {
      if (m.materialCode && m.materialCode.startsWith('MAT-')) {
        const num = parseInt(m.materialCode.replace('MAT-', ''), 10);
        if (!isNaN(num) && num > maxNum) maxNum = num;
      }
    }
    return `MAT-${maxNum + 1}`;
  }
}
