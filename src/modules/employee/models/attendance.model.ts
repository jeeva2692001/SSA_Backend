import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('attendance')
export class AttendanceModel {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', unique: true })
  attendanceId!: string;

  @Column({ type: 'varchar' })
  companyId!: string;

  @Column({ type: 'varchar', nullable: true })
  branchId?: string;

  @Column({ type: 'varchar' })
  employeeId!: string;

  @Column({ type: 'varchar' })
  employeeName!: string;

  @Column({ type: 'varchar' })
  date!: string; // YYYY-MM-DD

  @Column({ type: 'varchar', nullable: true })
  punchIn?: string; // e.g. "09:15 AM"

  @Column({ type: 'varchar', nullable: true })
  punchOut?: string; // e.g. "06:30 PM"

  @Column({ type: 'varchar', default: 'Present' })
  status!: string; // 'Present' | 'Late' | 'Half Day' | 'Absent' | 'On Leave'

  @Column({ type: 'float', default: 8.0 })
  workHours!: number;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
