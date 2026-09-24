import { NextRequest, NextResponse } from 'next/server';
import { ProjectService } from '../services/project.service';

export class ProjectController {
  private projectService = new ProjectService();

  private getCompanyId(user: any, searchParams?: URLSearchParams): string | undefined {
    if (user?.role === 'Super Admin') {
      return searchParams?.get('companyId') || undefined;
    }
    return user?.companyId || undefined;
  }

  async getProjects(req: NextRequest, user: any) {
    try {
      const { searchParams } = new URL(req.url);
      const companyId = this.getCompanyId(user, searchParams);
      const projects = await this.projectService.getAllProjects(companyId, user);
      return NextResponse.json({ success: true, data: projects });
    } catch (err: any) {
      console.error('[ProjectController] getProjects error:', err);
      return NextResponse.json({ success: false, message: err.message }, { status: 500 });
    }
  }

  async createProject(req: NextRequest, user: any) {
    try {
      const body = await req.json();
      if (!body.projectName) {
        return NextResponse.json({ success: false, message: 'Project Name is required.' }, { status: 400 });
      }
      const companyId = user?.role === 'Super Admin'
        ? (body.companyId || user?.companyId)
        : user?.companyId;

      const project = await this.projectService.createProject({
        ...body,
        companyId
      });
      return NextResponse.json({ success: true, data: project });
    } catch (err: any) {
      console.error('[ProjectController] createProject error:', err);
      return NextResponse.json({ success: false, message: err.message }, { status: 500 });
    }
  }

  async getProjectById(req: NextRequest, projectId: string, user: any) {
    try {
      const companyId = this.getCompanyId(user);
      const project = await this.projectService.getProjectById(projectId, companyId);
      if (!project) {
        return NextResponse.json({ success: false, message: 'Project not found.' }, { status: 404 });
      }
      return NextResponse.json({ success: true, data: project });
    } catch (err: any) {
      console.error('[ProjectController] getProjectById error:', err);
      return NextResponse.json({ success: false, message: err.message }, { status: 500 });
    }
  }

  async deleteProject(req: NextRequest, projectId: string, user: any) {
    try {
      const companyId = this.getCompanyId(user);
      await this.projectService.deleteProject(projectId, companyId);
      return NextResponse.json({ success: true, message: 'Project deleted successfully' });
    } catch (err: any) {
      console.error('[ProjectController] deleteProject error:', err);
      return NextResponse.json({ success: false, message: err.message }, { status: 400 });
    }
  }

  async getAllDisciplines(req: NextRequest, user: any) {
    try {
      const disciplines = await this.projectService.getAllDisciplines();
      return NextResponse.json({ success: true, data: disciplines });
    } catch (err: any) {
      console.error('[ProjectController] getAllDisciplines error:', err);
      return NextResponse.json({ success: false, message: err.message }, { status: 500 });
    }
  }

  async createDiscipline(req: NextRequest, user: any) {
    try {
      const body = await req.json();
      if (!body.code || !body.name) {
        return NextResponse.json({ success: false, message: 'Discipline Code and Name are required.' }, { status: 400 });
      }
      const created = await this.projectService.createDisciplineMaster(body);
      return NextResponse.json({ success: true, data: created });
    } catch (err: any) {
      console.error('[ProjectController] createDiscipline error:', err);
      return NextResponse.json({ success: false, message: err.message }, { status: 500 });
    }
  }

  async addProjectDiscipline(req: NextRequest, projectId: string, user: any) {
    try {
      const body = await req.json();
      if (!body.disciplineCode) {
        return NextResponse.json({ success: false, message: 'Discipline Code is required.' }, { status: 400 });
      }
      const companyId = this.getCompanyId(user);
      const updatedProject = await this.projectService.addProjectDiscipline(projectId, body.disciplineCode, companyId);
      return NextResponse.json({ success: true, data: updatedProject });
    } catch (err: any) {
      console.error('[ProjectController] addProjectDiscipline error:', err);
      return NextResponse.json({ success: false, message: err.message }, { status: 500 });
    }
  }

  async deleteProjectDiscipline(req: NextRequest, projectId: string, disciplineCode: string, user: any) {
    try {
      const companyId = this.getCompanyId(user);
      const updatedProject = await this.projectService.deleteProjectDiscipline(projectId, disciplineCode, companyId);
      return NextResponse.json({ success: true, data: updatedProject });
    } catch (err: any) {
      console.error('[ProjectController] deleteProjectDiscipline error:', err);
      return NextResponse.json({ success: false, message: err.message }, { status: 500 });
    }
  }

