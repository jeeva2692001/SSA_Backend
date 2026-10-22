import { getDataSource } from '../../../shared/config/data-source';
import { LeaveRequestModel } from '../models/leave-request.model';
import { Repository } from 'typeorm';

export class LeaveRepository {
  private async getRepository(): Promise<Repository<LeaveRequestModel>> {
    const dataSource = await getDataSource();
    return dataSource.getRepository(LeaveRequestModel);
  }

  async findAllByCompanyId(companyId: string, status?: string): Promise<LeaveRequestModel[]> {
    const repo = await this.getRepository();
    const query = repo.createQueryBuilder('leave')
      .where('leave.companyId = :companyId', { companyId })
      .orderBy('leave.createdAt', 'DESC');

    if (status && status !== 'All') {
      query.andWhere('leave.status = :status', { status });
    }

    return await query.getMany();
  }

  async findByLeaveId(leaveId: string, companyId: string): Promise<LeaveRequestModel | null> {
    const repo = await this.getRepository();
    return await repo.findOne({ where: { leaveId, companyId } });
  }

  async findByEmployeeId(employeeId: string, companyId: string): Promise<LeaveRequestModel[]> {
    const repo = await this.getRepository();
    return await repo.find({
      where: { employeeId, companyId },
      order: { createdAt: 'DESC' }
    });
  }

  async save(leaveData: Partial<LeaveRequestModel>): Promise<LeaveRequestModel> {
    const repo = await this.getRepository();
    const record = repo.create(leaveData);
    return await repo.save(record);
  }

  async count(companyId: string): Promise<number> {
    const repo = await this.getRepository();
    return await repo.count({ where: { companyId } });
  }

  async getNextLeaveId(): Promise<string> {
    const repo = await this.getRepository();
    const all = await repo.find();
    let maxNum = 400;
    for (const item of all) {
      const match = item.leaveId?.match(/^LV-(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    }
    return `LV-${maxNum + 1}`;
  }
}
