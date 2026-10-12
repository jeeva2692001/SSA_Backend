import { InvoiceRepository } from '../repositories/invoice.repository';
import { InvoiceModel } from '../models/invoice.model';
import { getDataSource } from '../../../shared/config/data-source';
import { ProjectModel } from '../../project/models/project.model';
import { ClientModel } from '../../client/models/client.model';

export class InvoiceService {
  private invoiceRepo: InvoiceRepository;

  constructor() {
    this.invoiceRepo = new InvoiceRepository();
  }

  async getAllInvoices(companyId?: string, branchId?: string | null): Promise<InvoiceModel[]> {
    return await this.invoiceRepo.findAll(companyId, branchId);
  }

  async getInvoiceById(id: string): Promise<InvoiceModel | null> {
    return await this.invoiceRepo.findById(id);
  }

  async createInvoice(data: Partial<InvoiceModel>): Promise<InvoiceModel> {
    if (!data.invoiceNumber) {
      const count = await this.invoiceRepo.count(data.companyId);
      const year = new Date().getFullYear();
      data.invoiceNumber = `INV-${year}-${String(count + 1).padStart(3, '0')}`;
    }
    return await this.invoiceRepo.create(data);
  }

  async updateInvoice(id: string, data: Partial<InvoiceModel>): Promise<InvoiceModel | null> {
    const existing = await this.invoiceRepo.findById(id);
    if (!existing) return null;
    Object.assign(existing, data);
    return await this.invoiceRepo.save(existing);
  }

  async deleteInvoice(id: string): Promise<boolean> {
    return await this.invoiceRepo.delete(id);
  }

  async getRevenueAnalytics(companyId?: string, branchId?: string | null) {
    const invoices = await this.getAllInvoices(companyId, branchId);

    // Group invoices by month (last 6 months or based on data)
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    // Build a chronological list of recent 6 calendar months
    const now = new Date();
    const recentMonths: { key: string; label: string; year: number; monthIdx: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      recentMonths.push({
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        label: monthNames[d.getMonth()],
        year: d.getFullYear(),
        monthIdx: d.getMonth()
      });
    }

    const monthMap: Record<string, { month: string; billing: number; collection: number; pipeline: number }> = {};
    recentMonths.forEach(m => {
      monthMap[m.key] = {
        month: m.label,
        billing: 0,
        collection: 0,
        pipeline: 0
      };
    });

    let totalBilling = 0;
    let totalCollection = 0;

    invoices.forEach(inv => {
      const bAmt = Number(inv.billingAmount) || 0;
      const cAmt = Number(inv.collectionAmount) || 0;
      totalBilling += bAmt;
      totalCollection += cAmt;

      const dateStr = inv.issueDate || '';
      const parts = dateStr.split('-');
      if (parts.length >= 2) {
        const key = `${parts[0]}-${parts[1]}`;
        if (monthMap[key]) {
          monthMap[key].billing += bAmt;
          monthMap[key].collection += cAmt;
        } else {
          // If invoice is outside recent 6 months, find matching month name
          const monthIndex = parseInt(parts[1], 10) - 1;
          const matchRecent = recentMonths.find(m => m.monthIdx === monthIndex);
          if (matchRecent && monthMap[matchRecent.key]) {
            monthMap[matchRecent.key].billing += bAmt;
            monthMap[matchRecent.key].collection += cAmt;
          }
        }
      }
    });

    // Populate pipeline based on pending billing + active run-rate
    const revenueAnalytics = recentMonths.map(m => {
      const entry = monthMap[m.key];
      const pendingThisMonth = Math.max(0, entry.billing - entry.collection);
      entry.pipeline = Math.round(entry.billing * 1.25 + pendingThisMonth);
      return entry;
    });

    const outstandingAmount = Math.max(0, totalBilling - totalCollection);
    const collectionRate = totalBilling > 0 ? Math.round((totalCollection / totalBilling) * 1000) / 10 : 0;

    return {
      revenueAnalytics,
      summary: {
        totalBilling,
        totalCollection,
        outstandingAmount,
        collectionRate
      }
    };
  }

