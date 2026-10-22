import { NextRequest, NextResponse } from 'next/server';
import { PerformanceService } from '../services/performance.service';

export class PerformanceController {
  private performanceService: PerformanceService;

  constructor() {
    this.performanceService = new PerformanceService();
  }

  async get(req: NextRequest, user: any): Promise<NextResponse> {
    try {
      const companyId = user.companyId || user.userId;
      if (!companyId) {
        return NextResponse.json({ message: 'Company identification is missing.' }, { status: 400 });
      }

      const data = await this.performanceService.getPerformanceData(companyId);
      return NextResponse.json(data, { status: 200 });
    } catch (error: any) {
      console.error('Error in PerformanceController.get:', error);
      return NextResponse.json(
        { message: error.message || 'Failed to fetch performance data.' },
        { status: 500 }
      );
    }
  }

  async create(req: NextRequest, user: any): Promise<NextResponse> {
    try {
      const companyId = user.companyId || user.userId;
      if (!companyId) {
        return NextResponse.json({ message: 'Company identification is missing.' }, { status: 400 });
      }

      const body = await req.json();
      const reviewerName = user.name || user.contactPerson || user.email || 'Admin';
      const review = await this.performanceService.createReview(companyId, {
        ...body,
        reviewerName: body.reviewerName || reviewerName
      });
      return NextResponse.json(review, { status: 201 });
    } catch (error: any) {
      console.error('Error in PerformanceController.create:', error);
      return NextResponse.json(
        { message: error.message || 'Failed to save performance review.' },
        { status: 400 }
      );
    }
  }

  async update(req: NextRequest, user: any): Promise<NextResponse> {
    try {
      const companyId = user.companyId || user.userId;
      if (!companyId) {
        return NextResponse.json({ message: 'Company identification is missing.' }, { status: 400 });
      }

      const body = await req.json();
      const { reviewId, ...updateData } = body;
      if (!reviewId) {
        return NextResponse.json({ message: 'reviewId is required.' }, { status: 400 });
      }

      const review = await this.performanceService.updateReview(companyId, reviewId, updateData);
      return NextResponse.json(review, { status: 200 });
    } catch (error: any) {
      console.error('Error in PerformanceController.update:', error);
      return NextResponse.json(
        { message: error.message || 'Failed to update performance review.' },
        { status: 400 }
      );
    }
  }

  async delete(req: NextRequest, user: any): Promise<NextResponse> {
    try {
      const companyId = user.companyId || user.userId;
      if (!companyId) {
        return NextResponse.json({ message: 'Company identification is missing.' }, { status: 400 });
      }

      const { searchParams } = new URL(req.url);
      const reviewId = searchParams.get('reviewId');
      if (!reviewId) {
        return NextResponse.json({ message: 'reviewId is required.' }, { status: 400 });
      }

      const deleted = await this.performanceService.deleteReview(companyId, reviewId);
      if (!deleted) {
        return NextResponse.json({ message: 'Review not found.' }, { status: 404 });
      }

      return NextResponse.json({ message: 'Review deleted successfully.' }, { status: 200 });
    } catch (error: any) {
      console.error('Error in PerformanceController.delete:', error);
      return NextResponse.json(
        { message: error.message || 'Failed to delete review.' },
        { status: 500 }
      );
    }
  }
}