  async getProjectDrawings(req: NextRequest, projectId: string, user: any) {
    try {
      const { searchParams } = new URL(req.url);
      const disciplineCode = searchParams.get('discipline') || undefined;
      const companyId = this.getCompanyId(user);
      const drawings = await this.projectService.getProjectDrawings(projectId, disciplineCode, companyId);
      return NextResponse.json({ success: true, data: drawings });
    } catch (err: any) {
      console.error('[ProjectController] getProjectDrawings error:', err);
      return NextResponse.json({ success: false, message: err.message }, { status: 500 });
    }
  }

  async createProjectDrawing(req: NextRequest, projectId: string, user: any) {
    try {
      const body = await req.json();
      const companyId = this.getCompanyId(user);
      const drawing = await this.projectService.createProjectDrawing(projectId, body, companyId);
      return NextResponse.json({ success: true, data: drawing });
    } catch (err: any) {
      console.error('[ProjectController] createProjectDrawing error:', err);
      return NextResponse.json({ success: false, message: err.message }, { status: 500 });
    }
  }

  async getDrawingDetails(req: NextRequest, drawingId: string, user: any) {
    try {
      const drawing = await this.projectService.getDrawingDetails(drawingId);
      return NextResponse.json({ success: true, data: drawing });
    } catch (err: any) {
      console.error('[ProjectController] getDrawingDetails error:', err);
      return NextResponse.json({ success: false, message: err.message }, { status: 500 });
    }
  }

  async addDrawingRevision(req: NextRequest, drawingId: string, user: any) {
    try {
      const body = await req.json();
      const updatedDrawing = await this.projectService.addDrawingRevision({
        drawingId,
        ...body,
        uploadedBy: user?.email || user?.name || 'User'
      });
      return NextResponse.json({ success: true, data: updatedDrawing });
    } catch (err: any) {
      console.error('[ProjectController] addDrawingRevision error:', err);
      return NextResponse.json({ success: false, message: err.message }, { status: 500 });
    }
  }

  async getDrawingTypes(req: NextRequest, user: any) {
    try {
      const { searchParams } = new URL(req.url);
      const disciplineCode = searchParams.get('discipline') || undefined;
      const types = await this.projectService.getDrawingTypes(disciplineCode);
      return NextResponse.json({ success: true, data: types });
    } catch (err: any) {
      console.error('[ProjectController] getDrawingTypes error:', err);
      return NextResponse.json({ success: false, message: err.message }, { status: 500 });
    }
  }

  async saveDrawingType(req: NextRequest, user: any) {
    try {
      const body = await req.json();
      const dt = await this.projectService.saveDrawingType(body);
      return NextResponse.json({ success: true, data: dt });
    } catch (err: any) {
      console.error('[ProjectController] saveDrawingType error:', err);
      return NextResponse.json({ success: false, message: err.message }, { status: 500 });
    }
  }

  // --- FOLDERS CONTROLLER METHODS ---
  async getProjectFolders(req: NextRequest, projectId: string, user: any) {
    try {
      const companyId = this.getCompanyId(user);
      const result = await this.projectService.getProjectFolders(projectId, companyId);
      return NextResponse.json({ success: true, data: result.folders, project: result.project });
    } catch (err: any) {
      console.error('[ProjectController] getProjectFolders error:', err);
      return NextResponse.json({ success: false, message: err.message }, { status: 500 });
    }
  }

  async createFolder(req: NextRequest, projectId: string, user: any) {
    try {
      const body = await req.json();
      if (!body.name) {
        return NextResponse.json({ success: false, message: 'Folder name is required.' }, { status: 400 });
      }
      const companyId = this.getCompanyId(user);
      const folder = await this.projectService.createFolder({
        projectId,
        parentFolderId: body.parentFolderId || null,
        name: body.name,
        folderType: body.folderType || 'CUSTOM',
        createdBy: user?.name || user?.email || 'User'
      }, companyId);
      return NextResponse.json({ success: true, data: folder });
    } catch (err: any) {
      console.error('[ProjectController] createFolder error:', err);
      return NextResponse.json({ success: false, message: err.message }, { status: 500 });
    }
  }

  async renameFolder(req: NextRequest, folderId: string, user: any) {
    try {
      const body = await req.json();
      if (!body.name) {
        return NextResponse.json({ success: false, message: 'New folder name is required.' }, { status: 400 });
      }
      const updated = await this.projectService.renameFolder(folderId, body.name);
      return NextResponse.json({ success: true, data: updated });
    } catch (err: any) {
      console.error('[ProjectController] renameFolder error:', err);
      return NextResponse.json({ success: false, message: err.message }, { status: 500 });
    }
  }

