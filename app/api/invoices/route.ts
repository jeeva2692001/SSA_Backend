import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '../../../src/modules/auth/middlewares/auth.middleware';
import { InvoiceService } from '../../../src/modules/billing/services/invoice.service';

const invoiceService = new InvoiceService();

export async function GET(req: NextRequest) {
  return await authMiddleware(req, async (user: any) => {
    try {
      const companyId = user.companyId || (user.role === 'Super Admin' ? undefined : user.id);
      const branchId = user.branchId;

      await invoiceService.ensureSeeded();

      const invoices = await invoiceService.getAllInvoices(companyId, branchId);
      const analytics = await invoiceService.getRevenueAnalytics(companyId, branchId);

      return NextResponse.json({
        success: true,
        data: invoices,
        analytics
      }, { status: 200 });
    } catch (error: any) {
      console.error('Error fetching invoices:', error);
      return NextResponse.json({
        success: false,
        message: error.message || 'Failed to fetch invoices.'
      }, { status: 500 });
    }
  });
}

export async function POST(req: NextRequest) {
  return await authMiddleware(req, async (user: any) => {
    try {
      const body = await req.json();
      const companyId = user.companyId || (user.role === 'Super Admin' ? undefined : user.id);
      const invoice = await invoiceService.createInvoice({
        ...body,
        companyId: body.companyId || companyId,
        branchId: body.branchId || user.branchId
      });

      return NextResponse.json({
        success: true,
        data: invoice
      }, { status: 201 });
    } catch (error: any) {
      console.error('Error creating invoice:', error);
      return NextResponse.json({
        success: false,
        message: error.message || 'Failed to create invoice.'
      }, { status: 500 });
    }
  });
}
