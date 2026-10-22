import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('attendances')
export class AttendanceModel {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', unique: true })
  attendanceId!: string;

  @Column({ type: 'varchar' })
  employeeId!: string;

  @Column({ type: 'varchar' })
  companyId!: string;

  @Column({ type: 'varchar' })
  date!: string; // YYYY-MM-DD

  @Column({ type: 'varchar', nullable: true })
  punchIn?: string; // e.g. "09:15 AM"

  @Column({ type: 'varchar', nullable: true })
  punchOut?: string; // e.g. "06:30 PM"

  @Column({ type: 'float', default: 0 })
  workHours!: number;

  @Column({ type: 'varchar', default: 'Present' })
  status!: string; // 'Present' | 'Late' | 'Half Day' | 'Absent'

  @Column({ type: 'varchar', default: 'Web Punch' })
  source!: string; // 'Web Punch' | 'Manual Log'

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
