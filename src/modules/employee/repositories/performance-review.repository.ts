import { getDataSource } from '../../../shared/config/data-source';
import { PerformanceReviewModel } from '../models/performance-review.model';
import { Repository } from 'typeorm';

export class PerformanceReviewRepository {
  private async getRepository(): Promise<Repository<PerformanceReviewModel>> {
    const dataSource = await getDataSource();
    return dataSource.getRepository(PerformanceReviewModel);
  }

  async findByCompanyId(companyId: string, employeeId?: string, period?: string, employeeName?: string): Promise<PerformanceReviewModel[]> {
    const repo = await this.getRepository();
    const qb = repo.createQueryBuilder('rev')
      .where('rev.companyId = :companyId', { companyId });

    if (period) {
      qb.andWhere('rev.reviewPeriod = :period', { period });
    }

    if (employeeId) {
      if (employeeName) {
        qb.andWhere('(rev.employeeId = :employeeId OR rev.employeeName = :employeeName OR rev.employeeId = :employeeName)', {
          employeeId,
          employeeName
        });
      } else {
        qb.andWhere('rev.employeeId = :employeeId', { employeeId });
      }
    }

    qb.orderBy('rev.rating', 'DESC').addOrderBy('rev.id', 'DESC');
    return await qb.getMany();
  }

  async findByReviewId(reviewId: string): Promise<PerformanceReviewModel | null> {
    const repo = await this.getRepository();
    return await repo.findOne({ where: { reviewId } });
  }

  async save(reviewData: Partial<PerformanceReviewModel>): Promise<PerformanceReviewModel> {
    const repo = await this.getRepository();
    const entity = repo.create(reviewData);
    return await repo.save(entity);
  }

  async count(companyId?: string): Promise<number> {
    const repo = await this.getRepository();
    if (companyId) {
      return await repo.count({ where: { companyId } });
    }
    return await repo.count();
  }

  async getNextReviewId(): Promise<string> {
    const repo = await this.getRepository();
    const reviews = await repo.find();
    let maxNum = 100;
    for (const r of reviews) {
      const match = r.reviewId.match(/^REV-(\d+)$/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) {
          maxNum = num;
        }
      }
    }
    return `REV-${maxNum + 1}`;
  }

  async deleteByReviewId(reviewId: string): Promise<boolean> {
    const repo = await this.getRepository();
    const res = await repo.delete({ reviewId });
    return (res.affected ?? 0) > 0;
  }
}
