import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '../../../src/modules/auth/middlewares/auth.middleware';
import { ReportService } from '../../../src/modules/report/services/report.service';

const reportService = new ReportService();

export async function GET(req: NextRequest) {
  return await authMiddleware(req, async (user: any) => {
    try {
      const { searchParams } = new URL(req.url);
      const reportType = searchParams.get('type') || 'all'; // 'revenue' | 'employee' | 'lead' | 'client' | 'project' | 'all'
      const branchId = searchParams.get('branchId') || user.branchId;
      const fiscalYear = searchParams.get('fiscalYear') || undefined;
      const companyId = user.companyId || (user.role === 'Super Admin' ? undefined : user.id);

      let data: any;

      switch (reportType) {
        case 'revenue':
          data = await reportService.getRevenueReport(companyId, branchId, fiscalYear);
          break;
        case 'employee':
          data = await reportService.getEmployeeUtilizationReport(companyId, branchId);
          break;
        case 'lead':
          data = await reportService.getLeadFunnelReport(companyId, branchId);
          break;
        case 'client':
          data = await reportService.getClientPortfolioReport(companyId, branchId);
          break;
        case 'project':
          data = await reportService.getProjectMilestonesReport(companyId, branchId);
          break;
        case 'vendor':
        case 'vendor-quality':
          data = await reportService.getVendorQualityReport(companyId, branchId);
          break;
        case 'all':
        default:
          const summary = await reportService.getAllReportsSummary(companyId, branchId);
          data = { summary };
          break;
      }

      return NextResponse.json({
        success: true,
        reportType,
        timestamp: new Date().toISOString(),
        data
      }, { status: 200 });
    } catch (error: any) {
      console.error('[ReportsRoute] Error generating report:', error);
      return NextResponse.json({
        success: false,
        message: error.message || 'Failed to generate analytical report.'
      }, { status: 500 });
    }
  });
}
