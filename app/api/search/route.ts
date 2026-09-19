import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '../../../src/modules/auth/middlewares/auth.middleware';
import { getDataSource } from '../../../src/shared/config/data-source';
import { DrawingModel } from '../../../src/modules/project/models/drawing.model';
import { LeadModel } from '../../../src/modules/lead/models/lead.model';
import { ProjectModel } from '../../../src/modules/project/models/project.model';
import { ClientModel } from '../../../src/modules/client/models/client.model';
import { EmployeeModel } from '../../../src/modules/employee/models/employee.model';

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
            allResults: []
          }
        });
      }

      const qLower = query.toLowerCase();
      const ds = await getDataSource();

      const drawingRepo = ds.getRepository(DrawingModel);
      const leadRepo = ds.getRepository(LeadModel);
      const projectRepo = ds.getRepository(ProjectModel);
      const clientRepo = ds.getRepository(ClientModel);
      const employeeRepo = ds.getRepository(EmployeeModel);

      const companyId = user.companyId || (user.role === 'Super Admin' ? undefined : user.id);
      const branchId = user.branchId;

      // 1. Search Drawings
      const allDrawings = await drawingRepo.find({
        relations: { project: true, drawingType: true }
      });
      const matchingDrawings = allDrawings
        .filter((d: DrawingModel) => {
          const projectMatch = !companyId || d.project?.companyId === companyId;
          if (!projectMatch) return false;

          const title = (d.drawingTitle || '').toLowerCase();
          const code = (d.drawingCode || '').toLowerCase();
          const disc = (d.disciplineCode || '').toLowerCase();
          const status = (d.status || '').toLowerCase();
          const projName = (d.project?.projectName || '').toLowerCase();
          const projCode = (d.project?.projectCode || '').toLowerCase();

          return (
            title.includes(qLower) ||
            code.includes(qLower) ||
            disc.includes(qLower) ||
            status.includes(qLower) ||
            projName.includes(qLower) ||
            projCode.includes(qLower)
          );
        })
        .slice(0, 8)
        .map((d: DrawingModel) => ({
          id: d.id,
          type: 'drawing' as const,
          title: d.drawingTitle || d.drawingCode,
          subtitle: `${d.drawingCode} • ${d.project?.projectName || 'Project'} • ${d.level || 'GF'}`,
          status: d.status || 'Draft',
          discipline: d.disciplineCode,
          projectId: d.projectId || d.project?.id || d.project?.projectCode,
          projectCode: d.project?.projectCode,
          projectName: d.project?.projectName,
          url: `/crm/drawings`
        }));

      // 2. Search Leads
      const leadWhere: any = {};
      if (companyId) leadWhere.companyId = companyId;
      if (branchId) leadWhere.branchId = branchId;
      const allLeads = await leadRepo.find({ where: leadWhere });
      const matchingLeads = allLeads
        .filter((l: LeadModel) => {
          const leadId = (l.leadId || '').toLowerCase();
          const title = (l.leadTitle || '').toLowerCase();
          const company = (l.company || '').toLowerCase();
          const contact = (l.contactPerson || '').toLowerCase();
          const email = (l.email || '').toLowerCase();
          const mobile = (l.mobile || '').toLowerCase();
          const type = (l.projectType || '').toLowerCase();
          const status = (l.status || '').toLowerCase();

          return (
            leadId.includes(qLower) ||
            title.includes(qLower) ||
            company.includes(qLower) ||
            contact.includes(qLower) ||
            email.includes(qLower) ||
            mobile.includes(qLower) ||
            type.includes(qLower) ||
            status.includes(qLower)
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

      // 3. Search Projects
      const projectWhere: any = {};
      if (companyId) projectWhere.companyId = companyId;
      const allProjects = await projectRepo.find({ where: projectWhere });
      const matchingProjects = allProjects
        .filter((p: ProjectModel) => {
          const name = (p.projectName || '').toLowerCase();
          const code = (p.projectCode || '').toLowerCase();
          const client = (p.clientName || '').toLowerCase();
          const type = (p.projectType || '').toLowerCase();
          const status = (p.status || '').toLowerCase();

          return (
            name.includes(qLower) ||
            code.includes(qLower) ||
            client.includes(qLower) ||
            type.includes(qLower) ||
            status.includes(qLower)
          );
        })
        .slice(0, 8)
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

      // 4. Search Clients
      const clientWhere: any = {};
      if (companyId) clientWhere.companyId = companyId;
      if (branchId) clientWhere.branchId = branchId;
      const allClients = await clientRepo.find({ where: clientWhere });
      const matchingClients = allClients
        .filter((c: ClientModel) => {
          const code = (c.clientCode || '').toLowerCase();
          const name = (c.clientName || '').toLowerCase();
          const comp = (c.company || '').toLowerCase();
          const contact = (c.contactPerson || '').toLowerCase();
          const email = (c.email || '').toLowerCase();
          const phone = (c.mobile || c.alternatePhone || '').toLowerCase();
          const city = (c.city || '').toLowerCase();

          return (
            code.includes(qLower) ||
            name.includes(qLower) ||
            comp.includes(qLower) ||
            contact.includes(qLower) ||
            email.includes(qLower) ||
            phone.includes(qLower) ||
            city.includes(qLower)
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

      // 5. Search Employees
      const employeeWhere: any = {};
      if (branchId) employeeWhere.branchId = branchId;
      const allEmployees = await employeeRepo.find({ where: employeeWhere });
      const matchingEmployees = allEmployees
        .filter((e: EmployeeModel) => {
          const empId = (e.employeeId || '').toLowerCase();
          const name = (e.name || '').toLowerCase();
          const email = (e.email || '').toLowerCase();
          const phone = (e.phone || '').toLowerCase();
          const dept = (e.department || '').toLowerCase();
          const desig = (e.designation || '').toLowerCase();

          return (
            empId.includes(qLower) ||
            name.includes(qLower) ||
            email.includes(qLower) ||
            phone.includes(qLower) ||
            dept.includes(qLower) ||
            desig.includes(qLower)
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

      const allResults = [
        ...matchingDrawings,
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
          drawings: matchingDrawings,
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
