import { getDataSource } from '../../../shared/config/data-source';
import { DepartmentModel } from '../models/department.model';
import { Repository, ILike } from 'typeorm';

export class DepartmentRepository {
  private async getRepository(): Promise<Repository<DepartmentModel>> {
    const dataSource = await getDataSource();
    return dataSource.getRepository(DepartmentModel);
  }

  async findAll(companyId?: string): Promise<DepartmentModel[]> {
    const repo = await this.getRepository();
    if (companyId) {
      return await repo.find({ where: { companyId }, order: { id: 'ASC' } });
    }
    return await repo.find({ order: { id: 'ASC' } });
  }

  async findByDepartmentId(departmentId: string): Promise<DepartmentModel | null> {
    const repo = await this.getRepository();
    return await repo.findOne({ where: { departmentId: departmentId.trim() } });
  }

  async findByName(name: string, companyId?: string): Promise<DepartmentModel | null> {
    const repo = await this.getRepository();
    const where: any = { name: ILike(name.trim()) };
    if (companyId) where.companyId = companyId;
    return await repo.findOne({ where });
  }

  async findByCode(code: string, companyId?: string): Promise<DepartmentModel | null> {
    const repo = await this.getRepository();
    const where: any = { code: ILike(code.trim()) };
    if (companyId) where.companyId = companyId;
    return await repo.findOne({ where });
  }

  async create(data: Partial<DepartmentModel>): Promise<DepartmentModel> {
    const repo = await this.getRepository();
    const entity = repo.create(data);
    return await repo.save(entity);
  }

  async save(entity: DepartmentModel): Promise<DepartmentModel> {
    const repo = await this.getRepository();
    return await repo.save(entity);
  }

  async delete(departmentId: string): Promise<boolean> {
    const repo = await this.getRepository();
    const result = await repo.delete({ departmentId: departmentId.trim() });
    return (result.affected ?? 0) > 0;
  }

  async count(companyId?: string): Promise<number> {
    const repo = await this.getRepository();
    if (companyId) {
      return await repo.count({ where: { companyId } });
    }
    return await repo.count();
  }

  async getNextDepartmentId(): Promise<string> {
    const repo = await this.getRepository();
    const all = await repo.find();
    let maxNum = 0;
    for (const d of all) {
      const match = d.departmentId?.match(/^DEPT-(\d+)$/i);
      if (match) {
        const n = parseInt(match[1], 10);
        if (n > maxNum) maxNum = n;
      }
    }
    return `DEPT-${String(maxNum + 1).padStart(3, '0')}`;
  }
}
