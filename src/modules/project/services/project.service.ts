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
import { emailService } from '../../../shared/services/email.service';
import { AppDataSource } from '../../../shared/config/data-source';
import { LeadModel } from '../../lead/models/lead.model';
import { ClientModel } from '../../client/models/client.model';
import { EmployeeModel } from '../../employee/models/employee.model';
import { MilestoneRepository } from '../repositories/milestone.repository';


export class ProjectService {
  private projectRepo = new ProjectRepository();
  private employeeRepo = new EmployeeRepository();
  private userRepo = new UserRepository();
  private milestoneRepo = new MilestoneRepository();

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
    budget?: number;
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
    enableReferencesFolder?: boolean;
    allowClientDownload?: boolean;
  }) {
    await this.seedMasterData();

    if (!input.projectName || !input.projectName.trim()) {
      throw new Error('Project Name is required.');
    }
    const cleanProjectName = input.projectName.trim();
    if (cleanProjectName.length < 2 || cleanProjectName.length > 50) {
      throw new Error('Project Name must be between 2 and 50 characters.');
    }
    if (!/[a-zA-Z]/.test(cleanProjectName)) {
      throw new Error('Project Name must contain letters and cannot be only numeric or special characters.');
    }

    if (!input.projectPrefix || !input.projectPrefix.trim()) {
      throw new Error('Project Code Prefix is required.');
    }
    const prefix = input.projectPrefix.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (prefix.length < 2 || prefix.length > 5) {
      throw new Error('Project Code Prefix must be between 2 and 5 alphanumeric characters.');
    }

    if (input.budget !== undefined && input.budget !== null) {
      const budgetNum = Number(input.budget);
      if (isNaN(budgetNum) || budgetNum <= 0) {
        throw new Error('Agreed Contract / Project Value must be a valid positive amount.');
      }
    }

    const currentYear = new Date().getFullYear();
    let seq = await this.projectRepo.getNextProjectSequence(prefix, currentYear, input.companyId);
    let seqPadded = String(seq).padStart(3, '0');
    let projectCode = `${prefix}-${currentYear}-${seqPadded}`;

    // Extra safety guard against race conditions or manual entries
    while (await this.projectRepo.findProjectByCode(projectCode)) {
      seq++;
      seqPadded = String(seq).padStart(3, '0');
      projectCode = `${prefix}-${currentYear}-${seqPadded}`;
    }

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
      location: (input as any).location,
      siteArea: (input as any).siteArea,
      builtUpArea: (input as any).builtUpArea,
      budget: (input as any).budget ? Number((input as any).budget) : 0,
      timeline: (input as any).timeline,
      progress: (input as any).progress ? Number((input as any).progress) : 0,
      teamMembers: teamMembersProcessed.length > 0 ? JSON.stringify(teamMembersProcessed) : undefined,
      status: (input as any).status || 'Active',
      enableReferencesFolder: Boolean(input.enableReferencesFolder),
      allowClientDownload: Boolean(input.allowClientDownload),
    });

    // 2. Activate Selected Disciplines (Only create what user selected)
    let activeDisciplineCodes = Array.isArray(input.disciplines)
      ? input.disciplines.map((d: any) => typeof d === 'string' ? d.trim() : (d.code || d.disciplineCode || '').trim()).filter(Boolean)
      : [];

    activeDisciplineCodes = Array.from(new Set(activeDisciplineCodes));

    if (input.enableReferencesFolder) {
      if (!activeDisciplineCodes.includes('REF')) {
        activeDisciplineCodes.unshift('REF');
      }
    } else {
      activeDisciplineCodes = activeDisciplineCodes.filter(c => c !== 'REF');
    }

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

    // 3b. Auto-seed default milestones for new project
    try {
      await this.milestoneRepo.seedDefaultMilestones(project.id, project.projectCode, input.companyId);
    } catch (mErr) {
      console.warn('[ProjectService] Auto-seed milestones note:', mErr);
    }

    // 4. Send Welcome & Client Login Credentials via Email (to Client role)
    const clientMember = teamMembersProcessed.find(m => m.role === 'Client');
    let clientEmailDelivery: any = null;
    if (clientMember && clientMember.email) {
      try {
        const emailPromise = emailService.sendClientWelcomeAndCredentialsEmail({
          clientEmail: clientMember.email,
          clientName: clientMember.name || input.clientName || 'Valued Client',
          username: clientMember.userId,
          password: clientMember.plainPassword,
          projectName: project.projectName,
          projectCode: project.projectCode,
          companyName: input.clientName || 'Sundar Sundram Architects',
          portalUrl: process.env.APP_URL ? `${process.env.APP_URL}/login` : 'http://localhost:5173/login'
        });
        const timeoutFallback = new Promise<any>((resolve) => setTimeout(() => resolve({ success: true, simulated: false }), 7000));
        clientEmailDelivery = await Promise.race([emailPromise, timeoutFallback]);
      } catch (emailErr) {
        console.error('[ProjectService] Error sending client credentials email:', emailErr);
      }
    }

    const createdProject = await this.getProjectById(project.id);
    return {
      ...createdProject,
      generatedCredentials: teamMembersProcessed.map(m => {
        if (m.role === 'Client') {
          return {
            ...m,
            emailSent: !!clientEmailDelivery?.success,
            simulated: !!clientEmailDelivery?.simulated
          };
        }
        return m;
      })
    };
  }

  async resendClientCredentials(projectId: string, emailOverride?: string) {
    let project = await this.projectRepo.findProjectById(projectId);
    if (!project) {
      project = await this.projectRepo.findProjectByCode(projectId);
    }
    if (!project) {
      throw new Error(`Project with ID or Code "${projectId}" not found.`);
    }

    let team: any[] = [];
    if (project.teamMembers) {
      try {
        team = typeof project.teamMembers === 'string' ? JSON.parse(project.teamMembers) : project.teamMembers;
      } catch {}
    }

    const clientMember = team.find((m: any) => m.role === 'Client');
    const targetEmail = (emailOverride || clientMember?.email || '').trim();
    if (!targetEmail || !targetEmail.includes('@')) {
      throw new Error(`No valid email address found for the client on project ${project.projectCode}.`);
    }

    const username = clientMember?.userId || clientMember?.username || `client_${project.projectPrefix?.toLowerCase() || 'p'}`;
    const password = clientMember?.plainPassword || clientMember?.password || 'Pass@1234';
    const clientName = clientMember?.name || project.clientName || 'Client Representative';

    const delivery = await emailService.sendClientWelcomeAndCredentialsEmail({
      clientEmail: targetEmail,
      clientName,
      username,
      password,
      projectName: project.projectName,
      projectCode: project.projectCode,
      companyName: 'Sundar Sundram Architects',
      portalUrl: process.env.APP_URL ? `${process.env.APP_URL}/login` : 'http://localhost:5173/login'
    });

    return {
      success: true,
      message: `Credentials email successfully dispatched to ${targetEmail}`,
      delivery
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
      const enriched = await this.enrichProjectLiveData(p);
      const disciplines = await this.projectRepo.findProjectDisciplines(enriched.id);
      const drawings = await this.projectRepo.findDrawingsByProjectId(enriched.id);
      const team = await this.resolveLiveTeamMembers(enriched);

      // Clean & deduplicate disciplines
      const uniqueDisciplines: { code: string; folderCode: string }[] = [];
      const seenCodes = new Set<string>();
      const isRefEnabled = Boolean(enriched.enableReferencesFolder);
      for (const d of disciplines) {
        if (!d.disciplineCode) continue;
        if (d.disciplineCode === 'REF' && !isRefEnabled) continue;
        if (!seenCodes.has(d.disciplineCode)) {
          seenCodes.add(d.disciplineCode);
          uniqueDisciplines.push({ code: d.disciplineCode, folderCode: d.folderCode });
        }
      }
      if (isRefEnabled && !seenCodes.has('REF')) {
        uniqueDisciplines.unshift({ code: 'REF', folderCode: `${enriched.projectCode}-REF` });
      }

      let calculatedProgress = Number(enriched.progress) || 0;
      try {
        const pMilestones = await this.milestoneRepo.findByProjectId(p.id);
        if (pMilestones && pMilestones.length > 0) {
          const completed = pMilestones.filter((m: any) => m.status === 'Completed').length;
          calculatedProgress = Math.round((completed / pMilestones.length) * 100);
        }
      } catch (mErr) {
        // fallback to enriched.progress
      }

      result.push({
        ...enriched,
        progress: calculatedProgress,
        teamMembers: team,
        enableReferencesFolder: isRefEnabled,
        allowClientDownload: Boolean(enriched.allowClientDownload),
        floors: this.safeParseFloors(enriched.floors),
        disciplines: uniqueDisciplines,
        drawingsCount: drawings.length
      });
    }
    return result;
  }

  async enrichProjectLiveData(project: ProjectModel): Promise<ProjectModel> {
    const hasMissingFields = !project.location || !project.budget || !project.timeline || !project.builtUpArea;
    if (!hasMissingFields) return project;

    try {
      const leadRepo = AppDataSource.getRepository(LeadModel);
      const clientRepo = AppDataSource.getRepository(ClientModel);

      let matchedLead: LeadModel | null = null;
      if (project.clientId) {
        matchedLead = await leadRepo.findOne({ where: { clientId: project.clientId } });
      }
      if (!matchedLead && project.projectName) {
        matchedLead = await leadRepo.findOne({ where: [{ leadTitle: project.projectName }, { projectName: project.projectName }] });
      }
      if (!matchedLead && project.clientName) {
        matchedLead = await leadRepo.findOne({ where: { clientName: project.clientName } });
      }

      let matchedClient: ClientModel | null = null;
      if (project.clientId) {
        matchedClient = await clientRepo.findOne({ where: { id: project.clientId } });
      }
      if (!matchedClient && project.clientName) {
        matchedClient = await clientRepo.findOne({ where: [{ clientName: project.clientName }, { company: project.clientName }] });
      }

      let changed = false;
      if (!project.location) {
        const leadLoc = matchedLead ? [matchedLead.siteAddress, matchedLead.city, matchedLead.state].filter(Boolean).join(', ') : '';
        const clientLoc = matchedClient ? [matchedClient.address, matchedClient.city, matchedClient.state].filter(Boolean).join(', ') : '';
        if (leadLoc || clientLoc) {
          project.location = leadLoc || clientLoc;
          changed = true;
        }
      }
      if (!project.siteArea && matchedLead?.siteArea) {
        project.siteArea = `${matchedLead.siteArea} ${matchedLead.unit || 'Sq.ft'}`;
        changed = true;
      }
      if (!project.builtUpArea && matchedLead?.expectedBuiltUpArea) {
        project.builtUpArea = matchedLead.expectedBuiltUpArea;
        changed = true;
      }
      if ((!project.budget || Number(project.budget) === 0) && matchedLead) {
        const leadBudget = Number(matchedLead.estimatedBudget) || Number(String(matchedLead.budgetRange || '').replace(/[^0-9.]/g, '')) || 0;
        if (leadBudget > 0) {
          project.budget = leadBudget;
          changed = true;
        }
      }
      if (!project.timeline && matchedLead) {
        const leadTime = matchedLead.expectedStartDate
          ? `${matchedLead.expectedStartDate} to ${matchedLead.expectedCompletionDate || 'TBD'}`
          : matchedLead.timelineExpectation || '';
        if (leadTime) {
          project.timeline = leadTime;
          changed = true;
        }
      }

      if (changed) {
        const repo = (this.projectRepo as any).projectRepo();
        await repo.update(project.id, {
          location: project.location,
          siteArea: project.siteArea,
          builtUpArea: project.builtUpArea,
          budget: project.budget,
          timeline: project.timeline
        });
      }
    } catch (err) {
      console.warn('[ProjectService] Note on enriching project live data:', err);
    }

    return project;
  }

  async resolveLiveTeamMembers(project: ProjectModel): Promise<any[]> {
    let parsedTeamMembers: any[] = [];
    if (project.teamMembers) {
      try {
        parsedTeamMembers = typeof project.teamMembers === 'string' ? JSON.parse(project.teamMembers) : project.teamMembers;
      } catch {}
    }

    const hasDummyTeam = !Array.isArray(parsedTeamMembers) || parsedTeamMembers.length === 0 || parsedTeamMembers.some(m =>
      m.name && (m.name.includes('Rajesh Kumar') || m.name.includes('Priya Sharma') || m.name.includes('Vikramaditya Rao'))
    );

    try {
      const empRepo = AppDataSource.getRepository(EmployeeModel);
      const clientRepo = AppDataSource.getRepository(ClientModel);
      const leadRepo = AppDataSource.getRepository(LeadModel);

      const activeEmployees = await empRepo.find({ where: { status: 'Active' } });
      const client = project.clientId
        ? await clientRepo.findOne({ where: { id: project.clientId } })
        : await clientRepo.findOne({ where: { clientName: project.clientName } });

      let matchedLead: LeadModel | null = null;
      if (project.clientId) {
        matchedLead = await leadRepo.findOne({ where: { clientId: project.clientId } });
      }
      if (!matchedLead && project.projectName) {
        matchedLead = await leadRepo.findOne({ where: [{ leadTitle: project.projectName }, { projectName: project.projectName }] });
      }

      if (hasDummyTeam) {
        const prefix = (project.projectPrefix || 'PRJ').toLowerCase();

        // 1. Live Designer
        const designerEmp = activeEmployees.find(e => (e.designation || '').toLowerCase().includes('design') || (e.department || '').toLowerCase().includes('design')) || activeEmployees[0];
        // 2. Live Checker
        const assignedLeadEmp = matchedLead?.assignedEmployee ? activeEmployees.find(e => e.name.toLowerCase() === matchedLead.assignedEmployee?.toLowerCase()) : null;
        const checkerEmp = assignedLeadEmp || activeEmployees.find(e => (e.designation || '').toLowerCase().includes('architect') && e.id !== designerEmp?.id) || activeEmployees[1] || designerEmp;
        // 3. Live Project Manager
        const pmEmp = activeEmployees.find(e => ((e.designation || '').toLowerCase().includes('project') || (e.designation || '').toLowerCase().includes('principal') || (e.designation || '').toLowerCase().includes('manager')) && e.id !== designerEmp?.id && e.id !== checkerEmp?.id) || activeEmployees[2] || designerEmp;
        // 4. Live Client
        const clientName = client?.contactPerson || client?.clientName || project.clientName || 'Authorized Client Representative';
        const clientEmail = client?.email || `client_${prefix}@ssa-erp.com`;
        const clientPhone = client?.mobile || (client as any)?.phone || '+91 98765 43210';
        // 5. Live Site Engineer
        const siteEmp = activeEmployees.find(e => ((e.department || '').toLowerCase().includes('structural') || (e.designation || '').toLowerCase().includes('consultant')) && e.id !== designerEmp?.id && e.id !== checkerEmp?.id && e.id !== pmEmp?.id) || activeEmployees[3] || pmEmp;

        parsedTeamMembers = [
          {
            role: 'Designer',
            name: designerEmp ? designerEmp.name : 'Architectural Designer',
            designation: designerEmp ? designerEmp.designation : 'Lead Architectural Designer',
            department: designerEmp ? designerEmp.department : 'Design & Drafting',
            email: designerEmp ? designerEmp.email : `designer_${prefix}@ssa-erp.com`,
            phone: designerEmp ? designerEmp.phone : '+91 98765 43210',
            employeeId: designerEmp ? designerEmp.employeeId : null,
            assignedTasks: 'Floor Plans, Elevations, 3D Models & Drawing Submissions'
          },
          {
            role: 'Checker',
            name: checkerEmp ? checkerEmp.name : 'Structural Checker',
            designation: checkerEmp ? checkerEmp.designation : 'Lead Structural QA / Checker',
            department: checkerEmp ? checkerEmp.department : 'Architecture & QA',
            email: checkerEmp ? checkerEmp.email : `checker_${prefix}@ssa-erp.com`,
            phone: checkerEmp ? checkerEmp.phone : '+91 98765 43211',
            employeeId: checkerEmp ? checkerEmp.employeeId : null,
            assignedTasks: 'L1 Design Verification, Code Compliance & Cross-discipline Checks'
          },
          {
            role: 'Project Manager',
            name: pmEmp ? pmEmp.name : 'Project Manager',
            designation: pmEmp ? pmEmp.designation : 'Principal Project Manager',
            department: pmEmp ? pmEmp.department : 'Project Management',
            email: pmEmp ? pmEmp.email : `pm_${prefix}@ssa-erp.com`,
            phone: pmEmp ? pmEmp.phone : '+91 98765 43212',
            employeeId: pmEmp ? pmEmp.employeeId : null,
            assignedTasks: 'Project Scheduling, L2 Reviews, Budgeting & Client Dispatch'
          },
          {
            role: 'Client',
            name: clientName,
            designation: client?.company ? `${client.company} Representative` : 'Authorized Client Representative',
            department: 'Client Management',
            email: clientEmail,
            phone: clientPhone,
            assignedTasks: 'Design Reviews, Milestone Approvals & Site Work Authorization'
          },
          {
            role: 'Site Engineer',
            name: siteEmp ? siteEmp.name : 'Site Engineer',
            designation: siteEmp ? siteEmp.designation : 'Site Operations Lead',
            department: siteEmp ? siteEmp.department : 'Site Execution & Contractors',
            email: siteEmp ? siteEmp.email : `site_${prefix}@ssa-erp.com`,
            phone: siteEmp ? siteEmp.phone : '+91 98765 43213',
            employeeId: siteEmp ? siteEmp.employeeId : null,
            assignedTasks: 'Physical Construction, Contractor Coordination & Site Execution (Starts after Client Approval)'
          }
        ];

        try {
          const repo = (this.projectRepo as any).projectRepo();
          await repo.update(project.id, { teamMembers: JSON.stringify(parsedTeamMembers) });
        } catch (err) {
          console.warn('[ProjectService] Failed to persist live team members:', err);
        }
      } else {
        // Enrich existing real team members with full employee & client details
        parsedTeamMembers = parsedTeamMembers.map((m: any) => {
          if (m.employeeId) {
            const emp = activeEmployees.find(e => e.employeeId === m.employeeId);
            if (emp) {
              return {
                ...m,
                designation: m.designation || emp.designation,
                department: m.department || emp.department,
                phone: m.phone || emp.phone,
                email: m.email || emp.email,
                assignedTasks: m.assignedTasks || (
                  m.role === 'Designer' ? 'Floor Plans, Elevations, 3D Models & Drawing Submissions' :
                  m.role === 'Checker' ? 'L1 Design Verification, Code Compliance & Cross-discipline Checks' :
                  m.role === 'Project Manager' ? 'Project Scheduling, L2 Reviews, Budgeting & Client Dispatch' :
                  m.role === 'Client' ? 'Design Reviews, Milestone Approvals & Site Work Authorization' :
                  'Site Coordination & Execution'
                )
              };
            }
          }
          if (m.role === 'Client' && client) {
            return {
              ...m,
              phone: m.phone || client.mobile || (client as any).phone || '',
              email: m.email || client.email || '',
              designation: m.designation || (client.company ? `${client.company} Representative` : 'Authorized Client Representative'),
              department: m.department || 'Client Management'
            };
          }
          return m;
        });
      }
    } catch (err) {
      console.warn('[ProjectService] Error in resolveLiveTeamMembers:', err);
    }

    return parsedTeamMembers;
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

    const enriched = await this.enrichProjectLiveData(project);
    const disciplines = await this.projectRepo.findProjectDisciplines(enriched.id);
    const drawings = await this.projectRepo.findDrawingsByProjectId(enriched.id);
    const parsedTeamMembers = await this.resolveLiveTeamMembers(enriched);

    // Clean & deduplicate disciplines
    const uniqueDisciplines: { code: string; folderCode: string }[] = [];
    const seenCodes = new Set<string>();
    const isRefEnabled = Boolean(enriched.enableReferencesFolder);
    for (const d of disciplines) {
      if (!d.disciplineCode) continue;
      if (d.disciplineCode === 'REF' && !isRefEnabled) continue;
      if (!seenCodes.has(d.disciplineCode)) {
        seenCodes.add(d.disciplineCode);
        uniqueDisciplines.push({ code: d.disciplineCode, folderCode: d.folderCode });
      }
    }
    if (isRefEnabled && !seenCodes.has('REF')) {
      uniqueDisciplines.unshift({ code: 'REF', folderCode: `${enriched.projectCode}-REF` });
    }

    return {
      ...enriched,
      enableReferencesFolder: isRefEnabled,
      allowClientDownload: Boolean(enriched.allowClientDownload),
      floors: this.safeParseFloors(enriched.floors),
      disciplines: uniqueDisciplines,
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

  async updateProject(idOrCode: string, updates: any, companyId?: string): Promise<any> {
    let project = await this.projectRepo.findProjectById(idOrCode, companyId);
    if (!project) {
      project = await this.projectRepo.findProjectByCode(idOrCode, companyId);
    }
    if (!project) {
      throw new Error(`Project "${idOrCode}" not found.`);
    }

    const payload: Partial<ProjectModel> = { ...updates };
    if (updates.projectName !== undefined) {
      const cleanName = (updates.projectName || '').trim();
      if (!cleanName) {
        throw new Error('Project Name is required.');
      }
      if (cleanName.length < 2 || cleanName.length > 50) {
        throw new Error('Project Name must be between 2 and 50 characters.');
      }
      if (!/[a-zA-Z]/.test(cleanName)) {
        throw new Error('Project Name must contain letters and cannot be only numeric or special characters.');
      }
      if (!/[a-zA-Z0-9]/.test(cleanName)) {
        throw new Error('Project Name cannot contain only special characters.');
      }
      if (!/^[a-zA-Z0-9\s,.'&()/#:;!?"'–—+*@_-]+$/.test(cleanName)) {
        throw new Error('Project Name contains invalid characters.');
      }
      payload.projectName = cleanName;
    }

    const clientVal = updates.clientName !== undefined ? updates.clientName : updates.client;
    if (clientVal !== undefined) {
      const cleanClient = (clientVal || '').trim();
      if (!cleanClient) {
        throw new Error('Client Account is required.');
      }
      if (cleanClient.length < 2 || cleanClient.length > 100) {
        throw new Error('Client Account must be between 2 and 100 characters.');
      }
      if (!/[a-zA-Z]/.test(cleanClient)) {
        throw new Error('Client Account must contain letters and cannot be only numeric or special characters.');
      }
      if (!/^[a-zA-Z0-9\s,.'&()/#:;!?"'–—+*@_-]+$/.test(cleanClient)) {
        throw new Error('Client Account contains invalid characters.');
      }
      payload.clientName = cleanClient;
    }

    if (updates.location !== undefined) {
      const cleanLoc = (updates.location || '').trim();
      if (updates.location && !cleanLoc) {
        throw new Error('Location cannot be only spaces.');
      }
      if (cleanLoc) {
        if (cleanLoc.length < 2 || cleanLoc.length > 150) {
          throw new Error('Location must be between 2 and 150 characters.');
        }
        if (!/[a-zA-Z]/.test(cleanLoc)) {
          throw new Error('Location must contain letters and cannot be only numeric or special characters.');
        }
        if (!/^[a-zA-Z0-9\s,.'&()/#:;!?"'–—+*@_-]+$/.test(cleanLoc)) {
          throw new Error('Location contains invalid characters.');
        }
      }
      payload.location = cleanLoc;
    }

    if (updates.siteArea !== undefined) {
      const cleanArea = (updates.siteArea || '').trim();
      if (updates.siteArea && !cleanArea) {
        throw new Error('Site Area cannot be only spaces.');
      }
      if (cleanArea) {
        if (cleanArea.length < 2 || cleanArea.length > 50) {
          throw new Error('Site Area must be between 2 and 50 characters.');
        }
        if (!/\d/.test(cleanArea)) {
          throw new Error('Site Area must contain a numeric value.');
        }
        if (!/[a-zA-Z]/.test(cleanArea)) {
          throw new Error('Site Area must include a unit (e.g., Sq.ft, Acres, Sq.m) and cannot be only numbers.');
        }
        if (!/^[a-zA-Z0-9\s,./'-]+$/.test(cleanArea)) {
          throw new Error('Site Area contains invalid characters.');
        }
      }
      payload.siteArea = cleanArea;
    }

    if (updates.builtUpArea !== undefined) {
      const cleanArea = (updates.builtUpArea || '').trim();
      if (updates.builtUpArea && !cleanArea) {
        throw new Error('Built-Up Area cannot be only spaces.');
      }
      if (cleanArea) {
        if (cleanArea.length < 2 || cleanArea.length > 50) {
          throw new Error('Built-Up Area must be between 2 and 50 characters.');
        }
        if (!/\d/.test(cleanArea)) {
          throw new Error('Built-Up Area must contain a numeric value.');
        }
        if (!/[a-zA-Z]/.test(cleanArea)) {
          throw new Error('Built-Up Area must include a unit (e.g., Sq.ft, Acres, Sq.m) and cannot be only numbers.');
        }
        if (!/^[a-zA-Z0-9\s,./'-]+$/.test(cleanArea)) {
          throw new Error('Built-Up Area contains invalid characters.');
        }
      }
      payload.builtUpArea = cleanArea;
    }

    if (updates.budget !== undefined) {
      const bNum = Number(updates.budget);
      if (isNaN(bNum) || bNum <= 0) {
        throw new Error('Budget must be greater than zero.');
      }
      payload.budget = bNum;
    }

    if (updates.timeline !== undefined) {
      const cleanTimeline = (updates.timeline || '').trim();
      if (updates.timeline && !cleanTimeline) {
        throw new Error('Timeline Range cannot be only spaces.');
      }
      if (cleanTimeline) {
        if (cleanTimeline.length < 2 || cleanTimeline.length > 60) {
          throw new Error('Timeline Range must be between 2 and 60 characters.');
        }
        const isDateRange = /^\d{4}-\d{2}-\d{2}(\s*(to|-)\s*\d{4}-\d{2}-\d{2})?$/i.test(cleanTimeline) || /^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}(\s*(to|-)\s*\d{1,2}[/-]\d{1,2}[/-]\d{2,4})?$/i.test(cleanTimeline);
        if (!isDateRange && !/[a-zA-Z]/.test(cleanTimeline)) {
          throw new Error('Timeline Range must contain letters or valid dates (e.g., 2026-11-06 to 2026-11-24, Jan 2026 - Dec 2027) and cannot be only numeric or special characters.');
        }
        if (!/^[a-zA-Z0-9\s,./()–—+*@_#-]+$/.test(cleanTimeline)) {
          throw new Error('Timeline Range contains invalid characters.');
        }
      }
      payload.timeline = cleanTimeline;
      const dateMatches = cleanTimeline.match(/\d{4}-\d{2}-\d{2}/g);
      if (dateMatches && dateMatches.length >= 1) {
        payload.startDate = dateMatches[0];
        if (dateMatches.length >= 2) {
          payload.completionDate = dateMatches[1];
        }
      }
    }
    if (updates.startDate !== undefined) payload.startDate = updates.startDate;
    if (updates.completionDate !== undefined) payload.completionDate = updates.completionDate;
    if (updates.progress !== undefined) payload.progress = Number(updates.progress);
    if (updates.floors && Array.isArray(updates.floors)) payload.floors = JSON.stringify(updates.floors);

    if (updates.enableReferencesFolder === true) {
      await this.ensureReferencesFolder(project.id, 'System');
      const existingDiscs = await this.projectRepo.findProjectDisciplines(project.id);
      const refDiscs = existingDiscs.filter((d: any) => d.disciplineCode === 'REF');
      if (refDiscs.length === 0) {
        await this.projectRepo.saveProjectDisciplines([{
          projectId: project.id,
          disciplineCode: 'REF',
          folderCode: `${project.projectCode}-REF`,
          status: 'Active'
        }]);
      } else if (refDiscs.length > 1) {
        // Delete all duplicate REF records from db, keep only the first one
        for (let i = 1; i < refDiscs.length; i++) {
          if (refDiscs[i].id) {
            await (this.projectRepo as any).projectDisciplineRepo().delete(refDiscs[i].id);
          }
        }
      }
    } else if (updates.enableReferencesFolder === false) {
      await this.projectRepo.deleteProjectDiscipline(project.id, 'REF');
    }

    const updated = await this.projectRepo.updateProject(project.id, payload);
    return updated;
  }

  async ensureReferencesFolder(projectId: string, createdBy: string = 'System'): Promise<FolderModel[]> {
    const existingFolders = await this.projectRepo.findFoldersByProjectId(projectId);
    let rootFolder = existingFolders.find(
      f => f.folderType === 'ROOT' || !f.parentFolderId
    );
    if (!rootFolder) return [];

    let refFolder = existingFolders.find(
      f => f.parentFolderId === rootFolder!.id && (f.name.toLowerCase().includes('reference') || f.name.startsWith('0.'))
    );

    const created: FolderModel[] = [];
    if (!refFolder) {
      refFolder = await this.projectRepo.createFolder({
        projectId,
        parentFolderId: rootFolder.id,
        name: '0. REFERENCES',
        folderType: 'TOP_LEVEL',
        sortOrder: 0,
        isSystemFolder: true,
        createdBy,
      });
      existingFolders.push(refFolder);
      created.push(refFolder);
    }

    const refSubfolders = [
      { name: '1. Client Inspirations & Moodboards', sortOrder: 1 },
      { name: '2. Style References & Aesthetics', sortOrder: 2 },
      { name: '3. Material & Finishes References', sortOrder: 3 },
      { name: '4. Site Photos & Context', sortOrder: 4 },
      { name: '5. Precedent Studies & Benchmark Drawings', sortOrder: 5 },
    ];

    for (const sub of refSubfolders) {
      const match = existingFolders.find(
        f => f.parentFolderId === refFolder!.id && f.name.trim().toLowerCase() === sub.name.trim().toLowerCase()
      );
      if (!match) {
        const sf = await this.projectRepo.createFolder({
          projectId,
          parentFolderId: refFolder.id,
          name: sub.name,
          folderType: 'CATEGORY',
          sortOrder: sub.sortOrder,
          isSystemFolder: true,
          createdBy,
        });
        existingFolders.push(sf);
        created.push(sf);
      }
    }

    return created;
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

      if (d.status === 'Rework' && latestRev) {
        // 1. Active Drawing Deliverable in WIP (awaiting revised file upload)
        result.push({
          ...d,
          tag: d.tag || d.tags || d.tagLine || '',
          tagLine: d.tagLine || d.tag || d.tags || '',
          tags: d.tags || d.tag || d.tagLine || '',
          areaOfUsage: d.areaOfUsage || '',
          drawingType: d.drawingTypeCode || d.drawingType?.code || d.drawingType?.title || '',
          drawingTypeCode: d.drawingTypeCode || d.drawingType?.code || '',
          revisionsCount: revisions.length,
          latestRevision: { ...latestRev, status: 'Superseded' },
          latestFiles: [],
          fileUrl: '',
          url: '',
          originalFileName: '',
          drawingNumber: d.drawingCode,
          approvals: d.approvals || [],
          assignedReviewers: d.assignedReviewers || (d.assignedReviewer ? [d.assignedReviewer] : []),
          assignedReviewer: d.assignedReviewer || null,
          reviewStage: 'WIP',
          reviewHistory: d.reviewHistory || [],
        });

        // 2. Superseded Record for Revision 0 (so file is displayed in Superseded rather than as active revision)
        result.push({
          ...d,
          id: `${d.id}_${latestRev.revisionCode}_SUPERSEDED`,
          status: 'Superseded',
          reviewStage: 'SUPERSEDED',
          workflowStage: 'SUPERSEDED',
          currentRevision: latestRev.revisionCode,
          drawingTitle: `${d.drawingTitle} (${latestRev.revisionCode} - Superseded)`,
          tag: d.tag || d.tags || d.tagLine || '',
          tagLine: d.tagLine || d.tag || d.tags || '',
          tags: d.tags || d.tag || d.tagLine || '',
          areaOfUsage: d.areaOfUsage || '',
          drawingType: d.drawingTypeCode || d.drawingType?.code || d.drawingType?.title || '',
          drawingTypeCode: d.drawingTypeCode || d.drawingType?.code || '',
          revisionsCount: 1,
          latestRevision: { ...latestRev, status: 'Superseded' },
          latestFiles: files,
          fileUrl: fileUrl,
          url: fileUrl,
          originalFileName: files[0]?.originalFileName || d.drawingCode,
          drawingNumber: d.drawingCode,
          approvals: [],
          assignedReviewers: [],
          assignedReviewer: null,
          reviewHistory: d.reviewHistory || [],
        });
        continue;
      }

      result.push({
        ...d,
        tag: d.tag || d.tags || d.tagLine || '',
        tagLine: d.tagLine || d.tag || d.tags || '',
        tags: d.tags || d.tag || d.tagLine || '',
        areaOfUsage: d.areaOfUsage || '',
        drawingType: d.drawingTypeCode || d.drawingType?.code || d.drawingType?.title || '',
        drawingTypeCode: d.drawingTypeCode || d.drawingType?.code || '',
        revisionsCount: revisions.length,
        latestRevision: latestRev,
        latestFiles: files,
        fileUrl: fileUrl,
        url: fileUrl,
        originalFileName: files[0]?.originalFileName || '',
        drawingNumber: d.drawingCode,
        approvals: d.approvals || [],
        assignedReviewers: d.assignedReviewers || (d.assignedReviewer ? [d.assignedReviewer] : []),
        assignedReviewer: d.assignedReviewer || null,
        reviewStage: d.reviewStage || (d.status === 'Approved' ? 'APPROVED' : d.status === 'PM Review' ? 'PROJECT_MANAGEMENT' : d.status === 'Under Review' ? 'DISCIPLINE_LEAD' : 'WIP'),
        reviewHistory: d.reviewHistory || [],
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

    const tagVal = input.tag || input.tagLine || input.tags || null;
    if (tagVal && typeof tagVal === 'string' && tagVal.trim()) {
      const tagList = tagVal.split(',').map((t: string) => t.trim()).filter(Boolean);
      if (tagList.length < 4) {
        throw new Error(`A minimum of 4 tags must be added for each drawing (currently ${tagList.length} provided).`);
      }
    }
    const areaOfUsageVal = input.areaOfUsage || null;
    const drawingTypeCodeVal = input.drawingTypeCode || input.drawingType || null;
    const drawingTypeIdVal = input.drawingTypeId || null;

    let drawing = await this.projectRepo.findDrawingByCode(drawingCode);
    if (!drawing) {
      drawing = await this.projectRepo.createDrawing({
        projectId: project.id,
        disciplineCode: discCode,
        drawingTypeId: drawingTypeIdVal,
        drawingTypeCode: drawingTypeCodeVal,
        areaOfUsage: areaOfUsageVal,
        drawingCode,
        drawingTitle: input.drawingTitle || input.title || 'Drawing Deliverable',
        level,
        sequenceNum: seq,
        status: input.status || 'Draft',
        currentRevision: input.revisionNumber || 'R00',
        tagLine: tagVal,
        tags: tagVal,
        tag: tagVal,
        preparedBy: input.preparedBy || null,
        checkedBy: input.checkedBy || null,
        approvedBy: input.approvedBy || null,
        isTemporary: Boolean(input.isTemporary ?? false),
        approvals: (input as any).approvals || [],
        assignedReviewers: (input as any).assignedReviewers || null,
        assignedReviewer: (input as any).assignedReviewer || null,
        reviewStage: (input as any).reviewStage || null,
        reviewHistory: (input as any).reviewHistory || null,
      });
    } else {
      drawing = await this.projectRepo.updateDrawing(drawing.id, {
        drawingTitle: input.drawingTitle || drawing.drawingTitle,
        status: input.status || drawing.status,
        currentRevision: input.revisionNumber || drawing.currentRevision,
        tagLine: tagVal || drawing.tagLine,
        tags: tagVal || drawing.tags,
        tag: tagVal || drawing.tag,
        preparedBy: input.preparedBy !== undefined ? input.preparedBy : drawing.preparedBy,
        checkedBy: input.checkedBy !== undefined ? input.checkedBy : drawing.checkedBy,
        approvedBy: input.approvedBy !== undefined ? input.approvedBy : drawing.approvedBy,
        areaOfUsage: areaOfUsageVal !== null ? areaOfUsageVal : drawing.areaOfUsage,
        drawingTypeCode: drawingTypeCodeVal || drawing.drawingTypeCode,
        drawingTypeId: drawingTypeIdVal || drawing.drawingTypeId,
        isTemporary: input.isTemporary !== undefined ? Boolean(input.isTemporary) : drawing.isTemporary,
        approvals: (input as any).approvals !== undefined ? (input as any).approvals : drawing.approvals,
        assignedReviewers: (input as any).assignedReviewers !== undefined ? (input as any).assignedReviewers : drawing.assignedReviewers,
        assignedReviewer: (input as any).assignedReviewer !== undefined ? (input as any).assignedReviewer : drawing.assignedReviewer,
        reviewStage: (input as any).reviewStage !== undefined ? (input as any).reviewStage : drawing.reviewStage,
        reviewHistory: (input as any).reviewHistory !== undefined ? (input as any).reviewHistory : drawing.reviewHistory,
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
      tag: drawing.tag || drawing.tags || drawing.tagLine || '',
      tagLine: drawing.tagLine || drawing.tag || drawing.tags || '',
      tags: drawing.tags || drawing.tag || drawing.tagLine || '',
      areaOfUsage: drawing.areaOfUsage || input.areaOfUsage || '',
      drawingType: drawing.drawingTypeCode || input.drawingType || '',
      drawingTypeCode: drawing.drawingTypeCode || input.drawingType || '',
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
    let drawing = await this.projectRepo.findDrawingById(drawingId);
    if (!drawing) {
      drawing = await this.projectRepo.findDrawingByCode(drawingId);
    }
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
      tag: drawing.tag || drawing.tags || drawing.tagLine || '',
      tagLine: drawing.tagLine || drawing.tag || drawing.tags || '',
      tags: drawing.tags || drawing.tag || drawing.tagLine || '',
      areaOfUsage: drawing.areaOfUsage || '',
      drawingType: drawing.drawingTypeCode || (drawing as any).drawingType?.code || (drawing as any).drawingType?.title || '',
      drawingTypeCode: drawing.drawingTypeCode || (drawing as any).drawingType?.code || '',
      drawingNumber: drawing.drawingCode,
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
    let drawing = await this.projectRepo.findDrawingById(input.drawingId);
    if (!drawing) {
      drawing = await this.projectRepo.findDrawingByCode(input.drawingId);
    }
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

    if (input.status && input.status.trim().toLowerCase() === 'finalised') {
      await this.finaliseDrawing(drawing.id);
    }

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

  /**
   * Ensures a "Superseded" folder exists for the project & discipline
   */
  async ensureSupersededFolder(projectId: string, disciplineCode?: string): Promise<FolderModel | null> {
    const existingFolders = await this.projectRepo.findFoldersByProjectId(projectId);
    if (existingFolders.length === 0) return null;

    let parentCategoryFolder: FolderModel | undefined;
    if (disciplineCode) {
      const code = disciplineCode.toUpperCase();
      parentCategoryFolder = existingFolders.find(f => {
        const n = f.name.toUpperCase();
        if (code === 'AR' && (n.includes('ARCHITECTURAL') || n.includes('3. ARCHITECTURAL'))) return true;
        if (code === 'IN' && (n.includes('INTERIOR') || n.includes('4. INTERIOR'))) return true;
        if (code === 'ST' && (n.includes('STRUCTURAL') || n.includes('5. STRUCTURAL'))) return true;
        if ((code === 'MEP' || code === 'EL' || code === 'PL' || code === 'HV' || code === 'FF') && n.includes('MEP')) return true;
        return n.includes(code);
      });
    }

    let supersededFolder = existingFolders.find(f => {
      const n = f.name.toLowerCase();
      if (!n.includes('superseded')) return false;
      if (parentCategoryFolder && f.parentFolderId === parentCategoryFolder.id) return true;
      return true;
    });

    if (!supersededFolder) {
      const rootFolder = existingFolders.find(f => f.folderType === 'ROOT' || !f.parentFolderId);
      const parentId = parentCategoryFolder ? parentCategoryFolder.id : (rootFolder ? rootFolder.id : null);
      supersededFolder = await this.projectRepo.createFolder({
        projectId,
        parentFolderId: parentId,
        name: '3. Superseded',
        folderType: 'WORKFLOW',
        sortOrder: 3,
        isSystemFolder: true,
        createdBy: 'System'
      });
    }

    return supersededFolder;
  }

  /**
   * Finalises a drawing deliverable:
   * 1. Marks this drawing with status "Finalised".
   * 2. Marks its latest revision with status "Finalised".
   * 3. Marks prior revisions of this drawing with status "Superseded".
   * 4. Identifies remaining/previous drawings matching this drawing deliverable in the project.
   * 5. Updates all those remaining/previous drawings to status "Superseded", and their revisions to "Superseded".
   * 6. Ensures a "Superseded" folder exists for the project & discipline.
   * 7. Moves associated ProjectFileModel records for superseded drawings into the "Superseded" folder.
   */
  async finaliseDrawing(idOrCode: string, companyId?: string) {
    let drawing = await this.projectRepo.findDrawingById(idOrCode);
    if (!drawing) {
      drawing = await this.projectRepo.findDrawingByCode(idOrCode);
    }
    if (!drawing) {
      throw new Error(`Drawing with ID or Code "${idOrCode}" not found.`);
    }

    // 1. Mark this drawing as Finalised
    await this.projectRepo.updateDrawing(drawing.id, {
      status: 'Finalised'
    });

    // 2. Mark latest revision as Finalised and previous revisions as Superseded
    const revisions = await this.projectRepo.findRevisionsByDrawingId(drawing.id);
    if (revisions.length > 0) {
      const latestRev = revisions[0];
      await this.projectRepo.updateRevision(latestRev.id, { status: 'Finalised' });
      for (let i = 1; i < revisions.length; i++) {
        await this.projectRepo.updateRevision(revisions[i].id, { status: 'Superseded' });
      }
    }

    // 3. Ensure Superseded folder exists in project
    const supersededFolder = await this.ensureSupersededFolder(drawing.projectId, drawing.disciplineCode);

    // 4. Find remaining/previous drawings in the same project & discipline
    const allProjectDrawings = await this.projectRepo.findDrawingsByProjectId(drawing.projectId, drawing.disciplineCode);
    const supersededDrawings: DrawingModel[] = [];

    for (const other of allProjectDrawings) {
      if (other.id === drawing.id) continue;

      const isSameCode = other.drawingCode.trim().toLowerCase() === drawing.drawingCode.trim().toLowerCase();
      const isSameType = Boolean(drawing.drawingTypeId && other.drawingTypeId === drawing.drawingTypeId && other.level === drawing.level);
      const isSameTagLine = Boolean(drawing.tagLine && other.tagLine && other.tagLine.trim().toLowerCase() === drawing.tagLine.trim().toLowerCase() && other.level === drawing.level);
      const isSameTitle = Boolean(drawing.drawingTitle && other.drawingTitle && other.drawingTitle.trim().toLowerCase() === drawing.drawingTitle.trim().toLowerCase() && other.level === drawing.level);

      if (isSameCode || isSameType || isSameTagLine || isSameTitle) {
        await this.projectRepo.updateDrawing(other.id, { status: 'Superseded' });
        await this.projectRepo.updateRevisionsByDrawingId(other.id, { status: 'Superseded' });
        supersededDrawings.push(other);

        // If files exist in project_files for this drawing, move them to the Superseded folder
        if (supersededFolder) {
          try {
            const matchingFiles = await this.projectRepo.findProjectFiles(drawing.projectId);
            for (const pf of matchingFiles) {
              const fileNameLower = pf.fileName.toLowerCase();
              const dwgCodeLower = other.drawingCode.toLowerCase();
              if (fileNameLower.includes(dwgCodeLower) || (other.tagLine && fileNameLower.includes(other.tagLine.toLowerCase()))) {
                await this.projectRepo.updateProjectFile(pf.id, {
                  folderId: supersededFolder.id,
                  approvalStatus: 'SUPERSEDED'
                });
              }
            }
          } catch (fileMoveErr) {
            console.warn('[ProjectService] File move to Superseded folder note:', fileMoveErr);
          }
        }
      }
    }

    const details = await this.getDrawingDetails(drawing.id);
    return {
      ...details,
      status: 'Finalised',
      supersededCount: supersededDrawings.length,
      supersededDrawings: supersededDrawings.map(d => ({
        id: d.id,
        drawingCode: d.drawingCode,
        drawingTitle: d.drawingTitle,
        status: 'Superseded'
      })),
      supersededFolderId: supersededFolder?.id
    };
  }

  async updateDrawing(idOrCode: string, updates: Partial<DrawingModel>) {
    let drawing = await this.projectRepo.findDrawingById(idOrCode);
    if (!drawing) {
      drawing = await this.projectRepo.findDrawingByCode(idOrCode);
    }
    if (!drawing) {
      throw new Error(`Drawing with ID or Code "${idOrCode}" not found.`);
    }

    const newTagValue = updates.tagLine !== undefined ? updates.tagLine : updates.tags !== undefined ? updates.tags : (updates as any).tag;
    if (newTagValue !== undefined && typeof newTagValue === 'string' && newTagValue.trim()) {
      const tagList = newTagValue.split(',').map((t: string) => t.trim()).filter(Boolean);
      if (tagList.length < 4) {
        throw new Error(`A minimum of 4 tags must be added for each drawing (currently ${tagList.length} provided).`);
      }
    }

    const payload: Partial<DrawingModel> = {};
    if (updates.tagLine !== undefined) {
      payload.tagLine = updates.tagLine;
      payload.tags = updates.tagLine;
      payload.tag = updates.tagLine;
    }
    if (updates.tags !== undefined && updates.tagLine === undefined) {
      payload.tags = updates.tags;
      payload.tagLine = updates.tags;
      payload.tag = updates.tags;
    }
    if ((updates as any).tag !== undefined && updates.tagLine === undefined && updates.tags === undefined) {
      payload.tag = (updates as any).tag;
      payload.tagLine = (updates as any).tag;
      payload.tags = (updates as any).tag;
    }
    if ((updates as any).areaOfUsage !== undefined) {
      payload.areaOfUsage = (updates as any).areaOfUsage;
    }
    if ((updates as any).drawingType !== undefined) {
      payload.drawingTypeCode = (updates as any).drawingType;
    }
    if ((updates as any).drawingTypeCode !== undefined) {
      payload.drawingTypeCode = (updates as any).drawingTypeCode;
    }
    if ((updates as any).drawingTypeId !== undefined) {
      payload.drawingTypeId = (updates as any).drawingTypeId;
    }
    if (updates.drawingTitle !== undefined) payload.drawingTitle = updates.drawingTitle;
    if (updates.status !== undefined) payload.status = updates.status;
    if (updates.level !== undefined) payload.level = updates.level;
    if ((updates as any).isTemporary !== undefined) {
      payload.isTemporary = Boolean((updates as any).isTemporary);
    }
    if ((updates as any).approvals !== undefined) payload.approvals = (updates as any).approvals;
    if ((updates as any).assignedReviewers !== undefined) payload.assignedReviewers = (updates as any).assignedReviewers;
    if ((updates as any).assignedReviewer !== undefined) payload.assignedReviewer = (updates as any).assignedReviewer;
    if ((updates as any).reviewStage !== undefined) payload.reviewStage = (updates as any).reviewStage;
    if ((updates as any).reviewPriority !== undefined) payload.reviewPriority = (updates as any).reviewPriority;
    if ((updates as any).reviewDueDate !== undefined) payload.reviewDueDate = (updates as any).reviewDueDate;
    if ((updates as any).reviewNotes !== undefined) payload.reviewNotes = (updates as any).reviewNotes;
    if ((updates as any).reviewedBy !== undefined) payload.reviewedBy = (updates as any).reviewedBy;
    if ((updates as any).reviewedAt !== undefined) payload.reviewedAt = (updates as any).reviewedAt;
    if ((updates as any).disciplineLeadApproved !== undefined) payload.disciplineLeadApproved = (updates as any).disciplineLeadApproved;
    if ((updates as any).disciplineLeadApprovedBy !== undefined) payload.disciplineLeadApprovedBy = (updates as any).disciplineLeadApprovedBy;
    if ((updates as any).disciplineLeadApprovedAt !== undefined) payload.disciplineLeadApprovedAt = (updates as any).disciplineLeadApprovedAt;
    if ((updates as any).pmApproved !== undefined) payload.pmApproved = (updates as any).pmApproved;
    if ((updates as any).pmApprovedBy !== undefined) payload.pmApprovedBy = (updates as any).pmApprovedBy;
    if ((updates as any).pmApprovedAt !== undefined) payload.pmApprovedAt = (updates as any).pmApprovedAt;
    if ((updates as any).reviewHistory !== undefined) payload.reviewHistory = (updates as any).reviewHistory;

    const isFinalising = updates.status && updates.status.trim().toLowerCase() === 'finalised';
    if (isFinalising) {
      if (payload.drawingTitle || payload.level || payload.tagLine) {
        await this.projectRepo.updateDrawing(drawing.id, payload);
      }
      return await this.finaliseDrawing(drawing.id);
    }

    const isRework = updates.status && updates.status.trim().toLowerCase() === 'rework';
    if (isRework) {
      await this.projectRepo.updateRevisionsByDrawingId(drawing.id, { status: 'Superseded' });
      try {
        await this.ensureSupersededFolder(drawing.projectId, drawing.disciplineCode);
      } catch { }
    }

    await this.projectRepo.updateDrawing(drawing.id, payload);
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

    // 2. High-performance batch insertion level-by-level
    // Level 1: top-level categories under rootFolder
    const project = await this.projectRepo.findProjectById(projectId);
    const includeReferences = project ? project.enableReferencesFolder : false;
    const activeTemplate = STANDARD_PROJECT_FOLDER_TEMPLATE.filter(node => {
      if (node.name.toLowerCase().includes('reference') && !includeReferences) {
        return false;
      }
      return true;
    });

    const toInsertLevel1: Partial<FolderModel>[] = [];
    for (const node of activeTemplate) {
      const match = existingFolders.find(
        f => f.parentFolderId === rootFolder!.id && f.name.trim().toLowerCase() === node.name.trim().toLowerCase()
      );
      if (!match) {
        toInsertLevel1.push({
          projectId,
          parentFolderId: rootFolder!.id,
          name: node.name,
          folderType: node.folderType || 'CATEGORY',
          sortOrder: node.sortOrder || 0,
          isSystemFolder: true,
          createdBy,
        });
      }
    }

    if (toInsertLevel1.length > 0) {
      const savedLevel1 = await this.projectRepo.createFoldersBatch(toInsertLevel1);
      existingFolders.push(...savedLevel1);
    }

    // Level 2: Children of Level 1
    const toInsertLevel2: Array<{ node: FolderTemplateNode; folderData: Partial<FolderModel> }> = [];
    for (const node of activeTemplate) {
      const parentFolder = existingFolders.find(
        f => f.parentFolderId === rootFolder!.id && f.name.trim().toLowerCase() === node.name.trim().toLowerCase()
      );
      if (!parentFolder || !node.children) continue;

      for (const child of node.children) {
        const match = existingFolders.find(
          f => f.parentFolderId === parentFolder.id && f.name.trim().toLowerCase() === child.name.trim().toLowerCase()
        );
        if (!match) {
          toInsertLevel2.push({
            node: child,
            folderData: {
              projectId,
              parentFolderId: parentFolder.id,
              name: child.name,
              folderType: child.folderType || 'CATEGORY',
              sortOrder: child.sortOrder || 0,
              isSystemFolder: true,
              createdBy,
            }
          });
        }
      }
    }

    if (toInsertLevel2.length > 0) {
      const savedLevel2 = await this.projectRepo.createFoldersBatch(toInsertLevel2.map(i => i.folderData));
      existingFolders.push(...savedLevel2);
    }

    // Level 3: Children of Level 2 (e.g. WORKFLOW subfolders)
    const toInsertLevel3: Partial<FolderModel>[] = [];
    for (const item of toInsertLevel2) {
      const parentFolder = existingFolders.find(
        f => f.parentFolderId === item.folderData.parentFolderId && f.name.trim().toLowerCase() === item.node.name.trim().toLowerCase()
      );
      if (!parentFolder || !item.node.children) continue;

      for (const grandchild of item.node.children) {
        const match = existingFolders.find(
          f => f.parentFolderId === parentFolder.id && f.name.trim().toLowerCase() === grandchild.name.trim().toLowerCase()
        );
        if (!match) {
          toInsertLevel3.push({
            projectId,
            parentFolderId: parentFolder.id,
            name: grandchild.name,
            folderType: grandchild.folderType || 'WORKFLOW',
            sortOrder: grandchild.sortOrder || 0,
            isSystemFolder: true,
            createdBy,
          });
        }
      }
    }

    if (toInsertLevel3.length > 0) {
      const savedLevel3 = await this.projectRepo.createFoldersBatch(toInsertLevel3);
      existingFolders.push(...savedLevel3);
    }

    return existingFolders;
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

    if (!Boolean(project.enableReferencesFolder)) {
      const refFolderIds = new Set<string>();
      folders.forEach(f => {
        const n = (f.name || '').toLowerCase();
        if (n.startsWith('0.') || n.includes('reference') || n.includes('moodboard') || n.includes('inspiration')) {
          refFolderIds.add(f.id);
        }
      });
      let changed = true;
      while (changed) {
        changed = false;
        folders.forEach(f => {
          if (f.parentFolderId && refFolderIds.has(f.parentFolderId) && !refFolderIds.has(f.id)) {
            refFolderIds.add(f.id);
            changed = true;
          }
        });
      }
      folders = folders.filter(f => !refFolderIds.has(f.id));
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
    const cleanName = (input.name || '').trim();
    if (!cleanName) {
      throw new Error('Folder name is required.');
    }
    if (cleanName.length < 2 || cleanName.length > 50) {
      throw new Error('Folder name must be between 2 and 50 characters.');
    }
    if (!/[a-zA-Z0-9]/.test(cleanName)) {
      throw new Error('Folder name cannot contain only special characters.');
    }
    if (/^\d+$/.test(cleanName.replace(/[\s_.\-&()'/]+/g, '')) || !/[a-zA-Z]/.test(cleanName)) {
      throw new Error('Folder name cannot be numeric-only and must contain letters.');
    }
    if (!/^[a-zA-Z0-9\s_.\-&()'/]+$/.test(cleanName)) {
      throw new Error('Folder name contains invalid characters.');
    }
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
      name: cleanName,
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
    const cleanName = (name || '').trim();
    if (!cleanName) {
      throw new Error('Folder name is required.');
    }
    if (cleanName.length < 2 || cleanName.length > 50) {
      throw new Error('Folder name must be between 2 and 50 characters.');
    }
    if (!/[a-zA-Z0-9]/.test(cleanName)) {
      throw new Error('Folder name cannot contain only special characters.');
    }
    if (/^\d+$/.test(cleanName.replace(/[\s_.\-&()'/]+/g, '')) || !/[a-zA-Z]/.test(cleanName)) {
      throw new Error('Folder name cannot be numeric-only and must contain letters.');
    }
    if (!/^[a-zA-Z0-9\s_.\-&()'/]+$/.test(cleanName)) {
      throw new Error('Folder name contains invalid characters.');
    }
    return await this.projectRepo.updateFolder(folderId, { name: cleanName });
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
    tag?: string;
    areaOfUsage?: string;
    drawingType?: string;
    isTemporary?: boolean;
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
    const tagVal = input.tag ? input.tag.trim() : input.tagLine ? input.tagLine.trim() : input.tags ? input.tags.trim() : undefined;

    return await this.projectRepo.createProjectFile({
      projectId: pId,
      folderId: input.folderId,
      fileName: input.fileName,
      filePath: input.filePath,
      fileType: input.fileType || 'application/octet-stream',
      fileSize: input.fileSize || 0,
      tagLine: tagVal,
      tags: tagVal,
      tag: tagVal,
      areaOfUsage: input.areaOfUsage ? input.areaOfUsage.trim() : undefined,
      drawingType: input.drawingType ? input.drawingType.trim() : undefined,
      isTemporary: input.isTemporary ?? false,
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

