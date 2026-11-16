import { MilestoneRepository } from '../repositories/milestone.repository';
import { ProjectRepository } from '../repositories/project.repository';
import { MilestoneModel } from '../models/milestone.model';

export class MilestoneService {
  private milestoneRepo = new MilestoneRepository();
  private projectRepo = new ProjectRepository();

  async getMilestones(projectId?: string, companyId?: string): Promise<MilestoneModel[]> {
    if (projectId && projectId !== 'ALL') {
      let list = await this.milestoneRepo.findByProjectId(projectId);
      if (list.length === 0) {
        // Find project details to seed
        const prj = await this.projectRepo.findProjectById(projectId, companyId) || await this.projectRepo.findProjectByCode(projectId, companyId);
        list = await this.milestoneRepo.seedDefaultMilestones(projectId, prj?.projectCode || projectId, companyId || prj?.companyId);
      }
      return list;
    }

    const projects = await this.projectRepo.findAllProjects(companyId);
    let all = await this.milestoneRepo.findAll(companyId);

    // Ensure every project has milestones initialized so progress reflects accurately
    for (const p of projects) {
      const hasMilestones = all.some(m =>
        (m.projectId && (m.projectId === p.id || m.projectId === p.projectCode)) ||
        (m.projectCode && (m.projectCode === p.projectCode || m.projectCode === p.id))
      );
      if (!hasMilestones) {
        await this.milestoneRepo.seedDefaultMilestones(p.id, p.projectCode, p.companyId);
      }
    }

    all = await this.milestoneRepo.findAll(companyId);
    return all;
  }

  async getMilestoneById(id: string): Promise<MilestoneModel | null> {
    return await this.milestoneRepo.findById(id);
  }

  async createMilestone(data: {
    projectId: string;
    projectCode?: string;
    companyId?: string;
    title: string;
    description?: string;
    dueDate?: string;
    startDate?: string;
    status?: string;
    orderIndex?: number;
    deliverable?: string;
  }): Promise<MilestoneModel> {
    if (!data.projectId) {
      throw new Error('Project ID is required.');
    }
    const rawTitle = (data.title || '').trim();
    if (!rawTitle) {
      throw new Error('Milestone Title is required.');
    }
    if (rawTitle.length < 2) {
      throw new Error('Milestone Title must be at least 2 characters.');
    }
    if (rawTitle.length > 100) {
      throw new Error('Milestone Title cannot exceed 100 characters.');
    }
    if (!/[a-zA-Z]/.test(rawTitle)) {
      throw new Error('Milestone Title must contain letters and cannot be only numeric or special characters.');
    }
    if (!/^[a-zA-Z0-9\s,.'&()/#:;!?"'–—+*@_-]+$/.test(rawTitle)) {
      throw new Error('Milestone Title contains invalid characters.');
    }
    const created = await this.milestoneRepo.create({
      projectId: data.projectId,
      projectCode: data.projectCode,
      companyId: data.companyId,
      title: rawTitle,
      description: data.description?.trim(),
      dueDate: data.dueDate,
      startDate: data.startDate,
      status: data.status || 'Pending',
      orderIndex: Number(data.orderIndex) || 1,
      deliverable: data.deliverable?.trim()
    });
    await this.syncProjectProgress(data.projectId);
    return created;
  }

  async updateMilestone(id: string, updates: Partial<MilestoneModel>): Promise<MilestoneModel> {
    if (updates.title !== undefined) {
      const rawTitle = (updates.title || '').trim();
      if (!rawTitle) {
        throw new Error('Milestone Title cannot be empty.');
      }
      if (rawTitle.length < 2) {
        throw new Error('Milestone Title must be at least 2 characters.');
      }
      if (rawTitle.length > 100) {
        throw new Error('Milestone Title cannot exceed 100 characters.');
      }
      if (!/[a-zA-Z]/.test(rawTitle)) {
        throw new Error('Milestone Title must contain letters and cannot be only numeric or special characters.');
      }
      if (!/^[a-zA-Z0-9\s,.'&()/#:;!?"'–—+*@_-]+$/.test(rawTitle)) {
        throw new Error('Milestone Title contains invalid characters.');
      }
      updates.title = rawTitle;
    }
    const updated = await this.milestoneRepo.update(id, updates);
    if (updated?.projectId) {
      await this.syncProjectProgress(updated.projectId);
    }
    return updated;
  }

  async deleteMilestone(id: string): Promise<boolean> {
    const existing = await this.milestoneRepo.findById(id);
    const res = await this.milestoneRepo.delete(id);
    if (existing?.projectId) {
      await this.syncProjectProgress(existing.projectId);
    }
    return res;
  }

  private async syncProjectProgress(projectId: string): Promise<void> {
    try {
      const list = await this.milestoneRepo.findByProjectId(projectId);
      if (list && list.length > 0) {
        const completed = list.filter(m => m.status === 'Completed').length;
        const progress = Math.round((completed / list.length) * 100);
        await this.projectRepo.updateProject(projectId, { progress });
      }
    } catch (err) {
      console.warn('[MilestoneService] Sync project progress note:', err);
    }
  }
}
