import { PerformanceRepository } from '../repositories/performance.repository';
import { EmployeeRepository } from '../repositories/employee.repository';
import { PerformanceReviewModel } from '../models/performance-review.model';

export class PerformanceService {
  private perfRepo: PerformanceRepository;
  private employeeRepo: EmployeeRepository;

  constructor() {
    this.perfRepo = new PerformanceRepository();
    this.employeeRepo = new EmployeeRepository();
  }

  async seedDefaultsIfNeeded(companyId: string) {
    const count = await this.perfRepo.count(companyId);
    if (count > 0) return;

    const employees = await this.employeeRepo.findAllByCompanyId(companyId);
    const emp1 = employees[0] || { employeeId: 'EMP-001', name: 'Bhuvanasundar', designation: 'Chief Architect' };
    const emp2 = employees[1] || { employeeId: 'EMP-002', name: 'Ponshankar', designation: 'Senior Project Architect' };
    const emp3 = employees[2] || { employeeId: 'EMP-003', name: 'Poovarasan', designation: 'BIM Modeler' };

    const initialReviews = [
      {
        reviewId: 'REV-001',
        employeeId: emp1.employeeId,
        employeeName: emp1.name,
        companyId,
        reviewPeriod: 'Q1 2026',
        rating: 4.9,
        scorePercentage: 98,
        slaCompliance: 99,
        utilizedLoad: 92,
        projectsCompleted: 8,
        reviewCategory: 'Project Delivery & Lead Architecture',
        feedback: 'Exceptional architectural leadership and delivery on commercial masterplans.',
        reviewerName: 'Sundar Sundram',
        certifications: 'Revit BIM Coordination Master, LEED AP',
        status: 'Published'
      },
      {
        reviewId: 'REV-002',
        employeeId: emp2.employeeId,
        employeeName: emp2.name,
        companyId,
        reviewPeriod: 'Q1 2026',
        rating: 4.8,
        scorePercentage: 94,
        slaCompliance: 96,
        utilizedLoad: 88,
        projectsCompleted: 12,
        reviewCategory: 'BIM Modeling & Execution',
        feedback: 'Consistent turnaround of structural and architectural drawing sheets without revisions.',
        reviewerName: 'Bhuvanasundar',
        certifications: 'Local Fire & Municipal Bylaws Review, Autodesk Certified Professional',
        status: 'Published'
      },
      {
        reviewId: 'REV-003',
        employeeId: emp3.employeeId,
        employeeName: emp3.name,
        companyId,
        reviewPeriod: 'Q1 2026',
        rating: 4.6,
        scorePercentage: 90,
        slaCompliance: 94,
        utilizedLoad: 85,
        projectsCompleted: 6,
        reviewCategory: 'Technical Coordination',
        feedback: 'Good attention to municipal bylaws and client brief requirements.',
        reviewerName: 'Bhuvanasundar',
        certifications: 'BREEAM Sustainable Design Certification',
        status: 'Published'
      }
    ];

    for (const r of initialReviews) {
      await this.perfRepo.save(r);
    }
  }

  async getPerformanceData(companyId: string) {
    // Disabled auto-seeding dummy reviews
    // await this.seedDefaultsIfNeeded(companyId);

    const reviews = await this.perfRepo.findAllByCompanyId(companyId);

    const topDelivers = reviews.slice(0, 5).map(r => ({
      reviewId: r.reviewId,
      employeeId: r.employeeId,
      name: r.employeeName,
      role: r.reviewCategory,
      score: r.scorePercentage,
      rating: r.rating,
      count: r.projectsCompleted,
      sla: r.slaCompliance,
      load: r.utilizedLoad
    }));

    // Gather certifications dynamically from reviews
    const certMap = new Map<string, number>();
    for (const r of reviews) {
      if (r.certifications) {
        const parts = r.certifications.split(',').map(s => s.trim()).filter(Boolean);
        for (const p of parts) {
          certMap.set(p, (certMap.get(p) || 0) + 1);
        }
      }
    }

    const certifications = Array.from(certMap.entries()).map(([title, count]) => ({
      title,
      completed: `${count} Team Member${count === 1 ? '' : 's'}`,
      level: count >= 2 ? 'Advanced' : 'Verified Standard'
    }));

    const avgRating = reviews.length > 0
      ? Math.round((reviews.reduce((acc, r) => acc + Number(r.rating), 0) / reviews.length) * 10) / 10
      : 0;

    const avgSla = reviews.length > 0
      ? Math.round(reviews.reduce((acc, r) => acc + Number(r.slaCompliance), 0) / reviews.length)
      : 0;

    const avgScore = reviews.length > 0
      ? Math.round(reviews.reduce((acc, r) => acc + Number(r.scorePercentage), 0) / reviews.length)
      : 0;

    return {
      reviews,
      topDelivers,
      certifications,
      stats: {
        avgRating,
        avgSla,
        avgScore,
        totalReviews: reviews.length
      }
    };
  }

  async createReview(companyId: string, data: {
    employeeId: string;
    employeeName?: string;
    reviewPeriod?: string;
    rating?: number;
    scorePercentage?: number;
    slaCompliance?: number;
    utilizedLoad?: number;
    projectsCompleted?: number;
    reviewCategory?: string;
    feedback?: string;
    reviewerName?: string;
    certifications?: string;
  }) {
    if (!data.employeeId) {
      throw new Error('Employee ID is required.');
    }

    let employeeName = data.employeeName;
    if (!employeeName) {
      const emp = await this.employeeRepo.findByEmployeeId(data.employeeId);
      employeeName = emp ? emp.name : data.employeeId;
    }

    const reviewId = await this.perfRepo.getNextReviewId();

    const newReview: Partial<PerformanceReviewModel> = {
      reviewId,
      employeeId: data.employeeId,
      employeeName,
      companyId,
      reviewPeriod: data.reviewPeriod || 'Q1 2026',
      rating: data.rating !== undefined ? Number(data.rating) : 4.5,
      scorePercentage: data.scorePercentage !== undefined ? Number(data.scorePercentage) : 90,
      slaCompliance: data.slaCompliance !== undefined ? Number(data.slaCompliance) : 95,
      utilizedLoad: data.utilizedLoad !== undefined ? Number(data.utilizedLoad) : 80,
      projectsCompleted: data.projectsCompleted !== undefined ? Number(data.projectsCompleted) : 0,
      reviewCategory: data.reviewCategory || 'General Performance',
      feedback: data.feedback,
      reviewerName: data.reviewerName || 'Manager',
      certifications: data.certifications,
      status: 'Published'
    };

    return await this.perfRepo.save(newReview);
  }

  async updateReview(companyId: string, reviewId: string, data: Partial<PerformanceReviewModel>) {
    const review = await this.perfRepo.findByReviewId(reviewId, companyId);
    if (!review) {
      throw new Error(`Review ${reviewId} not found.`);
    }

    Object.assign(review, data);
    return await this.perfRepo.save(review);
  }

  async deleteReview(companyId: string, reviewId: string) {
    return await this.perfRepo.delete(reviewId, companyId);
  }
}
