import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index, Unique } from 'typeorm';

export interface PermissionsMap {
  Create: boolean;
  Read: boolean;
  Update: boolean;
  Delete: boolean;
  Approve: boolean;
  Export: boolean;
  [key: string]: boolean;
}

@Entity('role_permissions')
@Unique(['role', 'companyId'])
export class RolePermissionModel {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar' })
  role!: string;

  @Column({ type: 'varchar', nullable: true })
  description?: string;

  @Column({ type: 'boolean', default: false })
  isSystem!: boolean;

  @Column({ type: 'jsonb', default: () => "'{}'" })
  permissions!: PermissionsMap;

  @Column({ type: 'varchar', default: 'COM-001' })
  @Index()
  companyId!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
