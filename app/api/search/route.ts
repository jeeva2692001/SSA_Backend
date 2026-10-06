import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '../../../src/modules/auth/middlewares/auth.middleware';
import { getDataSource } from '../../../src/shared/config/data-source';
import { DrawingModel } from '../../../src/modules/project/models/drawing.model';
import { LeadModel } from '../../../src/modules/lead/models/lead.model';
import { ProjectModel } from '../../../src/modules/project/models/project.model';
import { ClientModel } from '../../../src/modules/client/models/client.model';
import { EmployeeModel } from '../../../src/modules/employee/models/employee.model';
import { ProjectFileModel } from '../../../src/modules/project/models/project-file.model';

function matchesQuery(fields: (string | undefined | null)[], qLower: string, tokens: string[]): boolean {
  const combined = fields.filter(Boolean).join(' ').toLowerCase();
  if (!combined) return false;

  // 1. Exact / substring match of full query phrase
  if (combined.includes(qLower)) return true;

  // 2. All tokens present in the combined text (e.g. "bedroom" and "design")
  if (tokens.length > 1 && tokens.every(tok => combined.includes(tok))) return true;

  // 3. At least one significant token match if search query is complex
  if (tokens.length > 1 && tokens.some(tok => tok.length >= 3 && combined.includes(tok))) return true;

  return false;
}