  async deleteFolder(req: NextRequest, folderId: string, user: any) {
    try {
      const ok = await this.projectService.deleteFolder(folderId);
      if (!ok) {
        return NextResponse.json({ success: false, message: 'Folder not found.' }, { status: 404 });
      }
      return NextResponse.json({ success: true, message: 'Folder deleted successfully.' });
    } catch (err: any) {
      console.error('[ProjectController] deleteFolder error:', err);
      return NextResponse.json({ success: false, message: err.message }, { status: 500 });
    }
  }

  async initProjectFolderHierarchy(req: NextRequest, projectId: string, user: any) {
    try {
      const companyId = this.getCompanyId(user);
      const folders = await this.projectService.initProjectFolderHierarchy(
        projectId,
        user?.name || user?.email || 'System',
        companyId
      );
      return NextResponse.json({ success: true, data: folders });
    } catch (err: any) {
      console.error('[ProjectController] initProjectFolderHierarchy error:', err);
      return NextResponse.json({ success: false, message: err.message }, { status: 500 });
    }
  }

  // --- PROJECT FILES CONTROLLER METHODS ---
  async getProjectFiles(req: NextRequest, projectId: string, user: any) {
    try {
      const { searchParams } = new URL(req.url);
      const folderId = searchParams.get('folderId') || undefined;
      const companyId = this.getCompanyId(user);
      const files = await this.projectService.getProjectFiles(projectId, folderId, companyId);
      return NextResponse.json({ success: true, data: files });
    } catch (err: any) {
      console.error('[ProjectController] getProjectFiles error:', err);
      return NextResponse.json({ success: false, message: err.message }, { status: 500 });
    }
  }

  async createProjectFile(req: NextRequest, projectId: string, user: any) {
    try {
      const body = await req.json();
      if (!body.folderId || !body.fileName || !body.filePath) {
        return NextResponse.json({
          success: false,
          message: 'folderId, fileName, and filePath are required.'
        }, { status: 400 });
      }
      const companyId = this.getCompanyId(user);
      const file = await this.projectService.createProjectFile({
        projectId,
        folderId: body.folderId,
        fileName: body.fileName,
        filePath: body.filePath,
        fileType: body.fileType,
        fileSize: body.fileSize,
        tagLine: body.tagLine,
        tags: body.tags,
        uploadedBy: user?.name || user?.email || 'User'
      }, companyId);
      return NextResponse.json({ success: true, data: file });
    } catch (err: any) {
      console.error('[ProjectController] createProjectFile error:', err);
      return NextResponse.json({ success: false, message: err.message }, { status: 500 });
    }
  }

  async renameProjectFile(req: NextRequest, fileId: string, user: any) {
    try {
      const body = await req.json();
      if (!body.fileName && body.tagLine === undefined && body.tags === undefined) {
        return NextResponse.json({ success: false, message: 'fileName, tagLine, or tags is required.' }, { status: 400 });
      }
      const updates: any = {};
      if (body.fileName) updates.fileName = body.fileName.trim();
      if (body.tagLine !== undefined) updates.tagLine = body.tagLine ? body.tagLine.trim() : null;
      if (body.tags !== undefined) updates.tags = body.tags ? body.tags.trim() : null;

      const updated = await this.projectService.updateProjectFile(fileId, updates);
      return NextResponse.json({ success: true, data: updated });
    } catch (err: any) {
      console.error('[ProjectController] renameProjectFile error:', err);
      return NextResponse.json({ success: false, message: err.message }, { status: 500 });
    }
  }

  async deleteProjectFile(req: NextRequest, fileId: string, user: any) {
    try {
      const ok = await this.projectService.deleteProjectFile(fileId);
      if (!ok) {
        return NextResponse.json({ success: false, message: 'File not found.' }, { status: 404 });
      }
      return NextResponse.json({ success: true, message: 'File deleted successfully.' });
    } catch (err: any) {
      console.error('[ProjectController] deleteProjectFile error:', err);
      return NextResponse.json({ success: false, message: err.message }, { status: 500 });
    }
  }

  async handleFileApprovalAction(req: NextRequest, fileId: string, user: any) {
    try {
      const body = await req.json();
      if (!body.action) {
        return NextResponse.json({ success: false, message: 'Approval action is required.' }, { status: 400 });
      }

      const updatedFile = await this.projectService.handleFileApprovalAction(
        fileId,
        body.action,
        {
          name: user?.name || user?.userId || 'User',
          role: user?.role || 'User',
          email: user?.email,
          userId: user?.userId
        },
        body.notes
      );

      return NextResponse.json({ success: true, data: updatedFile });
    } catch (err: any) {
      console.error('[ProjectController] handleFileApprovalAction error:', err);
      return NextResponse.json({ success: false, message: err.message }, { status: 500 });
    }
  }
}

