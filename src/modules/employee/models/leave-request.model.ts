import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('leave_requests')
export class LeaveRequestModel {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', unique: true })
  leaveId!: string;

  @Column({ type: 'varchar' })
  employeeId!: string;

  @Column({ type: 'varchar' })
  employeeName!: string;

  @Column({ type: 'varchar' })
  companyId!: string;

  @Column({ type: 'varchar' })
  type!: string; // 'Casual' | 'Sick' | 'Privilege' | 'Maternity' | 'Paternity' | 'Other'

  @Column({ type: 'varchar' })
  startDate!: string; // YYYY-MM-DD

  @Column({ type: 'varchar' })
  endDate!: string; // YYYY-MM-DD

  @Column({ type: 'int', default: 1 })
  days!: number;

  @Column({ type: 'text' })
  reason!: string;

  @Column({ type: 'varchar', default: 'Pending' })
  status!: string; // 'Pending' | 'Approved' | 'Rejected'

  @Column({ type: 'varchar', nullable: true })
  actionedBy?: string;

  @Column({ type: 'timestamp', nullable: true })
  actionedAt?: Date;

  @Column({ type: 'text', nullable: true })
  rejectionReason?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