  async ensureSeeded(): Promise<void> {
    const count = await this.invoiceRepo.count();
    if (count > 0) return;

    console.log('[Seed] Seeding live Billing & Invoicing records...');
    const ds = await getDataSource();
    const projectRepo = ds.getRepository(ProjectModel);
    const clientRepo = ds.getRepository(ClientModel);

    const projects = await projectRepo.find();
    const clients = await clientRepo.find();

    const sampleProj1 = projects[0]?.projectName || 'GVR Sky Villas';
    const sampleProj1Id = projects[0]?.id;
    const sampleProj2 = projects[1]?.projectName || 'Aura Commercial Hub';
    const sampleProj2Id = projects[1]?.id;
    const sampleClient1 = clients[0]?.clientName || 'Prestige Urban Developers';
    const sampleClient1Id = clients[0]?.id;
    const sampleClient2 = clients[1]?.clientName || 'Brigade Enterprises Ltd';
    const sampleClient2Id = clients[1]?.id;

    const now = new Date();
    const getMonthDate = (monthsAgo: number, day: number = 15) => {
      const d = new Date(now.getFullYear(), now.getMonth() - monthsAgo, day);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };

    const seedInvoices: Partial<InvoiceModel>[] = [
      {
        invoiceNumber: 'INV-2026-001',
        projectId: sampleProj1Id,
        projectName: sampleProj1,
        clientId: sampleClient1Id,
        clientName: sampleClient1,
        companyId: 'COM-001',
        title: 'Milestone 1: Concept Masterplan & Zoning Approvals',
        billingAmount: 6200000,
        collectionAmount: 5800000,
        status: 'Partially Paid',
        issueDate: getMonthDate(5, 10),
        dueDate: getMonthDate(5, 25),
        paymentDate: getMonthDate(5, 22),
        notes: 'Initial schematic architectural layout released and accepted.'
      },
      {
        invoiceNumber: 'INV-2026-002',
        projectId: sampleProj1Id,
        projectName: sampleProj1,
        clientId: sampleClient1Id,
        clientName: sampleClient1,
        companyId: 'COM-001',
        title: 'Milestone 2: Schematic Design & 3D Render Signoff',
        billingAmount: 7800000,
        collectionAmount: 7200000,
        status: 'Partially Paid',
        issueDate: getMonthDate(4, 12),
        dueDate: getMonthDate(4, 27),
        paymentDate: getMonthDate(4, 24),
        notes: 'Elevations, schematic MEP layouts, and facade rendering signoffs.'
      },
      {
        invoiceNumber: 'INV-2026-003',
        projectId: sampleProj2Id,
        projectName: sampleProj2,
        clientId: sampleClient2Id,
        clientName: sampleClient2,
        companyId: 'COM-001',
        title: 'Milestone 3: Structural Coordination & Design Development',
        billingAmount: 9500000,
        collectionAmount: 8900000,
        status: 'Partially Paid',
        issueDate: getMonthDate(3, 14),
        dueDate: getMonthDate(3, 29),
        paymentDate: getMonthDate(3, 27),
        notes: 'Full discipline structural clash-detection and foundation specifications.'
      },
      {
        invoiceNumber: 'INV-2026-004',
        projectId: sampleProj1Id,
        projectName: sampleProj1,
        clientId: sampleClient1Id,
        clientName: sampleClient1,
        companyId: 'COM-001',
        title: 'Milestone 4: Working Drawings & Municipal Statutory Submission',
        billingAmount: 8200000,
        collectionAmount: 8000000,
        status: 'Paid',
        issueDate: getMonthDate(2, 10),
        dueDate: getMonthDate(2, 25),
        paymentDate: getMonthDate(2, 23),
        notes: 'Clearance drawings submitted to local development planning authority.'
      },
      {
        invoiceNumber: 'INV-2026-005',
        projectId: sampleProj2Id,
        projectName: sampleProj2,
        clientId: sampleClient2Id,
        clientName: sampleClient2,
        companyId: 'COM-001',
        title: 'Milestone 5: Tender Package Release & MEP Contractor Verification',
        billingAmount: 11000000,
        collectionAmount: 10200000,
        status: 'Partially Paid',
        issueDate: getMonthDate(1, 15),
        dueDate: getMonthDate(1, 30),
        paymentDate: getMonthDate(1, 28),
        notes: 'Bill of quantities, vendor packages, and tender documentation package.'
      },
      {
        invoiceNumber: 'INV-2026-006',
        projectId: sampleProj1Id,
        projectName: sampleProj1,
        clientId: sampleClient1Id,
        clientName: sampleClient1,
        companyId: 'COM-001',
        title: 'Milestone 6: Site Execution Supervision & Foundation Invoicing',
        billingAmount: 14200000,
        collectionAmount: 13500000,
        status: 'Partially Paid',
        issueDate: getMonthDate(0, 5),
        dueDate: getMonthDate(0, 20),
        paymentDate: getMonthDate(0, 18),
        notes: 'Current month site milestone inspection and certified contractor progress billing.'
      }
    ];

    for (const inv of seedInvoices) {
      await this.invoiceRepo.create(inv);
    }
    console.log('[Seed] Live Billing & Invoicing records seeded successfully.');
  }
}
