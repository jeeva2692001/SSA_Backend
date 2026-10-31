import { getDataSource } from '../../../shared/config/data-source';
import { EquipmentModel, EquipmentCategory, EquipmentStatus } from '../models/equipment.model';
import { Repository, Like, FindOptionsWhere } from 'typeorm';

export interface EquipmentFilterOptions {
  companyId?: string;
  branchId?: string | null;
  search?: string;
  category?: EquipmentCategory | string;
  status?: EquipmentStatus | string;
  assignedProjectId?: string;
}

export class EquipmentRepository {
  private async getRepo(): Promise<Repository<EquipmentModel>> {
    const dataSource = await getDataSource();
    try {
      return dataSource.getRepository(EquipmentModel);
    } catch {
      const meta = dataSource.entityMetadatas.find(
        m => m.name === 'EquipmentModel' || m.tableName === 'equipment' || (typeof m.target === 'function' && m.target.name === 'EquipmentModel')
      );
      if (meta) {
        return dataSource.getRepository(meta.target as any);
      }
      return dataSource.getRepository('EquipmentModel' as any);
    }
  }

  async findAll(options: EquipmentFilterOptions = {}): Promise<EquipmentModel[]> {
    const repo = await this.getRepo();
    const where: FindOptionsWhere<EquipmentModel> = {};

    if (options.companyId) {
      where.companyId = options.companyId;
    }
    if (options.branchId) {
      where.branchId = options.branchId;
    }
    if (options.category && options.category !== 'ALL') {
      where.category = options.category as EquipmentCategory;
    }
    if (options.status && options.status !== 'ALL') {
      where.status = options.status as EquipmentStatus;
    }
    if (options.assignedProjectId && options.assignedProjectId !== 'ALL') {
      where.assignedProjectId = options.assignedProjectId;
    }

    if (options.search && options.search.trim()) {
      const q = options.search.trim();
      return await repo.find({
        where: [
          { ...where, name: Like(`%${q}%`) },
          { ...where, equipmentCode: Like(`%${q}%`) },
          { ...where, modelNumber: Like(`%${q}%`) },
          { ...where, serialNumber: Like(`%${q}%`) },
          { ...where, assignedProjectName: Like(`%${q}%`) },
          { ...where, assignedEmployeeName: Like(`%${q}%`) },
          { ...where, location: Like(`%${q}%`) },
        ],
        order: { equipmentCode: 'ASC' }
      });
    }

    return await repo.find({
      where,
      order: { equipmentCode: 'ASC' }
    });
  }

  async findByIdOrCode(idOrCode: string): Promise<EquipmentModel | null> {
    const repo = await this.getRepo();
    let equipment = await repo.findOne({ where: { equipmentCode: idOrCode } });
    if (!equipment) {
      equipment = await repo.findOne({ where: { id: idOrCode } });
    }
    return equipment;
  }

  async create(data: Partial<EquipmentModel>): Promise<EquipmentModel> {
    const repo = await this.getRepo();
    const entity = repo.create(data);
    return await repo.save(entity);
  }

  async update(idOrCode: string, data: Partial<EquipmentModel>): Promise<EquipmentModel | null> {
    const repo = await this.getRepo();
    const equipment = await this.findByIdOrCode(idOrCode);
    if (!equipment) return null;

    Object.assign(equipment, data);
    return await repo.save(equipment);
  }

  async delete(idOrCode: string): Promise<boolean> {
    const repo = await this.getRepo();
    const equipment = await this.findByIdOrCode(idOrCode);
    if (!equipment) return false;

    await repo.remove(equipment);
    return true;
  }

  async getNextEquipmentCode(companyId: string = 'COM-001'): Promise<string> {
    const repo = await this.getRepo();
    const count = await repo.count({ where: { companyId } });
    const nextSeq = count + 1;
    return `EQP-${String(nextSeq).padStart(3, '0')}`;
  }

  async count(options: { companyId?: string; status?: EquipmentStatus } = {}): Promise<number> {
    const repo = await this.getRepo();
    const where: FindOptionsWhere<EquipmentModel> = {};
    if (options.companyId) where.companyId = options.companyId;
    if (options.status) where.status = options.status;
    return await repo.count({ where });
  }
}
