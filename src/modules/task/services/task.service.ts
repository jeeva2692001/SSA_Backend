import { TaskRepository, TaskFilterOptions } from '../repositories/task.repository';
import { TaskModel, TaskPriority, TaskStatus } from '../models/task.model';

export const INITIAL_SEEDED_TASKS: Array<Partial<TaskModel>> = [
  {
    taskCode: 'TSK-1001',
    taskName: 'Prepare Schematic Site Plan',
    assignedTo: 'Subash',
    assignedToId: 'EMP-003',
    priority: 'High',
    startDate: '2026-06-15',
    dueDate: '2026-06-20',
    status: 'In Progress',
    progress: 60,
    projectCode: 'SSA-CH-GR01',
    companyId: 'COM-001',
    description: 'Prepare detailed schematic site layout including parking, setback, and landscape zoning.'
  },
  {
    taskCode: 'TSK-1002',
    taskName: 'Design Review for Lift Core MEP Coordinates',
    assignedTo: 'Duraisamy',
    assignedToId: 'EMP-009',
    priority: 'High',
    startDate: '2026-06-18',
    dueDate: '2026-06-22',
    status: 'Under Review',
    progress: 90,
    projectCode: 'SSA-BLR-FH02',
    companyId: 'COM-001',
    description: 'Coordinate structural shear wall openings with MEP wet riser and fire duct routings.'
  },
  {
    taskCode: 'TSK-1003',
    taskName: 'BIM Model Update - Rev 2',
    assignedTo: 'Pavithra',
    assignedToId: 'EMP-006',
    priority: 'Medium',
    startDate: '2026-06-10',
    dueDate: '2026-06-18',
    status: 'Done',
    progress: 100,
    projectCode: 'SSA-CH-GR01',
    companyId: 'COM-001',
    description: 'Incorporate clash resolution changes into central Revit model revision 2.'
  },
  {
    taskCode: 'TSK-1004',
    taskName: 'Client Brief Compilation',
    assignedTo: 'Umamageshwari',
    assignedToId: 'EMP-010',
    priority: 'Low',
    startDate: '2026-06-17',
    dueDate: '2026-06-25',
    status: 'Backlog',
    progress: 0,
    projectCode: 'SSA-MUM-ZS03',
    companyId: 'COM-001',
    description: 'Compile client design brief requirements and area schedule for Zoya Office Complex.'
  },
  {
    taskCode: 'TSK-1005',
    taskName: 'Foundation Site Inspection Report',
    assignedTo: 'Suresh Kumar K',
    assignedToId: 'EMP-017',
    priority: 'High',
    startDate: '2026-06-12',
    dueDate: '2026-06-17',
    status: 'Done',
    progress: 100,
    projectCode: 'SSA-CH-GR01',
    companyId: 'COM-001',
    description: 'Verify raft reinforcement, concrete test cube reports, and shuttering alignment.'
  },
  {
    taskCode: 'TSK-1006',
    taskName: 'Facade Detail Renderings',
    assignedTo: 'Lavanya',
    assignedToId: 'EMP-007',
    priority: 'Medium',
    startDate: '2026-06-20',
    dueDate: '2026-06-28',
    status: 'Backlog',
    progress: 10,
    projectCode: 'SSA-MUM-ZS03',
    companyId: 'COM-001',
    description: 'Produce high-resolution 3D perspective daylight renderings for curtain wall facade.'
  },
  {
    taskCode: 'TSK-1007',
    taskName: 'Tender Drawing Checklist Check',
    assignedTo: 'Haran',
    assignedToId: 'EMP-004',
    priority: 'High',
    startDate: '2026-06-21',
    dueDate: '2026-06-26',
    status: 'In Progress',
    progress: 30,
    projectCode: 'SSA-BLR-FH02',
    companyId: 'COM-001',
    description: 'Audit tender drawing set against standard architectural quality control checklist.'
  }
];

export class TaskService {
  private taskRepo: TaskRepository;

  constructor() {
    this.taskRepo = new TaskRepository();
  }

  async ensureSeeded(_companyId: string = 'COM-001'): Promise<void> {
    // Dummy seeding disabled to keep tasks clean and user-driven
    return;
  }

  async getAllTasks(
    context: { companyId?: string; branchId?: string | null; role?: string },
    options: {
      search?: string;
      projectCode?: string;
      priority?: string;
      status?: string;
      assignedToId?: string;
    } = {}
  ): Promise<TaskModel[]> {
    const companyId = context.companyId || 'COM-001';

    const filterOptions: TaskFilterOptions = {
      companyId,
      branchId: context.branchId ? context.branchId : undefined,
      search: options.search,
      projectCode: options.projectCode,
      priority: options.priority,
      status: options.status,
      assignedToId: options.assignedToId
    };

    return await this.taskRepo.findAll(filterOptions);
  }

  async getTaskById(idOrCode: string): Promise<TaskModel | null> {
    return await this.taskRepo.findByIdOrCode(idOrCode);
  }

  async createTask(
    data: Partial<TaskModel>,
    context: { companyId?: string; branchId?: string | null; userId?: string; userName?: string }
  ): Promise<TaskModel> {
    if (!data.taskName || !data.taskName.trim()) {
      throw new Error('Task title/name is required.');
    }

    const companyId = context.companyId || 'COM-001';
    const taskCode = data.taskCode || (await this.taskRepo.getNextTaskCode());

    // Compute initial progress based on status if not provided
    const status: TaskStatus = data.status || 'Backlog';
    let progress = data.progress ?? 0;
    if (data.progress === undefined) {
      if (status === 'Done') progress = 100;
      else if (status === 'Under Review') progress = 90;
      else if (status === 'In Progress') progress = 50;
      else progress = 0;
    }

    return await this.taskRepo.create({
      ...data,
      taskCode,
      companyId,
      branchId: data.branchId ?? context.branchId ?? null,
      status,
      progress,
      createdBy: context.userName || context.userId || 'System Admin'
    });
  }

  async updateTask(
    idOrCode: string,
    data: Partial<TaskModel>,
    _context: { companyId?: string; role?: string }
  ): Promise<TaskModel | null> {
    // If status is updated and progress is not explicitly passed, compute reasonable progress
    if (data.status && data.progress === undefined) {
      if (data.status === 'Done') data.progress = 100;
      else if (data.status === 'Under Review') data.progress = 90;
      else if (data.status === 'In Progress') data.progress = 50;
      else if (data.status === 'Backlog') data.progress = 0;
    }

    return await this.taskRepo.update(idOrCode, data);
  }

  async deleteTask(idOrCode: string): Promise<boolean> {
    return await this.taskRepo.delete(idOrCode);
  }
}
