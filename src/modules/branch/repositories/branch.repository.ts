import { getDataSource } from '../../../shared/config/data-source';
import { BranchModel } from '../models/branch.model';
import { Repository } from 'typeorm';

export class BranchRepository {
  private async getRepository(): Promise<Repository<BranchModel>> {
    const dataSource = await getDataSource();
    return dataSource.getRepository(BranchModel);
  }

  async findAllByCompanyId(companyId: string): Promise<BranchModel[]> {
    const repo = await this.getRepository();
    return await repo.find({ where: { companyId }, order: { id: 'ASC' } });
  }

  async findByBranchId(branchId: string): Promise<BranchModel | null> {
    const repo = await this.getRepository();
    return await repo.findOne({ where: { branchId } });
  }

  async findByCodeAndCompanyId(code: string, companyId: string): Promise<BranchModel | null> {
    const repo = await this.getRepository();
    return await repo.findOne({ where: { code, companyId } });
  }

  async createBranch(branchData: Partial<BranchModel>): Promise<BranchModel> {
    const repo = await this.getRepository();
    const branch = repo.create(branchData);
    return await repo.save(branch);
  }

  async countBranchesByCompanyId(companyId: string): Promise<number> {
    const repo = await this.getRepository();
    return await repo.count({ where: { companyId } });
  }

  async deleteByBranchId(branchId: string, companyId: string): Promise<boolean> {
    const repo = await this.getRepository();
    const result = await repo.delete({ branchId, companyId });
    return (result.affected ?? 0) > 0;
  }
}
