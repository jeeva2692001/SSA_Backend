import { NextRequest, NextResponse } from 'next/server';
import { CompanyService } from '../services/company.service';

export class CompanyController {
  private companyService: CompanyService;

  constructor() {
    this.companyService = new CompanyService();
  }

  async getAll(req: NextRequest, user?: any): Promise<NextResponse> {
    try {
      const { searchParams } = new URL(req.url);
      const queryCompanyId = searchParams.get('companyId') || searchParams.get('id');

      // If logged in user is NOT Super Admin, return only their company
      if (user && user.role !== 'Super Admin') {
        const targetCompanyId = user.companyId || (user.role === 'Company' ? user.userId : user.companyId) || user.id;
        if (targetCompanyId) {
          const company = await this.companyService.getCompanyById(targetCompanyId);
          return NextResponse.json(company ? [company] : [], { status: 200 });
        }
      }

      if (queryCompanyId) {
        const company = await this.companyService.getCompanyById(queryCompanyId);
        return NextResponse.json(company ? [company] : [], { status: 200 });
      }

      const companies = await this.companyService.getAllCompanies();
      return NextResponse.json(companies, { status: 200 });
    } catch (error: any) {
      console.error('Error in CompanyController.getAll:', error.message);
      return NextResponse.json(
        { message: error.message || 'Failed to fetch companies.' },
        { status: 500 }
      );
    }
  }

  async register(req: NextRequest): Promise<NextResponse> {
    try {
      const body = await req.json();
      const company = await this.companyService.registerCompany(body);
      return NextResponse.json(company, { status: 201 });
    } catch (error: any) {
      console.error('Error in CompanyController.register:', error.message);
      return NextResponse.json(
        { message: error.message || 'Failed to register company.' },
        { status: 400 }
      );
    }
  }

  async update(req: NextRequest): Promise<NextResponse> {
    try {
      const body = await req.json();
      const { searchParams } = new URL(req.url);
      const queryId = searchParams.get('companyId') || searchParams.get('id');
      const targetCompanyId = body.companyId || body.id || queryId;

      if (!targetCompanyId) {
        return NextResponse.json(
          { message: 'Company ID (companyId or id) is required for update.' },
          { status: 400 }
        );
      }

      const { companyId, id, ...updateData } = body;
      const company = await this.companyService.updateCompany(targetCompanyId, updateData);
      return NextResponse.json(company, { status: 200 });
    } catch (error: any) {
      console.error('Error in CompanyController.update:', error.message);
      return NextResponse.json(
        { message: error.message || 'Failed to update company.' },
        { status: 400 }
      );
    }
  }

  async delete(req: NextRequest): Promise<NextResponse> {
    try {
      const { searchParams } = new URL(req.url);
      const companyId = searchParams.get('companyId');

      if (!companyId) {
        return NextResponse.json(
          { message: 'Company ID (companyId) is required for deletion.' },
          { status: 400 }
        );
      }

      const deleted = await this.companyService.deleteCompany(companyId);
      if (!deleted) {
        return NextResponse.json(
          { message: 'Company not found or already deleted.' },
          { status: 404 }
        );
      }

      return NextResponse.json({ message: 'Company deleted successfully.' }, { status: 200 });
    } catch (error: any) {
      console.error('Error in CompanyController.delete:', error.message);
      return NextResponse.json(
        { message: error.message || 'Failed to delete company.' },
        { status: 500 }
      );
    }
  }
}
