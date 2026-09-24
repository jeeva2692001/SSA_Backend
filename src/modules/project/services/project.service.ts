import bcrypt from 'bcryptjs';
import { ProjectRepository } from '../repositories/project.repository';
import { EmployeeRepository } from '../../employee/repositories/employee.repository';
import { UserRepository } from '../../auth/repositories/user.repository';
import {
  ProjectModel,
  DisciplineModel,
  ProjectDisciplineModel,
  DrawingTypeModel,
  DrawingModel,
  DrawingRevisionModel,
  DrawingFileModel,
  FolderModel,
  ProjectFileModel
} from '../models';
import {
  STANDARD_PROJECT_FOLDER_TEMPLATE,
  FolderTemplateNode
} from '../templates/project-folder.template';


export class ProjectService {
  private projectRepo = new ProjectRepository();
  private employeeRepo = new EmployeeRepository();
  private userRepo = new UserRepository();

  // --- SEED DEFAULT MASTER DATA ---
  async seedMasterData() {
    await this.projectRepo.seedDefaultDisciplines();
    await this.seedDefaultDrawingTypes();
  }

  private async seedDefaultDrawingTypes() {
    const existing = await this.projectRepo.findAllDrawingTypes();
    if (existing.length > 0) return;

    const templates: Partial<DrawingTypeModel>[] = [
      // Architecture (AR)
      { disciplineCode: 'AR', code: 'PLN', title: 'Floor Plan', purpose: 'Master plan of each floor — all rooms, walls, doors, dimensions. Every other discipline draws on top of this.', levelType: 'Per floor', isPerFloor: true, sequenceOrder: 1 },
      { disciplineCode: 'AR', code: 'PLN', title: 'Roof / Terrace Plan', purpose: 'Terrace layout — parapets, tanks, machine rooms, slopes for drainage.', levelType: 'Terrace', isPerFloor: false, sequenceOrder: 2 },
      { disciplineCode: 'AR', code: 'SEC', title: 'Building Sections', purpose: 'Vertical cuts through the building showing floor heights and levels.', levelType: 'All', isPerFloor: false, sequenceOrder: 3 },
      { disciplineCode: 'AR', code: 'ELE', title: 'Elevations (4 sides)', purpose: 'Outside face of the building — look, openings, finishes, heights.', levelType: 'All', isPerFloor: false, sequenceOrder: 4 },
      { disciplineCode: 'AR', code: 'DET', title: 'Staircase Details', purpose: 'Enlarged detail of each staircase — riser, tread, railing.', levelType: 'All', isPerFloor: false, sequenceOrder: 5 },
      { disciplineCode: 'AR', code: 'DET', title: 'Toilet / Core Details', purpose: 'Blown-up detail of toilet blocks and service cores with fittings.', levelType: 'All', isPerFloor: false, sequenceOrder: 6 },
      { disciplineCode: 'AR', code: 'SCH', title: 'Door & Window Schedule', purpose: 'List of every door and window — size, type, material, quantity.', levelType: 'All', isPerFloor: false, sequenceOrder: 7 },
      { disciplineCode: 'AR', code: 'SCH', title: 'Wall & Finish Schedule', purpose: 'What each wall is built of and its finish (paint, tile, cladding).', levelType: 'All', isPerFloor: false, sequenceOrder: 8 },
      { disciplineCode: 'AR', code: 'PLN', title: 'Site & Setting-out Plan', purpose: 'Building position on the plot with grid — used to mark out on ground.', levelType: 'Site', isPerFloor: false, sequenceOrder: 9 },
      { disciplineCode: 'AR', code: 'SCH', title: 'Area Statement', purpose: 'Floor-wise built-up / carpet area figures — for approvals and billing.', levelType: 'All', isPerFloor: false, sequenceOrder: 10 },

      // Interior (IN)
      { disciplineCode: 'IN', code: 'PLN', title: 'Furniture Layout', purpose: 'Where each piece of furniture sits in every room.', levelType: 'Per floor', isPerFloor: true, sequenceOrder: 1 },
      { disciplineCode: 'IN', code: 'PLN', title: 'Flooring Layout', purpose: 'Flooring material and pattern for each space (tile, vinyl, etc.).', levelType: 'Per floor', isPerFloor: true, sequenceOrder: 2 },
      { disciplineCode: 'IN', code: 'RCP', title: 'Reflected Ceiling Plan', purpose: 'Ceiling design — false ceiling, light and diffuser positions.', levelType: 'Per floor', isPerFloor: true, sequenceOrder: 3 },
      { disciplineCode: 'IN', code: 'ELE', title: 'Wall Elevations', purpose: 'Interior wall faces — panelling, cladding, feature walls.', levelType: 'All', isPerFloor: false, sequenceOrder: 4 },
      { disciplineCode: 'IN', code: 'SCH', title: 'Finish & FF&E Schedule', purpose: 'List of all finishes and loose furniture with specifications.', levelType: 'All', isPerFloor: false, sequenceOrder: 5 },

      // Structural (ST)
      { disciplineCode: 'ST', code: 'NTS', title: 'General Notes & Specs', purpose: 'Material grades, design codes and general instructions for site.', levelType: 'All', isPerFloor: false, sequenceOrder: 1 },
      { disciplineCode: 'ST', code: 'PLN', title: 'Foundation & Footing Layout', purpose: 'Position and size of all footings — the base that carries the building.', levelType: 'GF', isPerFloor: false, sequenceOrder: 2 },
      { disciplineCode: 'ST', code: 'PLN', title: 'Column Layout', purpose: 'Where every column stands on each floor.', levelType: 'Per floor', isPerFloor: true, sequenceOrder: 3 },
      { disciplineCode: 'ST', code: 'SCH', title: 'Column Schedule', purpose: 'Size and steel reinforcement of every column.', levelType: 'All', isPerFloor: false, sequenceOrder: 4 },
      { disciplineCode: 'ST', code: 'PLN', title: 'Slab & Beam Layout', purpose: 'Beams and slab thickness for each floor.', levelType: 'Per floor', isPerFloor: true, sequenceOrder: 5 },
      { disciplineCode: 'ST', code: 'SCH', title: 'Beam Schedule / BBS', purpose: 'Reinforcement details and bar-bending schedule for steel cutting.', levelType: 'All', isPerFloor: false, sequenceOrder: 6 },

      // Electrical (EL)
      { disciplineCode: 'EL', code: 'SLD', title: 'Single Line Diagram', purpose: 'The full electrical tree — from incoming supply to every panel.', levelType: 'All', isPerFloor: false, sequenceOrder: 1 },
      { disciplineCode: 'EL', code: 'SCH', title: 'Load Schedule', purpose: 'Power demand of every area — used to size cables and boards.', levelType: 'All', isPerFloor: false, sequenceOrder: 2 },
      { disciplineCode: 'EL', code: 'PWR', title: 'Power Layout', purpose: 'Socket and equipment power points on each floor.', levelType: 'Per floor', isPerFloor: true, sequenceOrder: 3 },
      { disciplineCode: 'EL', code: 'LTG', title: 'Lighting Layout', purpose: 'Light fitting positions and their circuits on each floor.', levelType: 'Per floor', isPerFloor: true, sequenceOrder: 4 },
      { disciplineCode: 'EL', code: 'SCH', title: 'DB & Panel Schedules', purpose: 'What each distribution board feeds and its ratings.', levelType: 'All', isPerFloor: false, sequenceOrder: 5 },

      // Plumbing (PL)
      { disciplineCode: 'PL', code: 'WTR', title: 'Water Supply Layout', purpose: 'Fresh-water pipe routing to every fixture.', levelType: 'Per floor', isPerFloor: true, sequenceOrder: 1 },
      { disciplineCode: 'PL', code: 'DRN', title: 'Drainage & Sewerage Layout', purpose: 'Waste and soil pipe routing on each floor.', levelType: 'Per floor', isPerFloor: true, sequenceOrder: 2 },
      { disciplineCode: 'PL', code: 'PLN', title: 'Storm Water Layout', purpose: 'Rainwater collection and discharge.', levelType: 'Per floor', isPerFloor: true, sequenceOrder: 3 },
      { disciplineCode: 'PL', code: 'DGM', title: 'Riser Diagrams', purpose: 'Vertical stack of water and drain pipes across floors.', levelType: 'All', isPerFloor: false, sequenceOrder: 4 },

      // Fire Fighting (FF)
      { disciplineCode: 'FF', code: 'PLN', title: 'Sprinkler Layout', purpose: 'Automatic sprinkler head positions and piping.', levelType: 'Per floor', isPerFloor: true, sequenceOrder: 1 },
      { disciplineCode: 'FF', code: 'PLN', title: 'Hydrant & Hose Reel Layout', purpose: 'Fire hydrant points and hose reels on each floor.', levelType: 'Per floor', isPerFloor: true, sequenceOrder: 2 },
      { disciplineCode: 'FF', code: 'DGM', title: 'Fire Riser Diagram', purpose: 'Vertical fire-water piping across all floors.', levelType: 'All', isPerFloor: false, sequenceOrder: 3 },

      // HVAC (HV)
      { disciplineCode: 'HV', code: 'PLN', title: 'Equipment (Chiller/AHU) Layout', purpose: 'Position of chillers, AHUs and cooling towers.', levelType: 'Terrace', isPerFloor: false, sequenceOrder: 1 },
      { disciplineCode: 'HV', code: 'DUCT', title: 'Duct Layout', purpose: 'Air supply and return ductwork on each floor.', levelType: 'Per floor', isPerFloor: true, sequenceOrder: 2 },
      { disciplineCode: 'HV', code: 'PLN', title: 'Chilled Water Piping', purpose: 'Chilled-water pipe routing to the AHUs.', levelType: 'Per floor', isPerFloor: true, sequenceOrder: 3 },
    ];

    for (const item of templates) {
      await this.projectRepo.createOrUpdateDrawingType(item);
    }
  }

