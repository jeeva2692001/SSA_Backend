import "reflect-metadata";
import { DataSource } from "typeorm";
import { envConfig } from "./env.config";
import { TestModel } from "../../modules/test/models/test.model";
import { UserModel } from "../../modules/auth/models/user.model";

const globalRef = global as unknown as { AppDataSource: DataSource | undefined };

export const AppDataSource = globalRef.AppDataSource || new DataSource({
  type: "postgres",
  host: envConfig.database.host,
  port: envConfig.database.port,
  username: envConfig.database.username,
  password: envConfig.database.password,
  database: envConfig.database.database,
  synchronize: true,
  logging: true,
  entities: [TestModel, UserModel],
  migrations: [],
  subscribers: [],
});

if (process.env.NODE_ENV !== "production") {
  globalRef.AppDataSource = AppDataSource;
}

export async function getDataSource() {
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
    
    // Seed default superadmin user if database is empty
    try {
      const userRepo = AppDataSource.getRepository(UserModel);
      const count = await userRepo.count();
      if (count === 0) {
        const bcrypt = require('bcryptjs');
        const hashedPassword = await bcrypt.hash('Admin@123', 10);
        const adminUser = userRepo.create({
          userId: 'superadmin',
          name: 'Sundar Sundram',
          email: 'sundar@sundramarchitects.com',
          role: 'Super Admin',
          password: hashedPassword,
        });
        await userRepo.save(adminUser);
        console.log('[Seed] Default superadmin user seeded successfully.');
      }
    } catch (err) {
      console.error('[Seed] Error seeding default admin user:', err);
    }
  }
  return AppDataSource;
}
