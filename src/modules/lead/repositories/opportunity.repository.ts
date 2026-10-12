import { getDataSource } from '../../../shared/config/data-source';
import { OpportunityModel } from '../models/opportunity.model';
import { Repository } from 'typeorm';

export class OpportunityRepository {
  private async getRepo(): Promise<Repository<OpportunityModel>> {
    const ds = await getDataSource();
    return ds.getRepository(OpportunityModel);
  }

  async findAll(companyId?: string, branchId?: string | null): Promise<OpportunityModel[]> {
    const repo = await this.getRepo();
    if (!companyId && !branchId) {
      return await repo.find({ order: { createdAt: 'DESC' } });
    }
    const qb = repo.createQueryBuilder('opp').orderBy('opp.createdAt', 'DESC');
    if (companyId) {
      qb.andWhere('(opp.companyId = :companyId OR opp.companyId IS NULL OR opp.companyId = :defCom)', {
        companyId,
        defCom: 'COM-001'
      });
    }
    if (branchId) {
      qb.andWhere('opp.branchId = :branchId', { branchId });
    }
    return await qb.getMany();
  }

  async findById(id: string): Promise<OpportunityModel | null> {
    const repo = await this.getRepo();
    return await repo.findOne({ where: { id } });
  }

  async findByDealId(dealId: string): Promise<OpportunityModel | null> {
    const repo = await this.getRepo();
    return await repo.findOne({ where: { dealId } });
  }

  async create(data: Partial<OpportunityModel>): Promise<OpportunityModel> {
    const repo = await this.getRepo();
    const entity = repo.create(data);
    return await repo.save(entity);
  }

  async save(entity: OpportunityModel): Promise<OpportunityModel> {
    const repo = await this.getRepo();
    return await repo.save(entity);
  }

  async delete(id: string): Promise<boolean> {
    const repo = await this.getRepo();
    const res = await repo.delete(id);
    return (res.affected ?? 0) > 0;
  }

  async count(companyId?: string): Promise<number> {
    const repo = await this.getRepo();
    const where: any = {};
    if (companyId) where.companyId = companyId;
    return await repo.count({ where });
  }
}
