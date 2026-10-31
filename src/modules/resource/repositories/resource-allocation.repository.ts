import { getDataSource } from '../../../shared/config/data-source';
import { ResourceAllocationModel, ResourceType, AllocationStatus } from '../models/resource-allocation.model';
import { Repository, Like, FindOptionsWhere } from 'typeorm';

export interface AllocationFilterOptions {
  companyId?: string;
  branchId?: string | null;
  search?: string;
  resourceType?: ResourceType | string;
  projectId?: string;
  projectCode?: string;
  resourceId?: string;
  status?: AllocationStatus | string;
}

export class ResourceAllocationRepository {
  private async getRepo(): Promise<Repository<ResourceAllocationModel>> {
    const dataSource = await getDataSource();
    try {
      return dataSource.getRepository(ResourceAllocationModel);
    } catch {
      const meta = dataSource.entityMetadatas.find(
        m => m.name === 'ResourceAllocationModel' || m.tableName === 'resource_allocations' || (typeof m.target === 'function' && m.target.name === 'ResourceAllocationModel')
      );
      if (meta) {
        return dataSource.getRepository(meta.target as any);
      }
      return dataSource.getRepository('ResourceAllocationModel' as any);
    }
  }

  async findAll(options: AllocationFilterOptions = {}): Promise<ResourceAllocationModel[]> {
    const repo = await this.getRepo();
    const where: FindOptionsWhere<ResourceAllocationModel> = {};

    if (options.companyId) {
      where.companyId = options.companyId;
    }
    if (options.branchId) {
      where.branchId = options.branchId;
    }
    if (options.resourceType && options.resourceType !== 'ALL') {
      where.resourceType = options.resourceType as ResourceType;
    }
    if (options.projectId && options.projectId !== 'ALL') {
      where.projectId = options.projectId;
    }
    if (options.projectCode && options.projectCode !== 'ALL') {
      where.projectCode = options.projectCode;
    }
    if (options.resourceId && options.resourceId !== 'ALL') {
      where.resourceId = options.resourceId;
    }
    if (options.status && options.status !== 'ALL') {
      where.status = options.status as AllocationStatus;
    }

    if (options.search && options.search.trim()) {
      const q = options.search.trim();
      return await repo.find({
        where: [
          { ...where, resourceName: Like(`%${q}%`) },
          { ...where, projectName: Like(`%${q}%`) },
          { ...where, projectCode: Like(`%${q}%`) },
          { ...where, allocationCode: Like(`%${q}%`) },
          { ...where, roleOrCategory: Like(`%${q}%`) },
        ],
        order: { createdAt: 'DESC' }
      });
    }

    return await repo.find({
      where,
      order: { createdAt: 'DESC' }
    });
  }

  async findByIdOrCode(idOrCode: string): Promise<ResourceAllocationModel | null> {
    const repo = await this.getRepo();
    let alloc = await repo.findOne({ where: { allocationCode: idOrCode } });
    if (!alloc) {
      alloc = await repo.findOne({ where: { id: idOrCode } });
    }
    return alloc;
  }

  async create(data: Partial<ResourceAllocationModel>): Promise<ResourceAllocationModel> {
    const repo = await this.getRepo();
    const entity = repo.create(data);
    return await repo.save(entity);
  }

  async update(idOrCode: string, data: Partial<ResourceAllocationModel>): Promise<ResourceAllocationModel | null> {
    const repo = await this.getRepo();
    const alloc = await this.findByIdOrCode(idOrCode);
    if (!alloc) return null;

    Object.assign(alloc, data);
    return await repo.save(alloc);
  }

  async delete(idOrCode: string): Promise<boolean> {
    const repo = await this.getRepo();
    const alloc = await this.findByIdOrCode(idOrCode);
    if (!alloc) return false;

    await repo.remove(alloc);
    return true;
  }

  async getNextAllocationCode(companyId: string = 'COM-001'): Promise<string> {
    const repo = await this.getRepo();
    const count = await repo.count({ where: { companyId } });
    const nextSeq = count + 101;
    return `AL-${nextSeq}`;
  }

  async count(options: { companyId?: string; status?: AllocationStatus } = {}): Promise<number> {
    const repo = await this.getRepo();
    const where: FindOptionsWhere<ResourceAllocationModel> = {};
    if (options.companyId) where.companyId = options.companyId;
    if (options.status) where.status = options.status;
    return await repo.count({ where });
  }
}
