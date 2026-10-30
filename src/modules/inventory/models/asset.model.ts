import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export type AssetType = 'Workstation' | 'Server' | 'VR Headset' | 'Plotting Device' | 'Tablet' | 'BIM Software License';
export type AssetStatus = 'Assigned' | 'In Stock' | 'Under Repair' | 'Retired';

@Entity('assets')
export class AssetModel {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', nullable: true })
  assetCode?: string; // e.g. "AST-701"

  @Column({ type: 'varchar' })
  assetId!: string; // Internal inventory tag e.g. "SSA-WS-004"

  @Column({ type: 'varchar' })
  assetName!: string;

  @Column({ type: 'varchar', default: 'Workstation' })
  assetType!: AssetType;

  @Column({ type: 'varchar', nullable: true })
  department?: string;

  @Column({ type: 'varchar', nullable: true })
  assignedTo?: string;

  @Column({ type: 'varchar', nullable: true })
  assignedToId?: string;

  @Column({ type: 'varchar', nullable: true })
  purchaseDate?: string;

  @Column({ type: 'varchar', nullable: true })
  warrantyDate?: string;

  @Column({ type: 'varchar', default: 'In Stock' })
  status!: AssetStatus;

  @Column({ type: 'varchar', default: 'COM-001' })
  companyId!: string;

  @Column({ type: 'varchar', nullable: true })
  branchId?: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
