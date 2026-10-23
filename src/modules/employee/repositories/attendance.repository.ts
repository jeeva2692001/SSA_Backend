import { getDataSource } from '../../../shared/config/data-source';
import { AttendanceModel } from '../models/attendance.model';
import { Repository, Like } from 'typeorm';

export class AttendanceRepository {
  private async getRepository(): Promise<Repository<AttendanceModel>> {
    const dataSource = await getDataSource();
    return dataSource.getRepository(AttendanceModel);
  }

  async findByCompanyId(companyId: string, monthPrefix?: string, employeeId?: string): Promise<AttendanceModel[]> {
    const repo = await this.getRepository();
    const where: any = { companyId };
    if (monthPrefix) {
      where.date = Like(`${monthPrefix}%`);
    }
    if (employeeId) {
      where.employeeId = employeeId;
    }
    return await repo.find({ where, order: { date: 'DESC', createdAt: 'DESC' } });
  }

  async findTodayByEmployeeId(companyId: string, employeeId: string, date: string, employeeName?: string): Promise<AttendanceModel | null> {
    const repo = await this.getRepository();
    const where: any[] = [{ companyId, employeeId, date }];
    if (employeeName) {
      where.push({ companyId, employeeName, date });
    }
    return await repo.findOne({ where, order: { id: 'DESC' } });
  }

  async findByAttendanceId(attendanceId: string): Promise<AttendanceModel | null> {
    const repo = await this.getRepository();
    return await repo.findOne({ where: { attendanceId } });
  }

  async save(attendanceData: Partial<AttendanceModel>): Promise<AttendanceModel> {
    const repo = await this.getRepository();
    const entity = repo.create(attendanceData);
    return await repo.save(entity);
  }

  async update(id: number, data: Partial<AttendanceModel>): Promise<void> {
    const repo = await this.getRepository();
    await repo.update(id, data);
  }

  async clearPunchOut(id: number): Promise<void> {
    const repo = await this.getRepository();
    await repo.update(id, { punchOut: null as any, workHours: 0 });
  }

  async delete(id: number): Promise<void> {
    const repo = await this.getRepository();
    await repo.delete(id);
  }

  async count(companyId?: string): Promise<number> {
    const repo = await this.getRepository();
    if (companyId) {
      return await repo.count({ where: { companyId } });
    }
    return await repo.count();
  }

  async getNextAttendanceId(): Promise<string> {
    const repo = await this.getRepository();
    const records = await repo.find({ order: { id: 'DESC' }, take: 1 });
    const latestNum = records.length > 0 ? records[0].id : 0;
    return `ATT-${String(latestNum + 1).padStart(4, '0')}`;
  }
}
