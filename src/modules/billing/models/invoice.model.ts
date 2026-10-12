import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('invoices')
export class InvoiceModel {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', unique: true })
  invoiceNumber!: string;

  @Column({ type: 'varchar', nullable: true })
  projectId?: string;

  @Column({ type: 'varchar', nullable: true })
  projectName?: string;

  @Column({ type: 'varchar', nullable: true })
  clientId?: string;

  @Column({ type: 'varchar', nullable: true })
  clientName?: string;

  @Column({ type: 'varchar', nullable: true })
  companyId?: string;

  @Column({ type: 'varchar', nullable: true })
  branchId?: string;

  @Column({ type: 'varchar' })
  title!: string;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  billingAmount!: number;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  collectionAmount!: number;

  @Column({ type: 'varchar', default: 'Pending' })
  status!: 'Draft' | 'Pending' | 'Partially Paid' | 'Paid' | 'Overdue';

  @Column({ type: 'varchar' })
  issueDate!: string; // YYYY-MM-DD

  @Column({ type: 'varchar', nullable: true })
  dueDate?: string; // YYYY-MM-DD

  @Column({ type: 'varchar', nullable: true })
  paymentDate?: string; // YYYY-MM-DD

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
