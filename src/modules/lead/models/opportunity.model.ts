import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('opportunities')
export class OpportunityModel {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', unique: true })
  dealId!: string; // e.g. "OPP-2026-001"

  @Column({ type: 'varchar' })
  name!: string; // Deal / Opportunity Name

  @Column({ type: 'varchar', nullable: true })
  companyId?: string;

  @Column({ type: 'varchar', nullable: true })
  branchId?: string | null;

  @Column({ type: 'varchar', nullable: true })
  clientId?: string | null;

  @Column({ type: 'varchar', nullable: true })
  clientName?: string;

  @Column({ type: 'varchar', nullable: true })
  company?: string;

  @Column({ type: 'varchar', nullable: true })
  leadId?: string | null;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  dealValue!: number;

  @Column({ type: 'integer', default: 50 })
  probability!: number; // 0 - 100

  @Column({ type: 'varchar', default: 'Proposal Sent' })
  stage!: string; // 'Discovery' | 'Proposal Sent' | 'Negotiation' | 'Won' | 'Lost'

  @Column({ type: 'varchar', nullable: true })
  expectedClosureDate?: string;

  @Column({ type: 'varchar', nullable: true })
  assignedEmployee?: string;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
