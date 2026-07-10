import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('branch_employees')
export class BranchEmployeeModel {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', unique: true })
  employeeId!: string;

  @Column({ type: 'varchar' })
  name!: string;

  @Column({ type: 'varchar' })
  email!: string;

  @Column({ type: 'varchar' })
  phone!: string;

  @Column({ type: 'varchar' })
  department!: string;

  @Column({ type: 'varchar' })
  designation!: string;

  @Column({ type: 'varchar', nullable: true })
  manager?: string;

  @Column({ type: 'varchar' })
  joiningDate!: string;

  @Column({ type: 'varchar', default: 'Active' })
  status!: string;

  @Column({ type: 'varchar' })
  branchId!: string;

  @Column({ type: 'varchar' })
  companyId!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