  // --- PROJECT CREATION & CODE GENERATION ---
  async createProject(input: {
    projectName: string;
    projectPrefix?: string;
    clientName?: string;
    clientId?: string;
    companyId?: string;
    projectType?: string;
    projectSubType?: string;
    floors?: string[]; // e.g. ["GF", "01", "02", "03", "04", "TR"]
    disciplines?: string[]; // e.g. ["AR", "ST", "EL", "PL", "FF", "HV", "IN"]
    startDate?: string;
    completionDate?: string;
    teamLogins?: Array<{
      role: string;
      name: string;
      email: string;
      phone?: string;
      username: string;
      password?: string;
      isNewEmployee?: boolean;
      employeeId?: string;
    }>;
  }) {
    await this.seedMasterData();

    const prefix = (input.projectPrefix || 'GVR').toUpperCase().replace(/[^A-Z0-9]/g, '');
    const currentYear = new Date().getFullYear();
    const seq = await this.projectRepo.getNextProjectSequence(prefix, currentYear, input.companyId);
    const seqPadded = String(seq).padStart(3, '0');

    // Project Code format: [PROJECT_PREFIX]-[YEAR]-[SEQUENCE]
    const projectCode = `${prefix}-${currentYear}-${seqPadded}`;
    const configuredFloors = input.floors && input.floors.length > 0
      ? input.floors
      : ['GF', '01', '02', '03', '04', 'TR'];

    // Process 4-Role Team Logins & Employees
    const teamMembersProcessed: any[] = [];
    if (Array.isArray(input.teamLogins) && input.teamLogins.length > 0) {
      for (const t of input.teamLogins) {
        if (!t.name || !t.role) continue;
        const targetEmail = (t.email || `${t.username || t.role.toLowerCase().replace(/\s+/g, '')}@ssa-erp.com`).trim().toLowerCase();
        const targetUserId = (t.username || t.email || `${t.role.toLowerCase().replace(/\s+/g, '_')}_${prefix.toLowerCase()}`).trim();
        const rawPassword = t.password || 'Pass@1234';
        const hashedPassword = await bcrypt.hash(rawPassword, 10);

        let empId = t.employeeId;

        // If not Client, ensure employee record exists
        if (t.role !== 'Client') {
          if (t.isNewEmployee || !empId) {
            try {
              let existingEmp = await this.employeeRepo.findByEmailAndCompanyId(targetEmail, input.companyId || 'COM-001');
              if (!existingEmp) {
                const nextEmpId = await this.employeeRepo.getNextEmployeeId();
                const department = t.role === 'Designer' ? 'Design & Drafting' : t.role === 'Checker' ? 'Architecture & QA' : 'Project Management';
                existingEmp = await this.employeeRepo.createEmployee({
                  employeeId: nextEmpId,
                  name: t.name.trim(),
                  email: targetEmail,
                  phone: t.phone || '9876543210',
                  department,
                  designation: t.role,
                  joiningDate: new Date().toISOString().split('T')[0],
                  status: 'Active',
                  companyId: input.companyId || 'COM-001'
                });
              }
              empId = existingEmp.employeeId;
            } catch (empErr) {
              console.warn('[ProjectService] Note on employee provisioning:', empErr);
            }
          }
        }

        // Provision User Login account
        try {
          let user = await this.userRepo.findByUserId(targetUserId);
          if (!user) {
            user = await this.userRepo.findByEmail(targetEmail);
          }
          if (user) {
            const repo = await (this.userRepo as any).getRepository();
            user.role = t.role;
            user.password = hashedPassword;
            user.isFirstLogin = false;
            await repo.save(user);
          } else {
            await this.userRepo.createUser({
              userId: targetUserId,
              name: t.name.trim(),
              email: targetEmail,
              role: t.role,
              password: hashedPassword,
              isFirstLogin: false
            });
          }
        } catch (uErr) {
          console.warn('[ProjectService] Note on user provisioning:', uErr);
        }

        teamMembersProcessed.push({
          role: t.role,
          name: t.name.trim(),
          email: targetEmail,
          userId: targetUserId,
          employeeId: empId || null,
          plainPassword: rawPassword
        });
      }
    }

    // 1. Create Project
    const project = await this.projectRepo.createProject({
      projectCode,
      projectName: input.projectName,
      projectPrefix: prefix,
      year: currentYear,
      sequence: seq,
      clientId: input.clientId,
      clientName: input.clientName,
      companyId: input.companyId,
      projectType: input.projectType || 'Commercial',
      projectSubType: input.projectSubType || 'Standard',
      floors: JSON.stringify(configuredFloors),
      startDate: input.startDate || new Date().toISOString().split('T')[0],
      completionDate: input.completionDate || '',
      teamMembers: teamMembersProcessed.length > 0 ? JSON.stringify(teamMembersProcessed) : undefined,
      status: 'Active',
    });

    // 2. Activate Selected Disciplines (Only create what user selected)
    const activeDisciplineCodes = Array.isArray(input.disciplines)
      ? input.disciplines
      : [];

    const projectDisciplines: Partial<ProjectDisciplineModel>[] = activeDisciplineCodes.map(code => ({
      projectId: project.id,
      disciplineCode: code,
      folderCode: `${projectCode}-${code}`,
      status: 'Active'
    }));

    await this.projectRepo.saveProjectDisciplines(projectDisciplines);

    // 3. Auto-Generate Complete Standard Folder Hierarchy (Based on KONGUNAD HOSPITAL structure)
    try {
      await this.generateStandardFolders(project.id, project.projectName, input.clientName || 'System');
    } catch (folderErr) {
      console.error('[ProjectService] Error generating folder structure:', folderErr);
    }

    const createdProject = await this.getProjectById(project.id);
    return {
      ...createdProject,
      generatedCredentials: teamMembersProcessed
    };
  }