export async function GET(req: NextRequest) {
  return await authMiddleware(req, async (user: any) => {
    try {
      const url = new URL(req.url);
      const query = (url.searchParams.get('q') || '').trim();

      if (!query) {
        return NextResponse.json({
          success: true,
          data: {
            query: '',
            totalCount: 0,
            drawings: [],
            leads: [],
            projects: [],
            clients: [],
            employees: [],
            files: [],
            allResults: []
          }
        });
      }

      const qLower = query.toLowerCase();
      const tokens = qLower.split(/\s+/).filter(Boolean);
      const ds = await getDataSource();

      const drawingRepo = ds.getRepository(DrawingModel);
      const leadRepo = ds.getRepository(LeadModel);
      const projectRepo = ds.getRepository(ProjectModel);
      const clientRepo = ds.getRepository(ClientModel);
      const employeeRepo = ds.getRepository(EmployeeModel);
      const fileRepo = ds.getRepository(ProjectFileModel);

      const companyId = user.companyId || (user.role === 'Super Admin' ? undefined : user.id);
      const branchId = user.branchId;

      // 1. Search Projects First (to build allowed project map)
      const projectWhere: any = {};
      if (companyId) projectWhere.companyId = companyId;
      const allProjects = await projectRepo.find({ where: projectWhere });
      const allowedProjectIds = new Set(allProjects.map(p => p.id));
      const projectMap = new Map(allProjects.map(p => [p.id, p]));

      const matchingProjects = allProjects
        .filter((p: ProjectModel) => {
          return matchesQuery(
            [
              p.projectName,
              p.projectCode,
              p.clientName,
              p.projectType,
              p.status,
              (p as any).description,
              (p as any).location,
              (p as any).category
            ],
            qLower,
            tokens
          );
        })
        .slice(0, 10)
        .map((p: ProjectModel) => ({
          id: p.id,
          type: 'project' as const,
          title: p.projectName,
          subtitle: `${p.projectCode} • ${p.clientName || 'Client'} • ${p.projectType || 'Project'}`,
          status: p.status || 'Active',
          projectId: p.id,
          projectCode: p.projectCode,
          projectName: p.projectName,
          clientName: p.clientName,
          url: `/crm/drawings`
        }));

      // 2. Search Drawings (including tagLine, tags, level, drawingType)
      const allDrawings = await drawingRepo.find({
        relations: { project: true, drawingType: true }
      });
      const matchingDrawings = allDrawings
        .filter((d: DrawingModel) => {
          const proj = d.project || (d.projectId ? projectMap.get(d.projectId) : undefined);
          if (companyId && d.projectId && !allowedProjectIds.has(d.projectId) && d.project?.companyId !== companyId) {
            return false;
          }

          return matchesQuery(
            [
              d.drawingTitle,
              d.drawingCode,
              d.disciplineCode,
              d.tagLine,
              d.tags,
              d.status,
              d.level,
              d.drawingType?.title,
              d.drawingType?.code,
              proj?.projectName,
              proj?.projectCode,
              proj?.clientName,
              d.coordinationNote
            ],
            qLower,
            tokens
          );
        })
        .slice(0, 12)
        .map((d: DrawingModel) => {
          const proj = d.project || (d.projectId ? projectMap.get(d.projectId) : undefined);
          const tagInfo = d.tagLine || d.tags;
          return {
            id: d.id,
            type: 'drawing' as const,
            title: d.drawingTitle || d.drawingCode,
            subtitle: `${d.drawingCode} • ${proj?.projectName || 'Project'} • ${d.level || 'GF'}${tagInfo ? ` • [${tagInfo}]` : ''}`,
            status: d.status || 'Draft',
            discipline: d.disciplineCode,
            projectId: d.projectId || proj?.id || proj?.projectCode,
            projectCode: proj?.projectCode,
            projectName: proj?.projectName,
            url: `/crm/drawings`
          };
        });

      // 3. Search Project Files (uploaded drawing files with tags/tagLine)
      let matchingFiles: any[] = [];
      try {
        const allFiles = await fileRepo.find();
        matchingFiles = allFiles
          .filter((f: ProjectFileModel) => {
            if (companyId && f.projectId && !allowedProjectIds.has(f.projectId)) {
              return false;
            }
            return matchesQuery(
              [f.fileName, f.tagLine, f.tags, f.approvalStatus, f.uploadedBy, f.fileType],
              qLower,
              tokens
            );
          })
          .slice(0, 8)
          .map((f: ProjectFileModel) => {
            const proj = f.projectId ? projectMap.get(f.projectId) : undefined;
            const tagInfo = f.tagLine || f.tags;
            return {
              id: f.id,
              type: 'drawing' as const,
              title: f.fileName,
              subtitle: `File • ${proj?.projectName || 'Project'} • ${f.approvalStatus || 'Draft'}${tagInfo ? ` • [${tagInfo}]` : ''}`,
              status: f.approvalStatus || 'Active',
              projectId: f.projectId,
              projectCode: proj?.projectCode,
              projectName: proj?.projectName,
              url: `/crm/drawings`
            };
          });
      } catch (fileErr) {
        console.warn('File search skipped or table not initialized:', fileErr);
      }

      // 4. Search Leads
      const leadWhere: any = {};
      if (companyId) leadWhere.companyId = companyId;
      if (branchId) leadWhere.branchId = branchId;
      const allLeads = await leadRepo.find({ where: leadWhere });
      const matchingLeads = allLeads
        .filter((l: LeadModel) => {
          return matchesQuery(
            [
              l.leadId,
              l.leadTitle,
              l.company,
              l.contactPerson,
              l.email,
              l.mobile,
              l.projectType,
              l.status,
              (l as any).city,
              (l as any).location,
              (l as any).requirements,
              (l as any).scope,
              (l as any).notes
            ],
            qLower,
            tokens
          );
        })
        .slice(0, 8)
        .map((l: LeadModel) => ({
          id: String(l.id),
          type: 'lead' as const,
          title: l.leadTitle || l.company || l.leadId,
          subtitle: `${l.leadId} • ${l.contactPerson || l.company || 'Lead'} • ${l.projectType || 'General'}`,
          status: l.status || 'Lead',
          url: `/crm/leads`
        }));

      // 5. Search Clients
      const clientWhere: any = {};
      if (companyId) clientWhere.companyId = companyId;
      if (branchId) clientWhere.branchId = branchId;
      const allClients = await clientRepo.find({ where: clientWhere });
      const matchingClients = allClients
        .filter((c: ClientModel) => {
          return matchesQuery(
            [
              c.clientCode,
              c.clientName,
              c.company,
              c.contactPerson,
              c.email,
              c.mobile,
              c.alternatePhone,
              c.city,
              c.address
            ],
            qLower,
            tokens
          );
        })
        .slice(0, 8)
        .map((c: ClientModel) => ({
          id: c.id,
          type: 'client' as const,
          title: c.clientName || c.company || c.clientCode,
          subtitle: `${c.clientCode} • ${c.company || c.email || c.city || 'Client'}`,
          status: c.status || 'Active',
          url: `/crm/clients`
        }));

      // 6. Search Employees
      const employeeWhere: any = {};
      if (branchId) employeeWhere.branchId = branchId;
      const allEmployees = await employeeRepo.find({ where: employeeWhere });
      const matchingEmployees = allEmployees
        .filter((e: EmployeeModel) => {
          return matchesQuery(
            [e.employeeId, e.name, e.email, e.phone, e.department, e.designation],
            qLower,
            tokens
          );
        })
        .slice(0, 8)
        .map((e: EmployeeModel) => ({
          id: String(e.id),
          type: 'employee' as const,
          title: e.name,
          subtitle: `${e.employeeId} • ${e.designation} (${e.department})`,
          status: e.status || 'Active',
          url: `/employees/list`
        }));

      // Combine drawings and matching file records under drawing/files
      const combinedDrawings = [...matchingDrawings, ...matchingFiles];

      const allResults = [
        ...combinedDrawings,
        ...matchingLeads,
        ...matchingProjects,
        ...matchingClients,
        ...matchingEmployees
      ];

      const totalCount = allResults.length;

      return NextResponse.json({
        success: true,
        data: {
          query,
          totalCount,
          drawings: combinedDrawings,
          leads: matchingLeads,
          projects: matchingProjects,
          clients: matchingClients,
          employees: matchingEmployees,
          allResults
        }
      });
    } catch (error: any) {
      console.error('Search error:', error);
      return NextResponse.json(
        { success: false, message: error.message || 'Search failed', data: { totalCount: 0, allResults: [] } },
        { status: 500 }
      );
    }
  });
}
