import { getDataSource } from '../../../shared/config/data-source';
import { AttendanceModel } from '../models/attendance.model';
import { Repository } from 'typeorm';

export class AttendanceRepository {
  private async getRepository(): Promise<Repository<AttendanceModel>> {
    const dataSource = await getDataSource();
    return dataSource.getRepository(AttendanceModel);
  }

  async findAllByCompanyId(companyId: string, month?: string): Promise<AttendanceModel[]> {
    const repo = await this.getRepository();
    const query = repo.createQueryBuilder('att')
      .where('att.companyId = :companyId', { companyId })
      .orderBy('att.date', 'DESC')
      .addOrderBy('att.createdAt', 'DESC');

    if (month) {
      query.andWhere('att.date LIKE :monthPattern', { monthPattern: `${month}%` });
    }

    return await query.getMany();
  }

  async findByEmployeeAndDate(employeeId: string, companyId: string, date: string): Promise<AttendanceModel | null> {
    const repo = await this.getRepository();
    return await repo.findOne({ where: { employeeId, companyId, date } });
  }

  async findByEmployeeId(employeeId: string, companyId: string): Promise<AttendanceModel[]> {
    const repo = await this.getRepository();
    return await repo.find({
      where: { employeeId, companyId },
      order: { date: 'DESC' }
    });
  }

  async save(attendanceData: Partial<AttendanceModel>): Promise<AttendanceModel> {
    const repo = await this.getRepository();
    const record = repo.create(attendanceData);
    return await repo.save(record);
  }

  async count(companyId: string): Promise<number> {
    const repo = await this.getRepository();
    return await repo.count({ where: { companyId } });
  }

  async getNextAttendanceId(): Promise<string> {
    const repo = await this.getRepository();
    const all = await repo.find();
    let maxNum = 0;
    for (const item of all) {
      const match = item.attendanceId?.match(/^ATT-(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    }
    return `ATT-${String(maxNum + 1).padStart(4, '0')}`;
  }
}
