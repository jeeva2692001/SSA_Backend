import { getDataSource } from '../../../shared/config/data-source';
import { InvoiceModel } from '../../billing/models/invoice.model';
import { EmployeeModel } from '../../employee/models/employee.model';
import { TaskModel } from '../../task/models/task.model';
import { ResourceAllocationModel } from '../../resource/models/resource-allocation.model';
import { LeadModel } from '../../lead/models/lead.model';
import { OpportunityModel } from '../../lead/models/opportunity.model';
import { ClientModel } from '../../client/models/client.model';
import { ProjectModel } from '../../project/models/project.model';
import { MilestoneModel } from '../../project/models/milestone.model';
import { VendorModel } from '../../vendor/models/vendor.model';

export class ReportService {
  // 1. REVENUE AND FINANCIAL REPORT (Original Data Only - Deduplicated)
  async getRevenueReport(companyId?: string, branchId?: string | null, fiscalYear?: string) {
    const ds = await getDataSource();
    const invoiceRepo = ds.getRepository(InvoiceModel);

    const where: any = {};
    if (companyId) where.companyId = companyId;
    if (branchId && branchId !== 'All Branches') where.branchId = branchId;

    const rawInvoices = await invoiceRepo.find({
      where,
      order: { issueDate: 'DESC' }
    });

    // Strict deduplication by ID and invoiceNumber
    const invoices: InvoiceModel[] = [];
    const seenInvIds = new Set<string>();
    const seenInvNums = new Set<string>();

    for (const inv of rawInvoices) {
      const idKey = String(inv.id);
      const numKey = (inv.invoiceNumber || '').trim().toUpperCase();
      if (seenInvIds.has(idKey)) continue;
      if (numKey && seenInvNums.has(numKey)) continue;
      seenInvIds.add(idKey);
      if (numKey) seenInvNums.add(numKey);
      invoices.push(inv);
    }

    let totalBilled = 0;
    let totalCollected = 0;
    let paidCount = 0;
    let partialCount = 0;
    let pendingCount = 0;
    let overdueCount = 0;

    const projectRevenueMap: Record<string, { projectName: string; clientName: string; billed: number; collected: number; count: number }> = {};

    const formattedInvoices = invoices.map(inv => {
      const bAmt = Number(inv.billingAmount) || 0;
      const cAmt = Number(inv.collectionAmount) || 0;
      const outstanding = Math.max(0, bAmt - cAmt);

      totalBilled += bAmt;
      totalCollected += cAmt;

      const st = inv.status || 'Pending';
      if (st === 'Paid') paidCount++;
      else if (st === 'Partially Paid') partialCount++;
      else if (st === 'Overdue') overdueCount++;
      else pendingCount++;

      const pKey = inv.projectName || inv.projectId || 'Unassigned';
      if (!projectRevenueMap[pKey]) {
        projectRevenueMap[pKey] = {
          projectName: inv.projectName || '-',
          clientName: inv.clientName || '-',
          billed: 0,
          collected: 0,
          count: 0
        };
      }
      projectRevenueMap[pKey].billed += bAmt;
      projectRevenueMap[pKey].collected += cAmt;
      projectRevenueMap[pKey].count += 1;

      return {
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        projectName: inv.projectName || '-',
        clientName: inv.clientName || '-',
        title: inv.title || '-',
        billingAmount: bAmt,
        collectionAmount: cAmt,
        outstanding,
        status: inv.status,
        issueDate: inv.issueDate || '-',
        dueDate: inv.dueDate || '-',
        paymentDate: inv.paymentDate || '-',
        notes: inv.notes || ''
      };
    });

    const outstandingTotal = Math.max(0, totalBilled - totalCollected);
    const collectionRate = totalBilled > 0 ? Math.round((totalCollected / totalBilled) * 1000) / 10 : 0;

    // Monthly analytics calculated strictly from real invoices
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const now = new Date();
    const monthlyTrend: Array<{ month: string; billing: number; collection: number; pipeline: number }> = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const yearMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = monthNames[d.getMonth()];

      let mBilled = 0;
      let mCollected = 0;

      invoices.forEach(inv => {
        if (inv.issueDate && inv.issueDate.startsWith(yearMonth)) {
          mBilled += Number(inv.billingAmount) || 0;
          mCollected += Number(inv.collectionAmount) || 0;
        }
      });

      monthlyTrend.push({
        month: label,
        billing: mBilled,
        collection: mCollected,
        pipeline: Math.max(0, mBilled - mCollected)
      });
    }

    const projectBreakdown = Object.values(projectRevenueMap).map(p => ({
      ...p,
      outstanding: Math.max(0, p.billed - p.collected),
      realizationRate: p.billed > 0 ? Math.round((p.collected / p.billed) * 1000) / 10 : 0
    })).sort((a, b) => b.billed - a.billed);

