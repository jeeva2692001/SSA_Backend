import { getDataSource } from '../../../shared/config/data-source';
import { RolePermissionModel } from '../models/role-permission.model';
import { Repository, ILike } from 'typeorm';

export class RolePermissionRepository {
  private async getRepository(): Promise<Repository<RolePermissionModel>> {
    const dataSource = await getDataSource();
    return dataSource.getRepository(RolePermissionModel);
  }

  async findAll(companyId?: string): Promise<RolePermissionModel[]> {
    const repo = await this.getRepository();
    const where: any = {};
    if (companyId) {
      where.companyId = companyId;
    }
    return await repo.find({ where, order: { id: 'ASC' } });
  }

  async findByRole(role: string, companyId?: string): Promise<RolePermissionModel | null> {
    const repo = await this.getRepository();
    const where: any = { role: ILike(role.trim()) };
    if (companyId) {
      where.companyId = companyId;
    }
    return await repo.findOne({ where });
  }

  async create(data: Partial<RolePermissionModel>): Promise<RolePermissionModel> {
    const repo = await this.getRepository();
    const entity = repo.create(data);
    return await repo.save(entity);
  }

  async save(entity: RolePermissionModel): Promise<RolePermissionModel> {
    const repo = await this.getRepository();
    return await repo.save(entity);
  }

  async deleteByRole(role: string, companyId?: string): Promise<boolean> {
    const repo = await this.getRepository();
    const where: any = { role: role.trim() };
    if (companyId) {
      where.companyId = companyId;
    }
    const result = await repo.delete(where);
    return (result.affected ?? 0) > 0;
  }

  async count(companyId?: string): Promise<number> {
    const repo = await this.getRepository();
    const where: any = {};
    if (companyId) {
      where.companyId = companyId;
    }
    return await repo.count({ where });
  }
}