  // --- AUTO GENERATE MASTER DRAWING REGISTER ---
  private async generateMasterDrawingRegister(
    project: ProjectModel,
    disciplineCodes: string[],
    floors: string[]
  ) {
    let globalSeqCounter = 1;

    for (const discCode of disciplineCodes) {
      const drawingTypes = await this.projectRepo.findDrawingTypesByDiscipline(discCode);

      for (const dt of drawingTypes) {
        if (dt.isPerFloor) {
          // Generate 1 record per floor
          for (const floorCode of floors) {
            const seqStr = String(globalSeqCounter).padStart(3, '0');
            const levelCode = floorCode.toUpperCase();
            // Drawing Code: [PROJECT_CODE]-[DISCIPLINE_CODE]-[LEVEL]-[DRAWING_TYPE]-[SEQUENCE]
            const drawingCode = `${project.projectCode}-${discCode}-${levelCode}-${dt.code}-${seqStr}`;

            const drawing = await this.projectRepo.createDrawing({
              projectId: project.id,
              disciplineCode: discCode,
              drawingTypeId: dt.id,
              drawingCode,
              drawingTitle: `${dt.title} - ${levelCode}`,
              level: levelCode,
              sequenceNum: globalSeqCounter,
              status: 'Draft',
              currentRevision: 'R00'
            });

            // Initial R00 revision record
            await this.projectRepo.createRevision({
              drawingId: drawing.id,
              revisionCode: 'R00',
              revisionDate: new Date().toISOString().split('T')[0],
              preparedBy: 'System Auto-Generated',
              status: 'Draft',
              remarks: `Initial master register item for ${levelCode}`
            });

            globalSeqCounter++;
          }
        } else {
          // One-Off drawing: level = ALL or levelType
          const seqStr = String(globalSeqCounter).padStart(3, '0');
          let levelCode = 'ALL';
          if (dt.levelType === 'Terrace' || dt.levelType === 'TR') levelCode = 'TR';
          else if (dt.levelType === 'Site') levelCode = 'SITE';
          else if (dt.levelType === 'GF') levelCode = 'GF';
          else if (dt.levelType === 'B1') levelCode = 'B1';

          const drawingCode = `${project.projectCode}-${discCode}-${levelCode}-${dt.code}-${seqStr}`;

          const drawing = await this.projectRepo.createDrawing({
            projectId: project.id,
            disciplineCode: discCode,
            drawingTypeId: dt.id,
            drawingCode,
            drawingTitle: dt.title,
            level: levelCode,
            sequenceNum: globalSeqCounter,
            status: 'Draft',
            currentRevision: 'R00'
          });

          await this.projectRepo.createRevision({
            drawingId: drawing.id,
            revisionCode: 'R00',
            revisionDate: new Date().toISOString().split('T')[0],
            preparedBy: 'System Auto-Generated',
            status: 'Draft',
            remarks: `Initial master register item for ${dt.title}`
          });

          globalSeqCounter++;
        }
      }
    }
  }