    return {
      summary: {
        totalBilled,
        totalCollected,
        outstandingTotal,
        collectionRate,
        invoiceCounts: {
          total: invoices.length,
          paid: paidCount,
          partiallyPaid: partialCount,
          pending: pendingCount,
          overdue: overdueCount
        }
      },
      monthlyTrend,
      projectBreakdown,
      records: formattedInvoices
    };
  }

  // 2. EMPLOYEE UTILIZATION REPORT (Original Data Only - Deduplicated)
  async getEmployeeUtilizationReport(companyId?: string, branchId?: string | null) {
    const ds = await getDataSource();
    const employeeRepo = ds.getRepository(EmployeeModel);
    const taskRepo = ds.getRepository(TaskModel);
    const allocRepo = ds.getRepository(ResourceAllocationModel);

    const empWhere: any = {};
    if (companyId) empWhere.companyId = companyId;
    if (branchId && branchId !== 'All Branches') empWhere.branchId = branchId;

    const rawEmployees = await employeeRepo.find({
      where: empWhere,
      order: { name: 'ASC' }
    });

    // Deduplicate employees by ID, employeeId, and normalized name
    const employees: EmployeeModel[] = [];
    const seenEmpIds = new Set<string>();
    const seenEmpCodes = new Set<string>();
    const seenEmpNames = new Set<string>();

    for (const emp of rawEmployees) {
      const idKey = String(emp.id);
      const codeKey = (emp.employeeId || '').trim().toUpperCase();
      const nameKey = (emp.name || '').trim().toLowerCase();
      if (seenEmpIds.has(idKey)) continue;
      if (codeKey && seenEmpCodes.has(codeKey)) continue;
      if (nameKey && seenEmpNames.has(nameKey)) continue;
      seenEmpIds.add(idKey);
      if (codeKey) seenEmpCodes.add(codeKey);
      if (nameKey) seenEmpNames.add(nameKey);
      employees.push(emp);
    }

    const tasks = await taskRepo.find();
    let allocations: ResourceAllocationModel[] = [];
    try {
      allocations = await allocRepo.find({ where: { status: 'Active' } });
    } catch (e) {
      // safe fallback
    }

    const deptMap: Record<string, { department: string; headcount: number; totalAllocatedHours: number; capacityHours: number }> = {};

    let totalAllocatedHoursAll = 0;
    let availableCount = 0;
    let optimalCount = 0;
    let overloadedCount = 0;

    const records = employees.map(emp => {
      const dept = emp.department || 'General';
      if (!deptMap[dept]) {
        deptMap[dept] = { department: dept, headcount: 0, totalAllocatedHours: 0, capacityHours: 0 };
      }
      deptMap[dept].headcount += 1;
      deptMap[dept].capacityHours += 40;

      // Find real allocations for this employee
      const empAlloc = allocations.filter(a =>
        a.resourceId === emp.employeeId ||
        a.resourceId === String(emp.id) ||
        (a.resourceName && emp.name && a.resourceName.toLowerCase().trim() === emp.name.toLowerCase().trim())
      );

      // Find real tasks for this employee
      const empTasks = tasks.filter(t =>
        t.assignedToId === emp.employeeId ||
        (t.assignedTo && emp.name && t.assignedTo.toLowerCase().trim() === emp.name.toLowerCase().trim())
      );

      const activeTasksCount = empTasks.filter(t => t.status !== 'Done').length;
      const completedTasksCount = empTasks.filter(t => t.status === 'Done').length;

      // Calculated strictly from actual resource allocations or active tasks
      let allocatedHours = empAlloc.reduce((sum, a) => sum + (Number(a.weeklyHours) || 0), 0);
      if (allocatedHours === 0 && activeTasksCount > 0) {
        allocatedHours = activeTasksCount * 8;
      }

      totalAllocatedHoursAll += allocatedHours;
      deptMap[dept].totalAllocatedHours += allocatedHours;

      const capacityHours = 40;
      const utilizationRate = capacityHours > 0 ? Math.round((allocatedHours / capacityHours) * 100) : 0;

      let status: 'Available' | 'Optimal' | 'Overloaded' = 'Available';
      if (utilizationRate > 100) {
        status = 'Overloaded';
        overloadedCount++;
      } else if (utilizationRate >= 80) {
        status = 'Optimal';
        optimalCount++;
      } else {
        status = 'Available';
        availableCount++;
      }

      return {
        id: emp.id,
        employeeId: emp.employeeId || `EMP-${emp.id}`,
        name: emp.name,
        email: emp.email || '-',
        phone: emp.phone || '-',
        department: dept,
        designation: emp.designation || '-',
        manager: emp.manager || '-',
        status: emp.status || 'Active',
        joiningDate: emp.joiningDate || '-',
        activeTasksCount,
        completedTasksCount,
        allocatedHours,
        capacityHours,
        utilizationRate,
        workloadStatus: status
      };
    });

    const totalHeadcount = employees.length;
    const totalCapacity = totalHeadcount * 40;
    const avgUtilization = totalCapacity > 0 ? Math.round((totalAllocatedHoursAll / totalCapacity) * 100) : 0;

    const departmentBreakdown = Object.values(deptMap).map(d => ({
      ...d,
      averageUtilization: d.capacityHours > 0 ? Math.round((d.totalAllocatedHours / d.capacityHours) * 100) : 0
    })).sort((a, b) => b.averageUtilization - a.averageUtilization);

    return {
      summary: {
        totalHeadcount,
        activeStaff: employees.filter(e => (e.status || '').toLowerCase() === 'active').length,
        averageUtilization: avgUtilization,
        totalAllocatedHours: totalAllocatedHoursAll,
        totalCapacityHours: totalCapacity,
        statusCounts: {
          available: availableCount,
          optimal: optimalCount,
          overloaded: overloadedCount
        }
      },
      departmentBreakdown,
      records
    };
  }

  // 3. LEAD FUNNEL REPORT (Original Data Only - Strictly Deduplicated)
  async getLeadFunnelReport(companyId?: string, branchId?: string | null) {
    const ds = await getDataSource();
    const leadRepo = ds.getRepository(LeadModel);
    const oppRepo = ds.getRepository(OpportunityModel);

    const leadWhere: any = {};
    if (companyId) leadWhere.companyId = companyId;
    if (branchId && branchId !== 'All Branches') leadWhere.branchId = branchId;

    const rawLeads = await leadRepo.find({ where: leadWhere, order: { id: 'DESC' } });
    const oppWhere: any = {};
    if (companyId) oppWhere.companyId = companyId;
    if (branchId && branchId !== 'All Branches') oppWhere.branchId = branchId;
    const rawDeals = await oppRepo.find({ where: oppWhere, order: { createdAt: 'DESC' } });

    // 1. Deduplicate opportunities among themselves
    const uniqueDeals: OpportunityModel[] = [];
    const seenDealIds = new Set<string>();
    const seenDealCodes = new Set<string>();
    const seenDealNames = new Set<string>();

    for (const deal of rawDeals) {
      const idKey = String(deal.id);
      const codeKey = (deal.dealId || '').trim().toUpperCase();
      const nameKey = (deal.name || '').trim().toLowerCase();
      if (seenDealIds.has(idKey)) continue;
      if (codeKey && seenDealCodes.has(codeKey)) continue;
      if (nameKey && seenDealNames.has(nameKey)) continue;
      seenDealIds.add(idKey);
      if (codeKey) seenDealCodes.add(codeKey);
      if (nameKey) seenDealNames.add(nameKey);
      uniqueDeals.push(deal);
    }

    // Build tracking identifiers for leads already represented in Opportunities
    const coveredLeadKeys = new Set<string>();
    uniqueDeals.forEach(deal => {
      if (deal.leadId) {
        const raw = String(deal.leadId).trim().toLowerCase();
        coveredLeadKeys.add(raw);
        const digits = raw.replace(/\D/g, '');
        if (digits) {
          coveredLeadKeys.add(digits);
          coveredLeadKeys.add(String(parseInt(digits, 10)));
          coveredLeadKeys.add(`lead-${digits}`);
          coveredLeadKeys.add(`lead-${String(parseInt(digits, 10)).padStart(3, '0')}`);
        }
      }
      if (deal.name) {
        coveredLeadKeys.add(deal.name.trim().toLowerCase());
      }
    });

    // 2. Filter Leads: deduplicate among themselves and exclude any lead already converted into an Opportunity
    const uniqueRemainingLeads: LeadModel[] = [];
    const seenLeadIds = new Set<string>();
    const seenLeadCodes = new Set<string>();
    const seenLeadTitles = new Set<string>();

    for (const l of rawLeads) {
      const idStr = String(l.id).trim().toLowerCase();
      const codeStr = (l.leadId || '').trim().toLowerCase();
      const titleStr = (l.leadTitle || '').trim().toLowerCase();

      // Deduplicate leads
      if (seenLeadIds.has(idStr)) continue;
      if (codeStr && seenLeadCodes.has(codeStr)) continue;
      if (titleStr && seenLeadTitles.has(titleStr)) continue;
      seenLeadIds.add(idStr);
      if (codeStr) seenLeadCodes.add(codeStr);
      if (titleStr) seenLeadTitles.add(titleStr);

      // Check if already mapped to an Opportunity
      const isRepresentedInDeals =
        coveredLeadKeys.has(idStr) ||
        (codeStr && coveredLeadKeys.has(codeStr)) ||
        (titleStr && coveredLeadKeys.has(titleStr)) ||
        uniqueDeals.some(d => {
          if (d.leadId && (String(d.leadId) === idStr || String(d.leadId) === codeStr)) return true;
          if (d.name && l.leadTitle && d.name.trim().toLowerCase() === l.leadTitle.trim().toLowerCase()) return true;
          if (d.company && l.company && d.company.trim().toLowerCase() === l.company.trim().toLowerCase()) {
            if (d.clientName && l.contactPerson && d.clientName.trim().toLowerCase() === l.contactPerson.trim().toLowerCase()) return true;
          }
          return false;
        });

      if (isRepresentedInDeals) {
        // Already tracked as an Opportunity deal in the funnel
        continue;
      }

      uniqueRemainingLeads.push(l);
    }

    // Funnel Stages Defined
    const stageDefinitions = [
      { id: 'lead', name: 'New Lead / Inquiries', targetOrder: 1 },
      { id: 'requirement', name: 'Requirement Analysis', targetOrder: 2 },
      { id: 'brief', name: 'Client Brief & Site Visit', targetOrder: 3 },
      { id: 'proposal', name: 'Proposal Sent', targetOrder: 4 },
      { id: 'negotiation', name: 'Negotiation', targetOrder: 5 },
      { id: 'won', name: 'Closed Won', targetOrder: 6 },
      { id: 'lost', name: 'Closed Lost', targetOrder: 7 },
    ];

    const stageMap: Record<string, { stage: string; count: number; totalValue: number; conversionRate: number }> = {};
    stageDefinitions.forEach(sd => {
      stageMap[sd.id] = { stage: sd.name, count: 0, totalValue: 0, conversionRate: 0 };
    });

    let totalPipelineValue = 0;
    let wonValue = 0;
    let wonCount = 0;

    const records: Array<{
      id: string;
      dealId: string;
      name: string;
      clientName: string;
      company: string;
      dealValue: number;
      probability: number;
      stage: string;
      expectedClosureDate: string;
      assignedEmployee: string;
      notes: string;
    }> = [];

    const seenRecordKeys = new Set<string>();

    // Add unique active Opportunities
    uniqueDeals.forEach(deal => {
      const val = Number(deal.dealValue) || 0;
      totalPipelineValue += val;

      const stageLower = (deal.stage || '').toLowerCase();
      let key = 'lead';
      if (stageLower.includes('won') || stageLower.includes('convert')) {
        key = 'won';
        wonValue += val;
        wonCount++;
      } else if (stageLower.includes('lost') || stageLower.includes('reject')) {
        key = 'lost';
      } else if (stageLower.includes('negotiat')) {
        key = 'negotiation';
      } else if (stageLower.includes('proposal')) {
        key = 'proposal';
      } else if (stageLower.includes('brief') || stageLower.includes('discovery')) {
        key = 'brief';
      } else if (stageLower.includes('require')) {
        key = 'requirement';
      } else {
        key = 'lead';
      }

      stageMap[key].count += 1;
      stageMap[key].totalValue += val;

      const recKey = (deal.dealId || deal.id).toUpperCase();
      if (!seenRecordKeys.has(recKey)) {
        seenRecordKeys.add(recKey);
        records.push({
          id: deal.id,
          dealId: deal.dealId || `OPP-${deal.id.slice(0, 8)}`,
          name: deal.name || '-',
          clientName: deal.clientName || '-',
          company: deal.company || deal.clientName || '-',
          dealValue: val,
          probability: deal.probability ?? 50,
          stage: deal.stage || 'Proposal Sent',
          expectedClosureDate: deal.expectedClosureDate || '-',
          assignedEmployee: deal.assignedEmployee || '-',
          notes: deal.notes || ''
        });
      }
    });

    // Add remaining distinct unconverted Leads
    uniqueRemainingLeads.forEach(l => {
      const val = parseFloat(String(l.estimatedBudget || '0').replace(/[^0-9.]/g, '')) || 0;
      totalPipelineValue += val;

      const statusLower = (l.status || '').toLowerCase();
      let key = 'lead';
      if (statusLower.includes('won') || statusLower.includes('converted')) {
        key = 'won';
        wonValue += val;
        wonCount++;
      } else if (statusLower.includes('lost')) {
        key = 'lost';
      } else if (statusLower.includes('require')) {
        key = 'requirement';
      } else if (statusLower.includes('brief')) {
        key = 'brief';
      } else if (statusLower.includes('proposal')) {
        key = 'proposal';
      } else if (statusLower.includes('negotiat')) {
        key = 'negotiation';
      } else {
        key = 'lead';
      }

      stageMap[key].count += 1;
      stageMap[key].totalValue += val;

      const recKey = (l.leadId || String(l.id)).toUpperCase();
      if (!seenRecordKeys.has(recKey)) {
        seenRecordKeys.add(recKey);
        records.push({
          id: String(l.id),
          dealId: l.leadId || `LEAD-${l.id}`,
          name: l.leadTitle || `Lead #${l.id}`,
          clientName: l.contactPerson || l.company || '-',
          company: l.company || l.contactPerson || '-',
          dealValue: val,
          probability: key === 'won' ? 100 : key === 'lost' ? 0 : 20,
          stage: l.status || 'Lead',
          expectedClosureDate: l.expectedStartDate || '-',
          assignedEmployee: l.assignedEmployee || '-',
          notes: l.siteAddress || ''
        });
      }
    });

    const totalDeals = records.length;
    const overallConversionRate = totalDeals > 0 ? Math.round((wonCount / totalDeals) * 1000) / 10 : 0;

    const funnelStages = stageDefinitions.map(sd => {
      const entry = stageMap[sd.id];
      const convRate = totalDeals > 0 ? Math.round((entry.count / totalDeals) * 100) : 0;
      return {
        ...entry,
        conversionRate: convRate
      };
    });

    return {
      summary: {
        totalLeadsTracked: totalDeals,
        activePipelineDeals: Math.max(0, totalDeals - wonCount - stageMap['lost'].count),
        totalPipelineValue,
        wonDealsCount: wonCount,
        wonDealValue: wonValue,
        conversionRate: overallConversionRate
      },
      funnelStages,
      records
    };
  }

  // 4. CLIENT PORTFOLIO REPORT (Original Data Only - Deduplicated)
  async getClientPortfolioReport(companyId?: string, branchId?: string | null) {
    const ds = await getDataSource();
    const clientRepo = ds.getRepository(ClientModel);
    const projectRepo = ds.getRepository(ProjectModel);
    const invoiceRepo = ds.getRepository(InvoiceModel);

    const clientWhere: any = {};
    if (companyId) clientWhere.companyId = companyId;
    if (branchId && branchId !== 'All Branches') clientWhere.branchId = branchId;

    const rawClients = await clientRepo.find({ where: clientWhere, order: { clientName: 'ASC' } });
    const rawProjects = await projectRepo.find();
    const rawInvoices = await invoiceRepo.find();

    // Deduplicate clients
    const clients: ClientModel[] = [];
    const seenClientIds = new Set<string>();
    const seenClientCodes = new Set<string>();
    const seenClientNames = new Set<string>();

    for (const cl of rawClients) {
      const idKey = String(cl.id);
      const codeKey = (cl.clientCode || '').trim().toUpperCase();
      const nameKey = (cl.clientName || '').trim().toLowerCase();
      if (seenClientIds.has(idKey)) continue;
      if (codeKey && seenClientCodes.has(codeKey)) continue;
      if (nameKey && seenClientNames.has(nameKey)) continue;
      seenClientIds.add(idKey);
      if (codeKey) seenClientCodes.add(codeKey);
      if (nameKey) seenClientNames.add(nameKey);
      clients.push(cl);
    }

    // Deduplicate projects
    const allProjects: ProjectModel[] = [];
    const seenPrjIds = new Set<string>();
    const seenPrjCodes = new Set<string>();
    for (const p of rawProjects) {
      const idKey = String(p.id);
      const codeKey = (p.projectCode || '').trim().toUpperCase();
      if (seenPrjIds.has(idKey)) continue;
      if (codeKey && seenPrjCodes.has(codeKey)) continue;
      seenPrjIds.add(idKey);
      if (codeKey) seenPrjCodes.add(codeKey);
      allProjects.push(p);
    }

    // Deduplicate invoices
    const allInvoices: InvoiceModel[] = [];
    const seenInvIds = new Set<string>();
    const seenInvNums = new Set<string>();
    for (const inv of rawInvoices) {
      const idKey = String(inv.id);
      const numKey = (inv.invoiceNumber || '').trim().toUpperCase();
      if (seenInvIds.has(idKey)) continue;
      if (numKey && seenInvNums.has(numKey)) continue;
      seenInvIds.add(idKey);
      if (numKey) seenInvNums.add(numKey);
      allInvoices.push(inv);
    }

    let aggregatePortfolioValue = 0;
    let aggregateInvoiced = 0;
    let aggregateCollected = 0;

    const typeDistribution: Record<string, { type: string; count: number; totalValue: number }> = {};

    const records = clients.map(cl => {
      // Find actual projects for this client in database
      const clProjects = allProjects.filter(p =>
        p.clientId === cl.id ||
        (p.clientName && cl.clientName && p.clientName.toLowerCase().trim() === cl.clientName.toLowerCase().trim()) ||
        (p.clientName && cl.company && p.clientName.toLowerCase().trim() === cl.company.toLowerCase().trim())
      );

      // Find actual invoices for this client in database
      const clInvoices = allInvoices.filter(i =>
        i.clientId === cl.id ||
        (i.clientName && cl.clientName && i.clientName.toLowerCase().trim() === cl.clientName.toLowerCase().trim()) ||
        (i.clientName && cl.company && i.clientName.toLowerCase().trim() === cl.company.toLowerCase().trim())
      );

      const contractValue = clProjects.reduce((sum, p) => sum + (Number(p.budget) || 0), 0);
      const billed = clInvoices.reduce((sum, i) => sum + (Number(i.billingAmount) || 0), 0);
      const collected = clInvoices.reduce((sum, i) => sum + (Number(i.collectionAmount) || 0), 0);
      const outstanding = Math.max(0, billed - collected);

      aggregatePortfolioValue += contractValue;
      aggregateInvoiced += billed;
      aggregateCollected += collected;

      const typeKey = cl.clientType || 'Corporate';
      if (!typeDistribution[typeKey]) typeDistribution[typeKey] = { type: typeKey, count: 0, totalValue: 0 };
      typeDistribution[typeKey].count += 1;
      typeDistribution[typeKey].totalValue += contractValue;

      const realizationRate = billed > 0 ? Math.round((collected / billed) * 100) : 0;
      let healthIndex: 'Excellent' | 'Good' | 'At Risk' = 'Good';
      if (billed === 0) {
        healthIndex = 'Good';
      } else if (outstanding === 0 || realizationRate >= 90) {
        healthIndex = 'Excellent';
      } else if (realizationRate < 70) {
        healthIndex = 'At Risk';
      }

      return {
        id: cl.id,
        clientCode: cl.clientCode || `CL-${cl.id.slice(0, 6)}`,
        clientName: cl.clientName,
        company: cl.company || cl.clientName,
        clientType: cl.clientType || 'Corporate',
        contactPerson: cl.contactPerson || '-',
        mobile: cl.mobile || '-',
        email: cl.email || '-',
        city: cl.city || '-',
        state: cl.state || '-',
        status: cl.status || 'Active',
        totalProjects: clProjects.length,
        activeProjects: clProjects.filter(p => !['completed', 'cancelled'].includes((p.status || '').toLowerCase())).length,
        contractValue,
        totalInvoiced: billed,
        totalCollected: collected,
        outstandingDues: outstanding,
        realizationRate,
        healthIndex
      };
    });

    const aggregateOutstanding = Math.max(0, aggregateInvoiced - aggregateCollected);
    const overallCollectionRate = aggregateInvoiced > 0 ? Math.round((aggregateCollected / aggregateInvoiced) * 1000) / 10 : 0;

    return {
      summary: {
        totalClients: clients.length,
        activeAccounts: clients.filter(c => (c.status || '').toLowerCase() === 'active').length,
        aggregatePortfolioValue,
        aggregateInvoiced,
        aggregateCollected,
        aggregateOutstanding,
        overallCollectionRate
      },
      clientTypeBreakdown: Object.values(typeDistribution),
      records
    };
  }

  // 5. PROJECT MILESTONES REPORT (Original Data Only - Deduplicated)
  async getProjectMilestonesReport(companyId?: string, branchId?: string | null) {
    const ds = await getDataSource();
    const projectRepo = ds.getRepository(ProjectModel);
    const milestoneRepo = ds.getRepository(MilestoneModel);

    const prjWhere: any = {};
    if (companyId) prjWhere.companyId = companyId;

    const rawProjects = await projectRepo.find({ where: prjWhere, order: { projectName: 'ASC' } });
    
    const msWhere: any = {};
    if (companyId) msWhere.companyId = companyId;
    const rawMilestones = await milestoneRepo.find({ where: msWhere, order: { orderIndex: 'ASC' } });

    // Deduplicate projects
    const allProjects: ProjectModel[] = [];
    const seenPrjIds = new Set<string>();
    const seenPrjCodes = new Set<string>();
    for (const p of rawProjects) {
      const idKey = String(p.id);
      const codeKey = (p.projectCode || '').trim().toUpperCase();
      if (seenPrjIds.has(idKey)) continue;
      if (codeKey && seenPrjCodes.has(codeKey)) continue;
      seenPrjIds.add(idKey);
      if (codeKey) seenPrjCodes.add(codeKey);
      allProjects.push(p);
    }

    // Deduplicate milestones
    const milestones: MilestoneModel[] = [];
    const seenMsIds = new Set<string>();
    const seenMsKeys = new Set<string>();

    for (const m of rawMilestones) {
      const idKey = String(m.id);
      const compositeKey = `${m.projectId || m.projectCode}_${(m.title || '').trim().toLowerCase()}_${m.dueDate || ''}`;
      if (seenMsIds.has(idKey)) continue;
      if (seenMsKeys.has(compositeKey)) continue;
      seenMsIds.add(idKey);
      seenMsKeys.add(compositeKey);
      milestones.push(m);
    }

    let completedCount = 0;
    let inProgressCount = 0;
    let delayedCount = 0;
    let pendingCount = 0;

    const phaseMap: Record<string, { phase: string; total: number; completed: number }> = {};

    const records = milestones.map((m, idx) => {
      const parentPrj = allProjects.find(p => p.id === m.projectId || p.projectCode === m.projectCode);
      const prjName = parentPrj?.projectName || m.projectCode || '-';
      const prjCode = m.projectCode || parentPrj?.projectCode || '-';

      const st = (m.status || 'Pending').toLowerCase();
      let normalizedStatus: 'Completed' | 'In Progress' | 'Delayed' | 'Pending' = 'Pending';
      let progress = 0;

      if (st.includes('complete') || st.includes('done')) {
        normalizedStatus = 'Completed';
        completedCount++;
        progress = 100;
      } else if (st.includes('delay') || st.includes('overdue')) {
        normalizedStatus = 'Delayed';
        delayedCount++;
        progress = (m as any).progress || 0;
      } else if (st.includes('progress') || st.includes('active')) {
        normalizedStatus = 'In Progress';
        inProgressCount++;
        progress = (m as any).progress || 50;
      } else {
        normalizedStatus = 'Pending';
        pendingCount++;
        progress = (m as any).progress || 0;
      }

      // Group by deliverable category / phase if known
      const matchedPhase = m.deliverable || m.title || 'General Deliverables';
      if (!phaseMap[matchedPhase]) {
        phaseMap[matchedPhase] = { phase: matchedPhase, total: 0, completed: 0 };
      }
      phaseMap[matchedPhase].total += 1;
      if (normalizedStatus === 'Completed') {
        phaseMap[matchedPhase].completed += 1;
      }

      return {
        id: m.id,
        projectId: m.projectId,
        projectCode: prjCode,
        projectName: prjName,
        title: m.title || '-',
        deliverable: m.deliverable || m.description || '-',
        dueDate: m.dueDate || '-',
        startDate: m.startDate || '-',
        status: normalizedStatus,
        progress,
        orderIndex: m.orderIndex || idx + 1
      };
    });

    const totalMilestones = records.length;
    const completionRate = totalMilestones > 0 ? Math.round((completedCount / totalMilestones) * 1000) / 10 : 0;

    const phaseBreakdown = Object.values(phaseMap).map(p => ({
      ...p,
      completionRate: p.total > 0 ? Math.round((p.completed / p.total) * 100) : 0
    }));

    return {
      summary: {
        totalMonitoredProjects: allProjects.length,
        totalMilestones,
        completedCount,
        inProgressCount,
        delayedCount,
        pendingCount,
        completionRate
      },
      phaseBreakdown,
      records
    };
  }

  // 6. VENDOR QUALITY REPORT (Original Data Only - Deduplicated)
  async getVendorQualityReport(companyId?: string, branchId?: string | null) {
    const ds = await getDataSource();
    const vendorRepo = ds.getRepository(VendorModel);

    const where: any = {};
    if (companyId) where.companyId = companyId;
    if (branchId && branchId !== 'All Branches') where.branchId = branchId;

    const rawVendors = await vendorRepo.find({
      where,
      order: { rating: 'DESC' }
    });

    // Deduplicate vendors by ID, vendorCode, and normalized name
    const vendors: VendorModel[] = [];
    const seenVendorIds = new Set<string>();
    const seenVendorCodes = new Set<string>();
    const seenVendorNames = new Set<string>();

    for (const v of rawVendors) {
      const idKey = String(v.id);
      const codeKey = (v.vendorCode || '').trim().toUpperCase();
      const nameKey = (v.vendorName || '').trim().toLowerCase();
      if (seenVendorIds.has(idKey)) continue;
      if (codeKey && seenVendorCodes.has(codeKey)) continue;
      if (nameKey && seenVendorNames.has(nameKey)) continue;
      seenVendorIds.add(idKey);
      if (codeKey) seenVendorCodes.add(codeKey);
      if (nameKey) seenVendorNames.add(nameKey);
      vendors.push(v);
    }

    let approvedCount = 0;
    let pendingCount = 0;
    let rejectedCount = 0;
    let totalRatingSum = 0;
    let tier1Count = 0; // >= 4.5
    let tier2Count = 0; // 3.5 - 4.4
    let tier3Count = 0; // < 3.5

    const categoryMap: Record<string, { category: string; count: number; approvedCount: number; ratingSum: number }> = {
      'Material Supplier': { category: 'Material Supplier', count: 0, approvedCount: 0, ratingSum: 0 },
      'Contractor': { category: 'Contractor', count: 0, approvedCount: 0, ratingSum: 0 },
      'Consultant': { category: 'Consultant', count: 0, approvedCount: 0, ratingSum: 0 },
      'Service Provider': { category: 'Service Provider', count: 0, approvedCount: 0, ratingSum: 0 }
    };

    const records = vendors.map(v => {
      const numRating = Number(v.rating) || 0;
      totalRatingSum += numRating;

      const st = v.approvalStatus || 'Pending Approval';
      if (st === 'Approved') approvedCount++;
      else if (st === 'Rejected') rejectedCount++;
      else pendingCount++;

      let qualityTier: 'Tier 1 (Exceptional)' | 'Tier 2 (Standard)' | 'Tier 3 (Watchlist)' = 'Tier 2 (Standard)';
      if (numRating >= 4.5) {
        qualityTier = 'Tier 1 (Exceptional)';
        tier1Count++;
      } else if (numRating >= 3.5) {
        qualityTier = 'Tier 2 (Standard)';
        tier2Count++;
      } else {
        qualityTier = 'Tier 3 (Watchlist)';
        tier3Count++;
      }

      const catKey = v.category || 'Material Supplier';
      if (!categoryMap[catKey]) {
        categoryMap[catKey] = { category: catKey, count: 0, approvedCount: 0, ratingSum: 0 };
      }
      categoryMap[catKey].count += 1;
      categoryMap[catKey].ratingSum += numRating;
      if (st === 'Approved') {
        categoryMap[catKey].approvedCount += 1;
      }

      return {
        id: v.id,
        vendorCode: v.vendorCode || '-',
        vendorName: v.vendorName || '-',
        category: v.category || 'Material Supplier',
        tradeSpecialty: v.tradeSpecialty || '-',
        rating: Math.round(numRating * 10) / 10,
        qualityTier,
        approvalStatus: st,
        contactPerson: v.contactPerson || '-',
        mobile: v.mobile || '-',
        email: v.email || '-',
        city: v.city || '-',
        state: v.state || '-',
        gstNo: v.gstNo || '-',
        complianceScore: Math.min(100, Math.round((numRating / 5) * 100))
      };
    });

    const totalVendors = vendors.length;
    const averageRating = totalVendors > 0 ? Math.round((totalRatingSum / totalVendors) * 10) / 10 : 0;
    const approvalRate = totalVendors > 0 ? Math.round((approvedCount / totalVendors) * 100) : 0;

    const categoryBreakdown = Object.values(categoryMap).map(c => ({
      category: c.category,
      count: c.count,
      approvedCount: c.approvedCount,
      averageRating: c.count > 0 ? Math.round((c.ratingSum / c.count) * 10) / 10 : 0,
      approvalRate: c.count > 0 ? Math.round((c.approvedCount / c.count) * 100) : 0
    }));

    const ratingDistribution = [
      { tier: 'Tier 1 (4.5 - 5.0 ★)', label: 'Exceptional', count: tier1Count, color: '#10b981' },
      { tier: 'Tier 2 (3.5 - 4.4 ★)', label: 'Standard Quality', count: tier2Count, color: '#3b82f6' },
      { tier: 'Tier 3 (< 3.5 ★)', label: 'Watchlist / Deficient', count: tier3Count, color: '#ef4444' }
    ];

    return {
      summary: {
        totalVendors,
        approvedCount,
        pendingCount,
        rejectedCount,
        averageRating,
        approvalRate,
        tier1Count,
        tier2Count,
        tier3Count
      },
      categoryBreakdown,
      ratingDistribution,
      records
    };
  }

  // 7. ALL REPORTS UNIFIED DASHBOARD SUMMARY
  async getAllReportsSummary(companyId?: string, branchId?: string | null) {
    const [revenue, employee, lead, client, project, vendor] = await Promise.all([
      this.getRevenueReport(companyId, branchId),
      this.getEmployeeUtilizationReport(companyId, branchId),
      this.getLeadFunnelReport(companyId, branchId),
      this.getClientPortfolioReport(companyId, branchId),
      this.getProjectMilestonesReport(companyId, branchId),
      this.getVendorQualityReport(companyId, branchId)
    ]);

    return {
      revenue: revenue.summary,
      employee: employee.summary,
      lead: lead.summary,
      client: client.summary,
      project: project.summary,
      vendor: vendor.summary
    };
  }
}
