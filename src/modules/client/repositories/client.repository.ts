import { getDataSource } from '../../../shared/config/data-source';
import { ClientModel } from '../models/client.model';
import { LeadModel } from '../../lead/models/lead.model';
import { ProjectModel } from '../../project/models/project.model';
import { Repository, Like, FindOptionsWhere } from 'typeorm';

export class ClientRepository {
  private async getClientRepo(): Promise<Repository<ClientModel>> {
    const dataSource = await getDataSource();
    return dataSource.getRepository(ClientModel);
  }

  private async getLeadRepo(): Promise<Repository<LeadModel>> {
    const dataSource = await getDataSource();
    return dataSource.getRepository(LeadModel);
  }

  private async getProjectRepo(): Promise<Repository<ProjectModel>> {
    const dataSource = await getDataSource();
    return dataSource.getRepository(ProjectModel);
  }

  async findAll(companyId?: string, branchId?: string | null, search?: string): Promise<ClientModel[]> {
    const repo = await this.getClientRepo();
    const qb = repo.createQueryBuilder('client').orderBy('client.createdAt', 'DESC');

    if (companyId) {
      qb.andWhere('(client.companyId = :companyId OR client.companyId IS NULL OR client.companyId = :defCom)', {
        companyId,
        defCom: 'COM-001'
      });
    }

    if (branchId) {
      qb.andWhere('(client.branchId = :branchId OR client.branchId IS NULL OR client.branchId = \'\')', { branchId });
    }

    if (search && search.trim()) {
      const q = `%${search.trim()}%`;
      qb.andWhere(
        '(client.clientName ILIKE :q OR client.company ILIKE :q OR client.clientCode ILIKE :q OR client.contactPerson ILIKE :q OR client.email ILIKE :q OR client.mobile ILIKE :q)',
        { q }
      );
    }

    return await qb.getMany();
  }

  async findById(id: string): Promise<ClientModel | null> {
    const repo = await this.getClientRepo();
    return await repo.findOne({ where: { id } });
  }

  async findByCode(clientCode: string): Promise<ClientModel | null> {
    const repo = await this.getClientRepo();
    return await repo.findOne({ where: { clientCode } });
  }

  async findByMobile(mobile: string, companyId?: string): Promise<ClientModel | null> {
    const repo = await this.getClientRepo();
    const cleanMobile = mobile.replace(/[\s\-+]/g, '');
    const qb = repo.createQueryBuilder('client');
    if (companyId) {
      qb.where('client.companyId = :companyId', { companyId });
      qb.andWhere(
        '(client.mobile = :mobile OR regexp_replace(COALESCE(client.mobile, \'\'), \'[^0-9]\', \'\', \'g\') = :cleanMobile)',
        { mobile: mobile.trim(), cleanMobile }
      );
    } else {
      qb.where(
        '(client.mobile = :mobile OR regexp_replace(COALESCE(client.mobile, \'\'), \'[^0-9]\', \'\', \'g\') = :cleanMobile)',
        { mobile: mobile.trim(), cleanMobile }
      );
    }
    return await qb.getOne();
  }

  async findByEmail(email: string, companyId?: string): Promise<ClientModel | null> {
    const repo = await this.getClientRepo();
    const qb = repo
      .createQueryBuilder('client')
      .where('LOWER(TRIM(client.email)) = LOWER(TRIM(:email))', { email });

    if (companyId) {
      qb.andWhere('client.companyId = :companyId', { companyId });
    }

    return await qb.getOne();
  }

  async countClients(companyId?: string): Promise<number> {
    const repo = await this.getClientRepo();
    if (companyId) {
      return await repo.count({ where: { companyId } });
    }
    return await repo.count();
  }

  async getNextClientCode(year: number = new Date().getFullYear()): Promise<string> {
    const repo = await this.getClientRepo();
    const prefix = `CL-${year}-`;
    const clients = await repo.find({ select: { clientCode: true } });

    let maxSeq = 0;
    for (const c of clients) {
      const code = c.clientCode || '';
      if (code.startsWith(prefix)) {
        const parts = code.split('-');
        if (parts.length >= 3) {
          const seqNum = parseInt(parts[2], 10);
          if (!isNaN(seqNum) && seqNum > maxSeq) {
            maxSeq = seqNum;
          }
        }
      } else {
        const match = code.match(/CL-(\d+)$/i);
        if (match) {
          const seqNum = parseInt(match[1], 10);
          if (!isNaN(seqNum) && seqNum > maxSeq) {
            maxSeq = seqNum;
          }
        }
      }
    }

    let nextSeq = maxSeq + 1;
    let candidate = `CL-${year}-${String(nextSeq).padStart(3, '0')}`;
    while (await repo.findOne({ where: { clientCode: candidate } })) {
      nextSeq++;
      candidate = `CL-${year}-${String(nextSeq).padStart(3, '0')}`;
    }
    return candidate;
  }

  async create(data: Partial<ClientModel>): Promise<ClientModel> {
    const repo = await this.getClientRepo();
    const client = repo.create(data);
    return await repo.save(client);
  }

  async update(id: string, data: Partial<ClientModel>): Promise<ClientModel | null> {
    const repo = await this.getClientRepo();
    await repo.update(id, data);
    return await this.findById(id);
  }

  async delete(id: string): Promise<boolean> {
    const repo = await this.getClientRepo();
    const res = await repo.delete(id);
    return (res.affected ?? 0) > 0;
  }

  // Relations: Leads for a client
  async findLeadsByClientId(clientId: string, clientName?: string): Promise<LeadModel[]> {
    const repo = await this.getLeadRepo();
    const query = repo.createQueryBuilder('lead')
      .leftJoinAndSelect('lead.category', 'category')
      .where('lead.clientId = :clientId', { clientId });

    if (clientName && clientName.trim()) {
      query.orWhere('(lead.clientId IS NULL AND LOWER(TRIM(lead.clientName)) = LOWER(TRIM(:clientName)))', { clientName: clientName.trim() });
    }

    return await query.orderBy('lead.createdAt', 'DESC').getMany();
  }

  // Relations: Projects for a client
  async findProjectsByClientId(clientId: string, clientName?: string): Promise<ProjectModel[]> {
    const repo = await this.getProjectRepo();
    const query = repo.createQueryBuilder('project')
      .where('project.clientId = :clientId', { clientId });

    if (clientName && clientName.trim()) {
      query.orWhere('(project.clientId IS NULL AND LOWER(TRIM(project.clientName)) = LOWER(TRIM(:clientName)))', { clientName: clientName.trim() });
    }

    return await query.orderBy('project.createdAt', 'DESC').getMany();
  }
}
