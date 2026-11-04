import { getDataSource } from '../../../shared/config/data-source';
import { VendorModel, VendorCategory, VendorApprovalStatus } from '../models/vendor.model';
import { Repository, Like, FindOptionsWhere } from 'typeorm';

export interface VendorFilterOptions {
  companyId?: string;
  branchId?: string | null;
  search?: string;
  category?: VendorCategory | string;
  approvalStatus?: VendorApprovalStatus | string;
}

export class VendorRepository {
  private async getRepo(): Promise<Repository<VendorModel>> {
    const dataSource = await getDataSource();
    try {
      return dataSource.getRepository(VendorModel);
    } catch {
      const meta = dataSource.entityMetadatas.find(
        m => m.name === 'VendorModel' || m.tableName === 'vendors' || (typeof m.target === 'function' && m.target.name === 'VendorModel')
      );
      if (meta) {
        return dataSource.getRepository(meta.target as any);
      }
      return dataSource.getRepository('VendorModel' as any);
    }
  }

  async findAll(options: VendorFilterOptions = {}): Promise<VendorModel[]> {
    const repo = await this.getRepo();
    const where: FindOptionsWhere<VendorModel> = {};

    if (options.companyId) {
      where.companyId = options.companyId;
    }
    if (options.branchId) {
      where.branchId = options.branchId;
    }
    if (options.category && options.category !== 'ALL') {
      where.category = options.category as VendorCategory;
    }
    if (options.approvalStatus && options.approvalStatus !== 'ALL') {
      where.approvalStatus = options.approvalStatus as VendorApprovalStatus;
    }

    if (options.search && options.search.trim()) {
      const q = options.search.trim();
      return await repo.find({
        where: [
          { ...where, vendorName: Like(`%${q}%`) },
          { ...where, vendorCode: Like(`%${q}%`) },
          { ...where, contactPerson: Like(`%${q}%`) },
          { ...where, tradeSpecialty: Like(`%${q}%`) },
          { ...where, email: Like(`%${q}%`) },
          { ...where, mobile: Like(`%${q}%`) },
        ],
        order: { createdAt: 'DESC' }
      });
    }

    return await repo.find({
      where,
      order: { createdAt: 'DESC' }
    });
  }

  async findById(id: string): Promise<VendorModel | null> {
    const repo = await this.getRepo();
    return await repo.findOne({ where: { id } });
  }

  async findByCode(vendorCode: string): Promise<VendorModel | null> {
    const repo = await this.getRepo();
    return await repo.findOne({ where: { vendorCode } });
  }

  async findByIdOrCode(idOrCode: string): Promise<VendorModel | null> {
    const repo = await this.getRepo();
    return await repo.findOne({
      where: [
        { id: idOrCode },
        { vendorCode: idOrCode }
      ]
    });
  }

  async create(data: Partial<VendorModel>): Promise<VendorModel> {
    const repo = await this.getRepo();
    const entity = repo.create(data);
    return await repo.save(entity);
  }

  async save(entity: VendorModel): Promise<VendorModel> {
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
    const where: FindOptionsWhere<VendorModel> = {};
    if (companyId) {
      where.companyId = companyId;
    }
    return await repo.count({ where });
  }

  async getNextVendorCode(_companyId?: string): Promise<string> {
    const repo = await this.getRepo();
    const year = new Date().getFullYear();
    const prefix = `VEN-${year}-`;

    const allVendors = await repo.find({
      select: ['vendorCode'] as any
    });

    const existingCodes = new Set<string>();
    let maxSeq = 0;
    const seqRegex = new RegExp(`^VEN-${year}-(\\d+)$`, 'i');

    for (const v of allVendors) {
      if (!v.vendorCode) continue;
      const codeUpper = v.vendorCode.trim().toUpperCase();
      existingCodes.add(codeUpper);

      const match = codeUpper.match(seqRegex);
      if (match) {
        const seq = parseInt(match[1], 10);
        if (!isNaN(seq) && seq > maxSeq) {
          maxSeq = seq;
        }
      }
    }

    let nextSeq = maxSeq + 1;
    let candidate = `${prefix}${String(nextSeq).padStart(3, '0')}`;

    while (existingCodes.has(candidate.toUpperCase())) {
      nextSeq++;
      candidate = `${prefix}${String(nextSeq).padStart(3, '0')}`;
    }

    while (await repo.findOne({ where: { vendorCode: candidate } })) {
      existingCodes.add(candidate.toUpperCase());
      nextSeq++;
      candidate = `${prefix}${String(nextSeq).padStart(3, '0')}`;
    }

    return candidate;
  }
}
