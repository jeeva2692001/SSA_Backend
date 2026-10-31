import { getDataSource } from '../../../shared/config/data-source';
import { TaskModel, TaskPriority, TaskStatus } from '../models/task.model';
import { Repository, Like, FindOptionsWhere } from 'typeorm';

export interface TaskFilterOptions {
  companyId?: string;
  branchId?: string | null;
  search?: string;
  projectCode?: string;
  priority?: TaskPriority | string;
  status?: TaskStatus | string;
  assignedToId?: string;
}

export class TaskRepository {
  private async getRepo(): Promise<Repository<TaskModel>> {
    const dataSource = await getDataSource();
    try {
      return dataSource.getRepository(TaskModel);
    } catch {
      const meta = dataSource.entityMetadatas.find(
        m => m.name === 'TaskModel' || m.tableName === 'tasks' || (typeof m.target === 'function' && m.target.name === 'TaskModel')
      );
      if (meta) {
        return dataSource.getRepository(meta.target as any);
      }
      return dataSource.getRepository('TaskModel' as any);
    }
  }

  async findAll(options: TaskFilterOptions = {}): Promise<TaskModel[]> {
    const repo = await this.getRepo();
    const where: FindOptionsWhere<TaskModel> = {};

    if (options.companyId) {
      where.companyId = options.companyId;
    }
    if (options.branchId) {
      where.branchId = options.branchId;
    }
    if (options.projectCode && options.projectCode !== 'ALL') {
      where.projectCode = options.projectCode;
    }
    if (options.priority && options.priority !== 'ALL') {
      where.priority = options.priority as TaskPriority;
    }
    if (options.status && options.status !== 'ALL') {
      where.status = options.status as TaskStatus;
    }
    if (options.assignedToId && options.assignedToId !== 'ALL') {
      where.assignedToId = options.assignedToId;
    }

    if (options.search && options.search.trim()) {
      const q = options.search.trim();
      return await repo.find({
        where: [
          { ...where, taskName: Like(`%${q}%`) },
          { ...where, taskCode: Like(`%${q}%`) },
          { ...where, assignedTo: Like(`%${q}%`) },
          { ...where, projectCode: Like(`%${q}%`) },
        ],
        order: { createdAt: 'DESC' }
      });
    }

    return await repo.find({
      where,
      order: { createdAt: 'DESC' }
    });
  }

  async findByIdOrCode(idOrCode: string): Promise<TaskModel | null> {
    const repo = await this.getRepo();
    // Try matching UUID id or taskCode
    const task = await repo.findOne({
      where: [
        { id: idOrCode },
        { taskCode: idOrCode }
      ]
    });
    return task;
  }

  async create(data: Partial<TaskModel>): Promise<TaskModel> {
    const repo = await this.getRepo();
    const entity = repo.create(data);
    return await repo.save(entity);
  }

  async update(idOrCode: string, data: Partial<TaskModel>): Promise<TaskModel | null> {
    const repo = await this.getRepo();
    const existing = await this.findByIdOrCode(idOrCode);
    if (!existing) return null;

    Object.assign(existing, data);
    return await repo.save(existing);
  }

  async delete(idOrCode: string): Promise<boolean> {
    const repo = await this.getRepo();
    const existing = await this.findByIdOrCode(idOrCode);
    if (!existing) return false;

    await repo.remove(existing);
    return true;
  }

  async count(where: FindOptionsWhere<TaskModel> = {}): Promise<number> {
    const repo = await this.getRepo();
    return await repo.count({ where });
  }

  async getNextTaskCode(): Promise<string> {
    const repo = await this.getRepo();
    const tasks = await repo.find({
      order: { createdAt: 'DESC' },
      take: 20
    });

    let maxNum = 1000;
    for (const t of tasks) {
      if (t.taskCode && t.taskCode.startsWith('TSK-')) {
        const numPart = parseInt(t.taskCode.replace('TSK-', ''), 10);
        if (!isNaN(numPart) && numPart > maxNum) {
          maxNum = numPart;
        }
      }
    }
    return `TSK-${maxNum + 1}`;
  }
}
