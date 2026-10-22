import { getDataSource } from '../../../shared/config/data-source';
import { PerformanceReviewModel } from '../models/performance-review.model';
import { Repository } from 'typeorm';

export class PerformanceRepository {
  private async getRepository(): Promise<Repository<PerformanceReviewModel>> {
    const dataSource = await getDataSource();
    return dataSource.getRepository(PerformanceReviewModel);
  }

  async findAllByCompanyId(companyId: string): Promise<PerformanceReviewModel[]> {
    const repo = await this.getRepository();
    return await repo.find({
      where: { companyId },
      order: { scorePercentage: 'DESC', createdAt: 'DESC' }
    });
  }

  async findByReviewId(reviewId: string, companyId: string): Promise<PerformanceReviewModel | null> {
    const repo = await this.getRepository();
    return await repo.findOne({ where: { reviewId, companyId } });
  }

  async findByEmployeeId(employeeId: string, companyId: string): Promise<PerformanceReviewModel[]> {
    const repo = await this.getRepository();
    return await repo.find({
      where: { employeeId, companyId },
      order: { createdAt: 'DESC' }
    });
  }

  async save(reviewData: Partial<PerformanceReviewModel>): Promise<PerformanceReviewModel> {
    const repo = await this.getRepository();
    const record = repo.create(reviewData);
    return await repo.save(record);
  }

  async delete(reviewId: string, companyId: string): Promise<boolean> {
    const repo = await this.getRepository();
    const result = await repo.delete({ reviewId, companyId });
    return (result.affected ?? 0) > 0;
  }

  async count(companyId: string): Promise<number> {
    const repo = await this.getRepository();
    return await repo.count({ where: { companyId } });
  }

  async getNextReviewId(): Promise<string> {
    const repo = await this.getRepository();
    const all = await repo.find();
    let maxNum = 0;
    for (const item of all) {
      const match = item.reviewId?.match(/^REV-(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    }
    return `REV-${String(maxNum + 1).padStart(3, '0')}`;
  }
}
