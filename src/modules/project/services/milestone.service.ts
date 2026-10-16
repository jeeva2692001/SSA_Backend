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

    let all = await this.milestoneRepo.findAll(companyId);
    if (all.length === 0) {
      // Seed default milestones for existing projects
      const projects = await this.projectRepo.findAllProjects(companyId);
      for (const p of projects.slice(0, 5)) {
        await this.milestoneRepo.seedDefaultMilestones(p.id, p.projectCode, p.companyId);
      }
      all = await this.milestoneRepo.findAll(companyId);
    }
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
    if (!data.projectId || !data.title) {
      throw new Error('Project ID and Milestone Title are required.');
    }
    return await this.milestoneRepo.create({
      projectId: data.projectId,
      projectCode: data.projectCode,
      companyId: data.companyId,
      title: data.title.trim(),
      description: data.description?.trim(),
      dueDate: data.dueDate,
      startDate: data.startDate,
      status: data.status || 'Pending',
      orderIndex: Number(data.orderIndex) || 1,
      deliverable: data.deliverable?.trim()
    });
  }

  async updateMilestone(id: string, updates: Partial<MilestoneModel>): Promise<MilestoneModel> {
    return await this.milestoneRepo.update(id, updates);
  }

  async deleteMilestone(id: string): Promise<boolean> {
    return await this.milestoneRepo.delete(id);
  }
}
