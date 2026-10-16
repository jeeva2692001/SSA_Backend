import { Repository } from 'typeorm';
import { AppDataSource } from '../../../shared/config/data-source';
import { MilestoneModel } from '../models/milestone.model';

export class MilestoneRepository {
  private repo(): Repository<MilestoneModel> {
    return AppDataSource.getRepository(MilestoneModel);
  }

  async findByProjectId(projectId: string): Promise<MilestoneModel[]> {
    return await this.repo().find({
      where: [{ projectId }, { projectCode: projectId }],
      order: { orderIndex: 'ASC', createdAt: 'ASC' }
    });
  }

  async findAll(companyId?: string): Promise<MilestoneModel[]> {
    if (companyId) {
      return await this.repo()
        .createQueryBuilder('m')
        .where('m.companyId = :cId OR m.companyId IS NULL', { cId: companyId })
        .orderBy('m.orderIndex', 'ASC')
        .addOrderBy('m.createdAt', 'ASC')
        .getMany();
    }
    return await this.repo().find({
      order: { orderIndex: 'ASC', createdAt: 'ASC' }
    });
  }

  async findById(id: string): Promise<MilestoneModel | null> {
    return await this.repo().findOne({ where: { id } });
  }

  async create(data: Partial<MilestoneModel>): Promise<MilestoneModel> {
    const entity = this.repo().create(data);
    return await this.repo().save(entity);
  }

  async update(id: string, updates: Partial<MilestoneModel>): Promise<MilestoneModel> {
    await this.repo().update(id, updates);
    const updated = await this.repo().findOne({ where: { id } });
    if (!updated) throw new Error(`Milestone ${id} not found.`);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const res = await this.repo().delete(id);
    return (res.affected || 0) > 0;
  }

  async seedDefaultMilestones(projectId: string, projectCode?: string, companyId?: string): Promise<MilestoneModel[]> {
    const existing = await this.findByProjectId(projectId);
    if (existing.length > 0) return existing;

    const defaults: Partial<MilestoneModel>[] = [
      {
        projectId,
        projectCode,
        companyId,
        title: 'Pre Design & Zoning Feasibility Sign-off',
        description: 'Verify land zoning constraints, site parameters, and architectural bylaws.',
        dueDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
        status: 'Completed',
        orderIndex: 1,
        deliverable: 'Site Feasibility & Bylaws Report'
      },
      {
        projectId,
        projectCode,
        companyId,
        title: 'Concept & Schematic Design Presentation',
        description: 'Secure conceptual spatial planning and aesthetic walkthrough consent with Client.',
        dueDate: new Date(Date.now() + 35 * 86400000).toISOString().split('T')[0],
        status: 'In Progress',
        orderIndex: 2,
        deliverable: '3D Enscape Walkthrough & Schematic Plans'
      },
      {
        projectId,
        projectCode,
        companyId,
        title: 'Design Development & Authority Approvals (Statutory)',
        description: 'Submit drawings for local municipal clearances, fire NOC, and structural sanity checks.',
        dueDate: new Date(Date.now() + 60 * 86400000).toISOString().split('T')[0],
        status: 'Pending',
        orderIndex: 3,
        deliverable: 'Municipal Sanction Drawing Sets'
      },
      {
        projectId,
        projectCode,
        companyId,
        title: 'Good For Construction Drawings (GFC) Issue',
        description: 'Release fully verified structural, architectural, and MEP working drawings to site contractors.',
        dueDate: new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0],
        status: 'Pending',
        orderIndex: 4,
        deliverable: 'Complete GFC Drawing Register'
      }
    ];

    const created: MilestoneModel[] = [];
    for (const d of defaults) {
      const m = await this.create(d);
      created.push(m);
    }
    return created;
  }
}
