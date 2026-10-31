import { getDataSource } from '../../../shared/config/data-source';
import { LeaveRequestModel } from '../models/leave-request.model';
import { Repository } from 'typeorm';

export class LeaveRequestRepository {
  private async getRepository(): Promise<Repository<LeaveRequestModel>> {
    const dataSource = await getDataSource();
    return dataSource.getRepository(LeaveRequestModel);
  }

  async findByCompanyId(companyId: string, status?: string, employeeId?: string, employeeName?: string): Promise<LeaveRequestModel[]> {
    const repo = await this.getRepository();
    const qb = repo.createQueryBuilder('leave')
      .where('leave.companyId = :companyId', { companyId });

    if (status && status !== 'All') {
      qb.andWhere('leave.status = :status', { status });
    }

    if (employeeId) {
      if (employeeName) {
        qb.andWhere('(leave.employeeId = :employeeId OR leave.employeeName = :employeeName OR leave.employeeId = :employeeName)', {
          employeeId,
          employeeName
        });
      } else {
        qb.andWhere('leave.employeeId = :employeeId', { employeeId });
      }
    }

    qb.orderBy('leave.id', 'DESC');
    return await qb.getMany();
  }

  async findByLeaveId(leaveId: string): Promise<LeaveRequestModel | null> {
    const repo = await this.getRepository();
    return await repo.findOne({ where: { leaveId } });
  }

  async save(leaveData: Partial<LeaveRequestModel>): Promise<LeaveRequestModel> {
    const repo = await this.getRepository();
    const entity = repo.create(leaveData);
    return await repo.save(entity);
  }

  async count(companyId?: string): Promise<number> {
    const repo = await this.getRepository();
    if (companyId) {
      return await repo.count({ where: { companyId } });
    }
    return await repo.count();
  }

  async getNextLeaveId(): Promise<string> {
    const repo = await this.getRepository();
    const leaves = await repo.find();
    let maxNum = 400; // start after LV-400
    for (const l of leaves) {
      const match = l.leaveId.match(/^LV-(\d+)$/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) {
          maxNum = num;
        }
      }
    }
    return `LV-${maxNum + 1}`;
  }

  async deleteByLeaveId(leaveId: string): Promise<boolean> {
    const repo = await this.getRepository();
    const res = await repo.delete({ leaveId });
    return (res.affected ?? 0) > 0;
  }
}
