import { getDataSource } from './data-source';
import { UserModel } from '../../modules/auth/models/user.model';
import { CompanyModel } from '../../modules/company/models/company.model';
import { BranchModel } from '../../modules/branch/models/branch.model';

async function main() {
  console.log('[DB-Init] Initializing database connection and synchronizing schemas...');
  try {
    const ds = await getDataSource();
    console.log('[DB-Init] Database synchronized successfully!');
    
    const userRepo = ds.getRepository(UserModel);
    const count = await userRepo.count();
    console.log(`[DB-Init] Database check - Current user count in 'users' table: ${count}`);

    const companyRepo = ds.getRepository(CompanyModel);
    const companyCount = await companyRepo.count();
    console.log(`[DB-Init] Database check - Current company count in 'companies' table: ${companyCount}`);

    const branchRepo = ds.getRepository(BranchModel);
    const branchCount = await branchRepo.count();
    console.log(`[DB-Init] Database check - Current branch count in 'branches' table: ${branchCount}`);
    
    process.exit(0);
  } catch (err) {
    console.error('[DB-Init] Error initializing database:', err);
    process.exit(1);
  }
}

main();