  // --- DISCIPLINE MASTER METHODS ---
  async getAllDisciplines() {
    await this.seedMasterData();
    return await this.projectRepo.findAllDisciplines();
  }

  async createDisciplineMaster(input: { code: string; name: string; description?: string }) {
    await this.seedMasterData();
    const code = input.code.toUpperCase().trim();
    const repo = this.projectRepo.getDisciplineRepository();
    const existing = await repo.findOne({ where: { code } });
    if (existing) {
      existing.name = input.name || existing.name;
      if (input.description) existing.description = input.description;
      return await repo.save(existing);
    }
    const count = await repo.count();
    const newDiscipline = repo.create({
      code,
      name: input.name,
      description: input.description || `${input.name} drawings and documentation`,
      sequenceOrder: count + 1,
      status: 'Active'
    });
    return await repo.save(newDiscipline);
  }

  // --- QUERY METHODS ---
  async getAllProjects(companyId?: string, user?: any) {
    await this.seedMasterData();
    let projects = await this.projectRepo.findAllProjects(companyId);

    // If user is a production or client role (not Super Admin / Company / Admin / Branch), filter to ONLY their project(s)
    if (user && !['Super Admin', 'Company', 'Admin', 'Branch'].includes(user.role)) {
      const uId = String(user.id || '').trim().toLowerCase();
      const uUserId = String(user.userId || '').trim().toLowerCase();
      const uEmail = String(user.email || '').trim().toLowerCase();
      const uName = String(user.name || '').trim().toLowerCase();
      const uRole = String(user.role || '').trim().toLowerCase();

      projects = projects.filter(p => {
        // 1. Check clientId / clientName for Client role
        if (user.role === 'Client') {
          if (p.clientId && (String(p.clientId).toLowerCase() === uId || String(p.clientId).toLowerCase() === uUserId)) return true;
          if (p.clientName && String(p.clientName).toLowerCase() === uName) return true;
        }

        // 2. Check teamMembers JSON
        if (p.teamMembers) {
          try {
            const members = typeof p.teamMembers === 'string' ? JSON.parse(p.teamMembers) : p.teamMembers;
            if (Array.isArray(members)) {
              const isMatch = members.some((m: any) => {
                const mUserId = String(m.userId || '').trim().toLowerCase();
                const mEmail = String(m.email || '').trim().toLowerCase();
                const mName = String(m.name || '').trim().toLowerCase();
                const mRole = String(m.role || '').trim().toLowerCase();

                if (uUserId && mUserId && mUserId === uUserId) return true;
                if (uEmail && mEmail && mEmail === uEmail) return true;
                if (uName && mName && mName === uName) return true;
                if (mRole === uRole && (mName === uName || mEmail === uEmail || mUserId === uUserId)) return true;
                return false;
              });
              if (isMatch) return true;
            }
          } catch (e) {
            console.warn('[ProjectService] Failed to parse project teamMembers:', e);
          }
        }

        return false;
      });
    }

    const result = [];
    for (const p of projects) {
      const disciplines = await this.projectRepo.findProjectDisciplines(p.id);
      const drawings = await this.projectRepo.findDrawingsByProjectId(p.id);
      result.push({
        ...p,
        floors: this.safeParseFloors(p.floors),
        disciplines: disciplines.map((d: any) => ({ code: d.disciplineCode, folderCode: d.folderCode })),
        drawingsCount: drawings.length
      });
    }
    return result;
  }

