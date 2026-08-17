import { Repository } from 'typeorm';
import { AppDataSource } from '../../../shared/config/data-source';
import {
  ProjectModel,
  DisciplineModel,
  ProjectDisciplineModel,
  DrawingTypeModel,
  DrawingModel,
  DrawingRevisionModel,
  DrawingFileModel
} from '../models';

export class ProjectRepository {
  private projectRepo(): Repository<ProjectModel> {
    return AppDataSource.getRepository(ProjectModel);
  }

  private disciplineRepo(): Repository<DisciplineModel> {
    return AppDataSource.getRepository(DisciplineModel);
  }

  private projectDisciplineRepo(): Repository<ProjectDisciplineModel> {
    return AppDataSource.getRepository(ProjectDisciplineModel);
  }

  private drawingTypeRepo(): Repository<DrawingTypeModel> {
    return AppDataSource.getRepository(DrawingTypeModel);
  }

  private drawingRepo(): Repository<DrawingModel> {
    return AppDataSource.getRepository(DrawingModel);
  }

  private drawingRevisionRepo(): Repository<DrawingRevisionModel> {
    return AppDataSource.getRepository(DrawingRevisionModel);
  }

  private drawingFileRepo(): Repository<DrawingFileModel> {
    return AppDataSource.getRepository(DrawingFileModel);
  }

  // --- PROJECTS ---
  async getNextProjectSequence(prefix: string, year: number): Promise<number> {
    const repo = this.projectRepo();
    const count = await repo.count({ where: { projectPrefix: prefix, year } });
    return count + 1;
  }

  async createProject(projectData: Partial<ProjectModel>): Promise<ProjectModel> {
    const repo = this.projectRepo();
    const project = repo.create(projectData);
    return await repo.save(project);
  }

  async findAllProjects(): Promise<ProjectModel[]> {
    return await this.projectRepo().find({ order: { createdAt: 'DESC' } });
  }

  async findProjectById(id: string): Promise<ProjectModel | null> {
    return await this.projectRepo().findOne({ where: { id } });
  }

  async findProjectByCode(projectCode: string): Promise<ProjectModel | null> {
    return await this.projectRepo().findOne({ where: { projectCode } });
  }

  // --- DISCIPLINES ---
  getDisciplineRepository(): Repository<DisciplineModel> {
    return this.disciplineRepo();
  }

  async findAllDisciplines(): Promise<DisciplineModel[]> {
    return await this.disciplineRepo().find({ order: { sequenceOrder: 'ASC' } });
  }

  async seedDefaultDisciplines(): Promise<DisciplineModel[]> {
    const repo = this.disciplineRepo();
    const existing = await repo.find();
    if (existing.length > 0) return existing;

    const defaultDisciplines = [
      { code: 'AR', name: 'Architecture', sequenceOrder: 1, description: 'Base architectural plans, sections, elevations, schedules' },
      { code: 'ST', name: 'Structural', sequenceOrder: 2, description: 'Columns, footings, tie beams, slab rebar, BBS' },
      { code: 'EL', name: 'Electrical (MEP)', sequenceOrder: 3, description: 'SLD, power, lighting, panel schedules, cable trays, DG/UPS' },
      { code: 'PL', name: 'Plumbing (MEP)', sequenceOrder: 4, description: 'Water supply, drainage, storm water, pump room, STP/WTP' },
      { code: 'FF', name: 'Fire Fighting', sequenceOrder: 5, description: 'Sprinklers, hydrants, hose reels, fire pumps, static storage' },
      { code: 'HV', name: 'HVAC', sequenceOrder: 6, description: 'Chillers/AHUs, ducts, chilled water, VRF, OT ventilation' },
      { code: 'MG', name: 'Medical Gas', sequenceOrder: 7, description: 'Manifold room, pipeline routing, bed outlets, zone valves' },
      { code: 'LV', name: 'ELV / Low Voltage', sequenceOrder: 8, description: 'Structured cabling, CCTV, access control, BMS, nurse call' },
      { code: 'VT', name: 'Vertical Transport', sequenceOrder: 9, description: 'Lift layout, shaft details, machine room, load calcs' },
      { code: 'SP', name: 'Other Special Services', sequenceOrder: 10, description: 'Kitchen, laundry, pneumatic tube, solar PV, landscape' },
      { code: 'IN', name: 'Interior', sequenceOrder: 11, description: 'Furniture, flooring, RCP ceilings, millwork, FF&E' },
    ];

    const entities = repo.create(defaultDisciplines);
    return await repo.save(entities);
  }

