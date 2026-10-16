import { getDataSource } from '../../../shared/config/data-source';
import { InvoiceModel } from '../models/invoice.model';
import { Repository } from 'typeorm';

export class InvoiceRepository {
  private async getRepo(): Promise<Repository<InvoiceModel>> {
    const ds = await getDataSource();
    return ds.getRepository(InvoiceModel);
  }

  async findAll(companyId?: string, branchId?: string | null): Promise<InvoiceModel[]> {
    const repo = await this.getRepo();
    const where: any = {};
    if (companyId) where.companyId = companyId;
    if (branchId) where.branchId = branchId;
    return await repo.find({ where, order: { issueDate: 'DESC' } });
  }

  async findById(id: string): Promise<InvoiceModel | null> {
    const repo = await this.getRepo();
    return await repo.findOne({ where: { id } });
  }

  async findByInvoiceNumber(invoiceNumber: string): Promise<InvoiceModel | null> {
    const repo = await this.getRepo();
    return await repo.findOne({ where: { invoiceNumber } });
  }

  async create(data: Partial<InvoiceModel>): Promise<InvoiceModel> {
    const repo = await this.getRepo();
    const entity = repo.create(data);
    return await repo.save(entity);
  }

  async save(entity: InvoiceModel): Promise<InvoiceModel> {
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
