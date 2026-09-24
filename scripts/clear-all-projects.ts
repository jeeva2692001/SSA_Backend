import { getDataSource } from '../src/shared/config/data-source';
import {
  ProjectModel,
  ProjectDisciplineModel,
  DrawingTypeModel,
  DrawingModel,
  DrawingRevisionModel,
  DrawingFileModel,
  FolderModel,
  ProjectFileModel
} from '../src/modules/project/models';

async function clearAllProjects() {
  console.log('--- Initializing Data Source ---');
  const ds = await getDataSource();
  console.log('--- Database Connected Successfully ---');

  try {
    const drawingFileRepo = ds.getRepository(DrawingFileModel);
    const drawingRevisionRepo = ds.getRepository(DrawingRevisionModel);
    const drawingRepo = ds.getRepository(DrawingModel);
    const drawingTypeRepo = ds.getRepository(DrawingTypeModel);
    const projectFileRepo = ds.getRepository(ProjectFileModel);
    const folderRepo = ds.getRepository(FolderModel);
    const projectDisciplineRepo = ds.getRepository(ProjectDisciplineModel);
    const projectRepo = ds.getRepository(ProjectModel);

    console.log('1. Clearing drawing files...');
    await drawingFileRepo.createQueryBuilder().delete().execute();

    console.log('2. Clearing drawing revisions...');
    await drawingRevisionRepo.createQueryBuilder().delete().execute();

    console.log('3. Clearing drawings...');
    await drawingRepo.createQueryBuilder().delete().execute();

    console.log('4. Clearing drawing types...');
    await drawingTypeRepo.createQueryBuilder().delete().execute();

    console.log('5. Clearing project files...');
    await projectFileRepo.createQueryBuilder().delete().execute();

    console.log('6. Clearing folders...');
    await folderRepo.createQueryBuilder().delete().execute();

    console.log('7. Clearing project disciplines...');
    await projectDisciplineRepo.createQueryBuilder().delete().execute();

    console.log('8. Clearing projects...');
    await projectRepo.createQueryBuilder().delete().execute();

    console.log('✅ ALL PROJECTS AND ASSOCIATED DATA CLEARED SUCCESSFULLY!');
  } catch (err) {
    console.error('❌ Error clearing projects:', err);
  } finally {
    await ds.destroy();
    process.exit(0);
  }
}

clearAllProjects();