  async saveProjectDisciplines(disciplines: Partial<ProjectDisciplineModel>[]): Promise<ProjectDisciplineModel[]> {
    const repo = this.projectDisciplineRepo();
    const entities = repo.create(disciplines);
    return await repo.save(entities);
  }

  async findProjectDisciplines(projectId: string): Promise<ProjectDisciplineModel[]> {
    return await this.projectDisciplineRepo().find({ where: { projectId } });
  }

  async deleteProjectDiscipline(projectId: string, disciplineCode: string): Promise<void> {
    await this.projectDisciplineRepo().delete({ projectId, disciplineCode });
    await this.drawingRepo().delete({ projectId, disciplineCode });
  }

  // --- DRAWING TYPES MASTER ---
  async findAllDrawingTypes(): Promise<DrawingTypeModel[]> {
    return await this.drawingTypeRepo().find({ order: { disciplineCode: 'ASC', sequenceOrder: 'ASC' } });
  }

  async findDrawingTypesByDiscipline(disciplineCode: string): Promise<DrawingTypeModel[]> {
    return await this.drawingTypeRepo().find({
      where: { disciplineCode, status: 'Active' },
      order: { sequenceOrder: 'ASC' }
    });
  }

  async createOrUpdateDrawingType(data: Partial<DrawingTypeModel>): Promise<DrawingTypeModel> {
    const repo = this.drawingTypeRepo();
    let dt = data.id ? await repo.findOne({ where: { id: data.id } }) : null;
    if (dt) {
      Object.assign(dt, data);
    } else {
      dt = repo.create(data);
    }
    return await repo.save(dt);
  }

  // --- DRAWINGS & REVISONS ---
  async createDrawing(drawingData: Partial<DrawingModel>): Promise<DrawingModel> {
    const repo = this.drawingRepo();
    const drawing = repo.create(drawingData);
    return await repo.save(drawing);
  }

  async findDrawingsByProjectId(projectId: string, disciplineCode?: string): Promise<DrawingModel[]> {
    const repo = this.drawingRepo();
    const where: any = { projectId };
    if (disciplineCode && disciplineCode !== 'ALL') {
      where.disciplineCode = disciplineCode;
    }
    return await repo.find({ where, order: { disciplineCode: 'ASC', level: 'ASC', sequenceNum: 'ASC' } });
  }

  async findDrawingById(id: string): Promise<DrawingModel | null> {
    return await this.drawingRepo().findOne({ where: { id } });
  }

  async findDrawingByCode(drawingCode: string): Promise<DrawingModel | null> {
    return await this.drawingRepo().findOne({ where: { drawingCode } });
  }

  async updateDrawing(id: string, updates: Partial<DrawingModel>): Promise<DrawingModel> {
    const repo = this.drawingRepo();
    await repo.update(id, updates);
    const updated = await repo.findOne({ where: { id } });
    if (!updated) throw new Error('Drawing not found after update.');
    return updated;
  }

  async createRevision(revisionData: Partial<DrawingRevisionModel>): Promise<DrawingRevisionModel> {
    const repo = this.drawingRevisionRepo();
    const rev = repo.create(revisionData);
    return await repo.save(rev);
  }

  async findRevisionsByDrawingId(drawingId: string): Promise<DrawingRevisionModel[]> {
    return await this.drawingRevisionRepo().find({ where: { drawingId }, order: { createdAt: 'DESC' } });
  }

  async saveFileRecord(fileData: Partial<DrawingFileModel>): Promise<DrawingFileModel> {
    const repo = this.drawingFileRepo();
    const file = repo.create(fileData);
    return await repo.save(file);
  }

  async findFilesByRevisionId(drawingRevisionId: string): Promise<DrawingFileModel[]> {
    return await this.drawingFileRepo().find({ where: { drawingRevisionId } });
  }

  async findDependentDrawings(projectId: string, level: string): Promise<DrawingModel[]> {
    const repo = this.drawingRepo();
    const query = repo.createQueryBuilder('drawing')
      .where('drawing.projectId = :projectId', { projectId })
      .andWhere('drawing.disciplineCode != :ar', { ar: 'AR' })
      .andWhere('(drawing.level = :level OR drawing.level = :all)', { level, all: 'ALL' });
    return await query.getMany();
  }
}