  private safeParseFloors(floorsVal: any): string[] {
    if (!floorsVal) return [];
    if (Array.isArray(floorsVal)) return floorsVal;
    if (typeof floorsVal === 'string') {
      try {
        const parsed = JSON.parse(floorsVal);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  }

  async getProjectById(idOrCode: string, companyId?: string) {
    let project = await this.projectRepo.findProjectById(idOrCode, companyId);
    if (!project) {
      project = await this.projectRepo.findProjectByCode(idOrCode, companyId);
    }
    if (!project) return null;

    const disciplines = await this.projectRepo.findProjectDisciplines(project.id);
    const drawings = await this.projectRepo.findDrawingsByProjectId(project.id);

    let parsedTeamMembers: any[] = [];
    if (project.teamMembers) {
      try {
        parsedTeamMembers = typeof project.teamMembers === 'string' ? JSON.parse(project.teamMembers) : project.teamMembers;
      } catch {}
    }

    // If teamMembers is empty, generate standard 4-role assigned team
    if (!Array.isArray(parsedTeamMembers) || parsedTeamMembers.length === 0) {
      const prefix = (project.projectPrefix || 'GVR').toLowerCase();
      parsedTeamMembers = [
        {
          role: 'Designer',
          name: 'Ar. Rajesh Kumar',
          designation: 'Senior Lead Architect',
          department: 'Design & Drafting',
          email: `designer_${prefix}@ssa-erp.com`,
          phone: '+91 98450 12345',
          userId: `designer_${prefix}`,
          assignedTasks: 'Floor Plans, Elevations, 3D Models & Drawing Submissions'
        },
        {
          role: 'Checker',
          name: 'Er. Priya Sharma',
          designation: 'Senior QA / Lead Structural Checker',
          department: 'Architecture & QA',
          email: `checker_${prefix}@ssa-erp.com`,
          phone: '+91 98450 23456',
          userId: `checker_${prefix}`,
          assignedTasks: 'L1 Design Verification, Code Compliance & Cross-discipline Checks'
        },
        {
          role: 'Project Manager',
          name: 'Vikramaditya Rao',
          designation: 'Principal Project Manager',
          department: 'Project Management',
          email: `pm_${prefix}@ssa-erp.com`,
          phone: '+91 98450 34567',
          userId: `pm_${prefix}`,
          assignedTasks: 'Project Scheduling, L2 Reviews, Budgeting & Client Dispatch'
        },
        {
          role: 'Client',
          name: project.clientName || 'GVR Infrastructure Client Rep',
          designation: 'Authorized Client Representative',
          department: 'Client Management',
          email: `client_${prefix}@ssa-erp.com`,
          phone: '+91 98450 45678',
          userId: `client_${prefix}`,
          assignedTasks: 'Design Reviews, Milestone Approvals & Site Work Authorization'
        },
        {
          role: 'Site Engineer',
          name: 'Karthik Nambiar',
          designation: 'Chief Site Operations Engineer',
          department: 'Site Execution & Contractors',
          email: `site_${prefix}@ssa-erp.com`,
          phone: '+91 98450 56789',
          userId: `site_${prefix}`,
          assignedTasks: 'Physical Construction, Contractor Coordination & Site Execution (Starts after Client Approval)'
        }
      ];
    }

    return {
      ...project,
      floors: this.safeParseFloors(project.floors),
      disciplines: disciplines.map((d: any) => ({ code: d.disciplineCode, folderCode: d.folderCode })),
      drawingsCount: drawings.length,
      teamMembers: parsedTeamMembers
    };
  }

  async deleteProject(idOrCode: string, companyId?: string): Promise<boolean> {
    let project = await this.projectRepo.findProjectById(idOrCode, companyId);
    if (!project) {
      project = await this.projectRepo.findProjectByCode(idOrCode, companyId);
    }
    if (!project) {
      throw new Error(`Project "${idOrCode}" not found.`);
    }

    await this.projectRepo.deleteProject(project.id);
    return true;
  }

  async getProjectDrawings(projectId: string, disciplineCode?: string, companyId?: string) {
    let project = await this.projectRepo.findProjectById(projectId, companyId);
    if (!project) {
      project = await this.projectRepo.findProjectByCode(projectId, companyId);
    }
    if (!project && companyId) {
      return [];
    }
    const targetId = project ? project.id : projectId;
    const drawings = await this.projectRepo.findDrawingsByProjectId(targetId, disciplineCode);
    const result = [];

    for (const d of drawings) {
      const revisions = await this.projectRepo.findRevisionsByDrawingId(d.id);
      const latestRev = revisions[0] || null;
      let files: DrawingFileModel[] = [];
      if (latestRev) {
        files = await this.projectRepo.findFilesByRevisionId(latestRev.id);
      }

      const fileUrl = files[0]?.storagePath || '';
      result.push({
        ...d,
        revisionsCount: revisions.length,
        latestRevision: latestRev,
        latestFiles: files,
        fileUrl: fileUrl,
        url: fileUrl,
        originalFileName: files[0]?.originalFileName || '',
        drawingNumber: d.drawingCode,
      });
    }

    return result;
  }

  async createProjectDrawing(projectId: string, input: any, companyId?: string) {
    let project = await this.projectRepo.findProjectById(projectId, companyId);
    if (!project) {
      project = await this.projectRepo.findProjectByCode(projectId, companyId);
    }
    if (!project) {
      throw new Error(`Project with ID/Code "${projectId}" not found.`);
    }

    const discCode = (input.disciplineCode || input.discipline || 'AR').toUpperCase();
    const level = input.level || 'GF';
    const existingDrawings = await this.projectRepo.findDrawingsByProjectId(project.id, discCode);
    const seq = existingDrawings.length + 1;

    const drawingCode = input.drawingCode || input.drawingNumber || `${project.projectCode}-${discCode}-${level}-${String(seq).padStart(3, '0')}`;

    let drawing = await this.projectRepo.findDrawingByCode(drawingCode);
    if (!drawing) {
      drawing = await this.projectRepo.createDrawing({
        projectId: project.id,
        disciplineCode: discCode,
        drawingTypeId: input.drawingTypeId || null,
        drawingCode,
        drawingTitle: input.drawingTitle || input.title || 'Drawing Deliverable',
        level,
        sequenceNum: seq,
        status: input.status || 'Draft',
        currentRevision: input.revisionNumber || 'R00',
        tagLine: input.tagLine || input.tags || null,
        tags: input.tagLine || input.tags || null,
      });
    } else {
      drawing = await this.projectRepo.updateDrawing(drawing.id, {
        drawingTitle: input.drawingTitle || drawing.drawingTitle,
        status: input.status || drawing.status,
        currentRevision: input.revisionNumber || drawing.currentRevision,
        tagLine: input.tagLine || drawing.tagLine,
        tags: input.tags || drawing.tags,
      });
    }

    const revCode = input.revisionNumber || drawing.currentRevision || 'R00';
    const revision = await this.projectRepo.createRevision({
      drawingId: drawing.id,
      revisionCode: revCode,
      revisionDate: input.revisionDate || new Date().toISOString().split('T')[0],
      preparedBy: input.preparedBy || 'User',
      checkedBy: input.checkedBy || '',
      approvedBy: input.approvedBy || '',
      status: input.status || 'Draft',
      remarks: input.purpose || input.remarks || `Registered revision ${revCode}`
    });

    const fileUrl = input.fileUrl || input.url || input.storagePath;
    let savedFile: any = null;
    if (fileUrl && !fileUrl.endsWith('placeholder')) {
      const origName = input.originalFileName || `${drawingCode}_${revCode}`;
      const ext = origName.includes('.') ? origName.split('.').pop() : 'png';
      savedFile = await this.projectRepo.saveFileRecord({
        drawingRevisionId: revision.id,
        originalFileName: origName,
        storedFileName: `${drawing.id}_${revCode}.${ext}`,
        storagePath: fileUrl,
        fileType: input.fileType || ext,
        fileSize: input.fileSize || 0,
        uploadedBy: input.preparedBy || 'User'
      });
    }

    return {
      ...drawing,
      revisionsCount: 1,
      latestRevision: revision,
      latestFiles: savedFile ? [savedFile] : [],
      fileUrl: fileUrl || '',
      url: fileUrl || '',
      originalFileName: input.originalFileName || '',
      drawingNumber: drawing.drawingCode,
    };
  }

  async getDrawingDetails(drawingId: string) {
    const drawing = await this.projectRepo.findDrawingById(drawingId);
    if (!drawing) throw new Error('Drawing not found.');

    const project = await this.projectRepo.findProjectById(drawing.projectId);
    const revisions = await this.projectRepo.findRevisionsByDrawingId(drawing.id);

    const populatedRevisions = [];
    for (const rev of revisions) {
      const files = await this.projectRepo.findFilesByRevisionId(rev.id);
      populatedRevisions.push({
        ...rev,
        files
      });
    }

    return {
      ...drawing,
      projectCode: project?.projectCode,
      projectName: project?.projectName,
      revisions: populatedRevisions
    };
  }

  // --- REVISION UPLOAD & DISCIPLINE DEPENDENCY CASCADE ---
  async addDrawingRevision(input: {
    drawingId: string;
    revisionCode: string; // e.g. "R01", "R02"
    preparedBy?: string;
    checkedBy?: string;
    approvedBy?: string;
    status?: string; // Draft, Under Review, Approved, Issued for Construction
    remarks?: string;
    fileUrl?: string;
    originalFileName?: string;
    fileType?: string;
    fileSize?: number;
    uploadedBy?: string;
  }) {
    const drawing = await this.projectRepo.findDrawingById(input.drawingId);
    if (!drawing) throw new Error('Drawing not found.');

    // 1. Create new revision record
    const revCode = input.revisionCode || `R${String(parseInt(drawing.currentRevision.replace(/[^0-9]/g, '') || '0') + 1).padStart(2, '0')}`;

    const revision = await this.projectRepo.createRevision({
      drawingId: drawing.id,
      revisionCode: revCode,
      revisionDate: new Date().toISOString().split('T')[0],
      preparedBy: input.preparedBy || 'Architect / Engineer',
      checkedBy: input.checkedBy || '',
      approvedBy: input.approvedBy || '',
      status: input.status || 'Under Review',
      remarks: input.remarks || `Uploaded revision ${revCode}`
    });

    // 2. Standardized File Naming: [DRAWING_CODE]_[REVISION_CODE].[ext]
    if (input.originalFileName && input.fileUrl) {
      const ext = input.originalFileName.includes('.') ? input.originalFileName.split('.').pop() : 'pdf';
      const storedFileName = `${drawing.id}_${revCode}.${ext}`;
      const storagePath = `PROJECTS/${drawing.projectId}/${drawing.disciplineCode}/${storedFileName}`;

      await this.projectRepo.saveFileRecord({
        drawingRevisionId: revision.id,
        originalFileName: input.originalFileName,
        storedFileName: storedFileName,
        storagePath: input.fileUrl || storagePath,
        fileType: input.fileType || ext,
        fileSize: input.fileSize || 0,
        uploadedBy: input.uploadedBy || input.preparedBy || 'User'
      });
    }

    // 3. Update Drawing's currentRevision & status
    await this.projectRepo.updateDrawing(drawing.id, {
      currentRevision: revCode,
      status: input.status || 'Under Review',
      coordinationFlag: false,
      coordinationNote: undefined
    });

    // 4. DISCIPLINE DEPENDENCY CASCADE: If Architecture (AR) drawing is revised, flag downstream discipline drawings!
    if (drawing.disciplineCode === 'AR') {
      const dependentDrawings = await this.projectRepo.findDependentDrawings(drawing.projectId, drawing.level);
      for (const dep of dependentDrawings) {
        await this.projectRepo.updateDrawing(dep.id, {
          coordinationFlag: true,
          status: 'Coordination Required',
          coordinationNote: `Architecture base plan (${drawing.drawingCode}) was revised to ${revCode}. Review & coordination required.`
        });
      }
    }

    return await this.getDrawingDetails(drawing.id);
  }

  // --- DRAWING TYPE MASTER MANAGEMENT ---
  async getDrawingTypes(disciplineCode?: string) {
    await this.seedMasterData();
    if (disciplineCode && disciplineCode !== 'ALL') {
      return await this.projectRepo.findDrawingTypesByDiscipline(disciplineCode);
    }
    return await this.projectRepo.findAllDrawingTypes();
  }

  async saveDrawingType(data: Partial<DrawingTypeModel>) {
    return await this.projectRepo.createOrUpdateDrawingType(data);
  }

  // --- MANUALLY CREATE DISCIPLINE FOLDER ---
  async addProjectDiscipline(idOrCode: string, disciplineCode: string, companyId?: string) {
    await this.seedMasterData();
    let project = await this.projectRepo.findProjectById(idOrCode, companyId);
    if (!project) {
      project = await this.projectRepo.findProjectByCode(idOrCode, companyId);
    }
    if (!project) throw new Error('Project not found.');

    const existingDisciplines = await this.projectRepo.findProjectDisciplines(project.id);
    const code = disciplineCode.toUpperCase();
    if (existingDisciplines.some((d: any) => d.disciplineCode === code)) {
      throw new Error(`Discipline folder ${project.projectCode}-${code} already exists for this project.`);
    }

    // 1. Save Discipline Folder
    const folderCode = `${project.projectCode}-${code}`;
    await this.projectRepo.saveProjectDisciplines([{
      projectId: project.id,
      disciplineCode: code,
      folderCode,
      status: 'Active'
    }]);

    // 2. Generate Drawing Register for this discipline
    const parsedFloors = this.safeParseFloors(project.floors);
    const floors = parsedFloors.length > 0 ? parsedFloors : ['GF', '01', '02', '03', '04', 'TR'];
    const existingDrawings = await this.projectRepo.findDrawingsByProjectId(project.id);
    let startSeq = existingDrawings.length + 1;

    const drawingTypes = await this.projectRepo.findDrawingTypesByDiscipline(code);
    for (const dt of drawingTypes) {
      if (dt.isPerFloor) {
        for (const floorCode of floors) {
          const seqStr = String(startSeq).padStart(3, '0');
          const levelCode = floorCode.toUpperCase();
          const drawingCode = `${project.projectCode}-${code}-${levelCode}-${dt.code}-${seqStr}`;

          const drawing = await this.projectRepo.createDrawing({
            projectId: project.id,
            disciplineCode: code,
            drawingTypeId: dt.id,
            drawingCode,
            drawingTitle: `${dt.title} - ${levelCode}`,
            level: levelCode,
            sequenceNum: startSeq,
            status: 'Draft',
            currentRevision: 'R00'
          });

          await this.projectRepo.createRevision({
            drawingId: drawing.id,
            revisionCode: 'R00',
            revisionDate: new Date().toISOString().split('T')[0],
            preparedBy: 'System Initialized',
            status: 'Draft',
            remarks: `Discipline folder ${folderCode} manually created`
          });

          startSeq++;
        }
      } else {
        const seqStr = String(startSeq).padStart(3, '0');
        let levelCode = 'ALL';
        if (dt.levelType === 'Terrace' || dt.levelType === 'TR') levelCode = 'TR';
        else if (dt.levelType === 'Site') levelCode = 'SITE';
        else if (dt.levelType === 'GF') levelCode = 'GF';

        const drawingCode = `${project.projectCode}-${code}-${levelCode}-${dt.code}-${seqStr}`;

        const drawing = await this.projectRepo.createDrawing({
          projectId: project.id,
          disciplineCode: code,
          drawingTypeId: dt.id,
          drawingCode,
          drawingTitle: dt.title,
          level: levelCode,
          sequenceNum: startSeq,
          status: 'Draft',
          currentRevision: 'R00'
        });

        await this.projectRepo.createRevision({
          drawingId: drawing.id,
          revisionCode: 'R00',
          revisionDate: new Date().toISOString().split('T')[0],
          preparedBy: 'System Initialized',
          status: 'Draft',
          remarks: `Discipline folder ${folderCode} manually created`
        });

        startSeq++;
      }
    }

    return await this.getProjectById(project.id, companyId);
  }

  async deleteProjectDiscipline(idOrCode: string, disciplineCode: string, companyId?: string) {
    let project = await this.projectRepo.findProjectById(idOrCode, companyId);
    if (!project) {
      project = await this.projectRepo.findProjectByCode(idOrCode, companyId);
    }
    if (project) {
      await this.projectRepo.deleteProjectDiscipline(project.id, disciplineCode);
      return await this.getProjectById(project.id, companyId);
    }
    return null;
  }

  // ==========================================
  // PROJECT FOLDERS & FILE MANAGEMENT
  // ==========================================

  /**
   * Generates the standard 17-folder hierarchical structure for a project based on the KONGUNAD HOSPITAL template.
   * Ensures idempotency: duplicate folders will not be created.
   */
  async generateStandardFolders(projectId: string, projectName: string, createdBy: string = 'System'): Promise<FolderModel[]> {
    const existingFolders = await this.projectRepo.findFoldersByProjectId(projectId);

    // 1. Root folder
    let rootFolder = existingFolders.find(
      f => f.folderType === 'ROOT' || (!f.parentFolderId && f.name.trim().toLowerCase() === projectName.trim().toLowerCase())
    );

    if (!rootFolder) {
      rootFolder = await this.projectRepo.createFolder({
        projectId,
        parentFolderId: null,
        name: projectName,
        folderType: 'ROOT',
        sortOrder: 0,
        isSystemFolder: true,
        createdBy,
      });
      existingFolders.push(rootFolder);
    }

    // 2. Recursive helper to insert nodes
    const processNodes = async (nodes: FolderTemplateNode[], parentId: string | null) => {
      for (const node of nodes) {
        let existing = existingFolders.find(
          f => f.parentFolderId === parentId && f.name.trim().toLowerCase() === node.name.trim().toLowerCase()
        );

        if (!existing) {
          existing = await this.projectRepo.createFolder({
            projectId,
            parentFolderId: parentId,
            name: node.name,
            folderType: node.folderType || 'CATEGORY',
            sortOrder: node.sortOrder || 0,
            isSystemFolder: true,
            createdBy,
          });
          existingFolders.push(existing);
        }

        if (node.children && node.children.length > 0) {
          await processNodes(node.children, existing.id);
        }
      }
    };

    // Insert all 17 top-level folders and nested children under rootFolder
    await processNodes(STANDARD_PROJECT_FOLDER_TEMPLATE, rootFolder.id);

    return await this.projectRepo.findFoldersByProjectId(projectId);
  }

  /**
   * Fetch all folders for a project, resolving by UUID or projectCode
   */
  async getProjectFolders(projectIdOrCode: string, companyId?: string): Promise<{ project: ProjectModel | null; folders: FolderModel[] }> {
    let project = await this.projectRepo.findProjectById(projectIdOrCode, companyId);
    if (!project) {
      project = await this.projectRepo.findProjectByCode(projectIdOrCode, companyId);
    }
    if (!project) {
      return { project: null, folders: [] };
    }
    const targetId = project.id;
    let folders = await this.projectRepo.findFoldersByProjectId(targetId);

    // If project exists but has 0 folders, auto-generate them
    if (project && folders.length === 0) {
      folders = await this.generateStandardFolders(project.id, project.projectName, project.clientName || 'System');
    }

    return { project, folders };
  }

  /**
   * Create a custom folder inside a project
   */
  async createFolder(input: {
    projectId: string;
    parentFolderId?: string | null;
    name: string;
    folderType?: string;
    createdBy?: string;
  }, companyId?: string): Promise<FolderModel> {
    let project = await this.projectRepo.findProjectById(input.projectId, companyId);
    if (!project) {
      project = await this.projectRepo.findProjectByCode(input.projectId, companyId);
    }
    if (!project && companyId) {
      throw new Error('Project not found.');
    }
    const pId = project ? project.id : input.projectId;

    return await this.projectRepo.createFolder({
      projectId: pId,
      parentFolderId: input.parentFolderId || null,
      name: input.name.trim(),
      folderType: input.folderType || 'CUSTOM',
      sortOrder: 99,
      isSystemFolder: false,
      createdBy: input.createdBy || 'User',
    });
  }

  /**
   * Rename a folder
   */
  async renameFolder(folderId: string, name: string): Promise<FolderModel> {
    return await this.projectRepo.updateFolder(folderId, { name: name.trim() });
  }

  /**
   * Delete a folder and its recursive children
   */
  async deleteFolder(folderId: string): Promise<boolean> {
    const folder = await this.projectRepo.findFolderById(folderId);
    if (!folder) return false;
    await this.projectRepo.deleteFolder(folderId);
    return true;
  }

  /**
   * Explicitly initialize or re-sync standard hierarchy for an existing project
   */
  async initProjectFolderHierarchy(projectIdOrCode: string, createdBy: string = 'System', companyId?: string): Promise<FolderModel[]> {
    let project = await this.projectRepo.findProjectById(projectIdOrCode, companyId);
    if (!project) {
      project = await this.projectRepo.findProjectByCode(projectIdOrCode, companyId);
    }
    if (!project) {
      throw new Error(`Project "${projectIdOrCode}" not found.`);
    }
    return await this.generateStandardFolders(project.id, project.projectName, createdBy);
  }

  /**
   * Files in a project / folder
   */
  async getProjectFiles(projectIdOrCode: string, folderId?: string, companyId?: string): Promise<ProjectFileModel[]> {
    let project = await this.projectRepo.findProjectById(projectIdOrCode, companyId);
    if (!project) {
      project = await this.projectRepo.findProjectByCode(projectIdOrCode, companyId);
    }
    if (!project && companyId) {
      return [];
    }
    const pId = project ? project.id : projectIdOrCode;
    return await this.projectRepo.findProjectFiles(pId, folderId);
  }

  /**
   * Record a new file upload
   */
  async createProjectFile(input: {
    projectId: string;
    folderId: string;
    fileName: string;
    filePath: string;
    fileType?: string;
    fileSize?: number;
    tagLine?: string;
    tags?: string;
    uploadedBy?: string;
  }, companyId?: string): Promise<ProjectFileModel> {
    let project = await this.projectRepo.findProjectById(input.projectId, companyId);
    if (!project) {
      project = await this.projectRepo.findProjectByCode(input.projectId, companyId);
    }
    if (!project && companyId) {
      throw new Error('Project not found.');
    }
    const pId = project ? project.id : input.projectId;

    return await this.projectRepo.createProjectFile({
      projectId: pId,
      folderId: input.folderId,
      fileName: input.fileName,
      filePath: input.filePath,
      fileType: input.fileType || 'application/octet-stream',
      fileSize: input.fileSize || 0,
      tagLine: input.tagLine ? input.tagLine.trim() : undefined,
      tags: input.tags ? input.tags.trim() : undefined,
      uploadedBy: input.uploadedBy || 'User',
    });
  }

  /**
   * Update a project file (rename, update tagline, etc.)
   */
  async updateProjectFile(fileId: string, updates: Partial<ProjectFileModel>): Promise<ProjectFileModel> {
    return await this.projectRepo.updateProjectFile(fileId, updates);
  }

  /**
   * Rename a project file
   */
  async renameProjectFile(fileId: string, fileName: string): Promise<ProjectFileModel> {
    return await this.projectRepo.updateProjectFile(fileId, { fileName: fileName.trim() });
  }

  /**
   * Delete a project file
   */
  async deleteProjectFile(fileId: string): Promise<boolean> {
    const file = await this.projectRepo.findProjectFileById(fileId);
    if (!file) return false;
    await this.projectRepo.deleteProjectFile(fileId);
    return true;
  }

  /**
   * Handle Multi-Stage Design Approval Pipeline Action
   */
  async handleFileApprovalAction(
    fileId: string,
    action: string, // 'SUBMIT_L1' | 'APPROVE_L1' | 'REJECT_L1' | 'APPROVE_L2_DISPATCH' | 'REJECT_L2' | 'CLIENT_APPROVE' | 'CLIENT_REJECT'
    actor: { name?: string; role?: string; email?: string; userId?: string },
    notes?: string
  ): Promise<ProjectFileModel> {
    const file = await this.projectRepo.findProjectFileById(fileId);
    if (!file) {
      throw new Error('File not found.');
    }

    const nowIso = new Date().toISOString();
    const actorName = actor.name || actor.userId || actor.email || 'User';
    const cleanNotes = (notes || '').trim();

    let newStatus = file.approvalStatus || 'DRAFT';
    const updates: Partial<ProjectFileModel> = {};

    let historyEvent = {
      action,
      role: actor.role || 'User',
      by: actorName,
      timestamp: nowIso,
      notes: cleanNotes
    };

    switch (action) {
      case 'SUBMIT_L1':
        newStatus = 'PENDING_L1';
        break;
      case 'APPROVE_L1':
        newStatus = 'APPROVED_L1';
        updates.l1ApprovedBy = actorName;
        updates.l1ApprovedAt = nowIso;
        updates.l1Notes = cleanNotes;
        break;
      case 'REJECT_L1':
        newStatus = 'REJECTED_L1';
        updates.l1ApprovedBy = actorName;
        updates.l1ApprovedAt = nowIso;
        updates.l1Notes = cleanNotes;
        break;
      case 'APPROVE_L2_DISPATCH':
        newStatus = 'DISPATCHED_TO_CLIENT';
        updates.l2ApprovedBy = actorName;
        updates.l2ApprovedAt = nowIso;
        updates.l2Notes = cleanNotes;
        break;
      case 'REJECT_L2':
        newStatus = 'REJECTED_L2';
        updates.l2ApprovedBy = actorName;
        updates.l2ApprovedAt = nowIso;
        updates.l2Notes = cleanNotes;
        break;
      case 'CLIENT_APPROVE':
        newStatus = 'CLIENT_APPROVED';
        updates.clientApprovedBy = actorName;
        updates.clientApprovedAt = nowIso;
        updates.clientNotes = cleanNotes;
        break;
      case 'CLIENT_REJECT':
        newStatus = 'CLIENT_REVISION_REQUESTED';
        updates.clientApprovedBy = actorName;
        updates.clientApprovedAt = nowIso;
        updates.clientNotes = cleanNotes;
        break;
      default:
        throw new Error(`Invalid approval action: ${action}`);
    }

    updates.approvalStatus = newStatus;

    let currentHistory: any[] = [];
    if (file.approvalHistory) {
      try {
        currentHistory = JSON.parse(file.approvalHistory);
      } catch {}
    }
    currentHistory.push(historyEvent);
    updates.approvalHistory = JSON.stringify(currentHistory);

    return await this.projectRepo.updateProjectFile(fileId, updates);
  }
}

