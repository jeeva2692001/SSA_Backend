import { getDataSource } from '../../../shared/config/data-source';
import { RolePermissionModel } from '../models/role-permission.model';
import { Repository, ILike } from 'typeorm';

export class RolePermissionRepository {
  private async getRepository(): Promise<Repository<RolePermissionModel>> {
    const dataSource = await getDataSource();
    return dataSource.getRepository(RolePermissionModel);
  }

  async findAll(): Promise<RolePermissionModel[]> {
    const repo = await this.getRepository();
    return await repo.find({ order: { id: 'ASC' } });
  }

  async findByRole(role: string): Promise<RolePermissionModel | null> {
    const repo = await this.getRepository();
    return await repo.findOne({ where: { role: ILike(role.trim()) } });
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

  async deleteByRole(role: string): Promise<boolean> {
    const repo = await this.getRepository();
    const result = await repo.delete({ role });
    return (result.affected ?? 0) > 0;
  }

  async count(): Promise<number> {
    const repo = await this.getRepository();
    return await repo.count();
  }
}
