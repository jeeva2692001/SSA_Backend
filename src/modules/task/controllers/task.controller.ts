import { NextRequest, NextResponse } from 'next/server';
import { TaskService } from '../services/task.service';

export class TaskController {
  private taskService: TaskService;

  constructor() {
    this.taskService = new TaskService();
  }

  async getAllTasks(req: NextRequest, user: any) {
    try {
      const { searchParams } = new URL(req.url);
      const search = searchParams.get('search') || undefined;
      const projectCode = searchParams.get('projectCode') || undefined;
      const priority = searchParams.get('priority') || undefined;
      const status = searchParams.get('status') || undefined;
      const assignedToId = searchParams.get('assignedToId') || undefined;

      const branchId = user?.role === 'Branch' ? (user?.branchId || undefined) : (searchParams.get('branchId') || undefined);

      const tasks = await this.taskService.getAllTasks(
        {
          companyId: user?.companyId || 'COM-001',
          branchId,
          role: user?.role
        },
        { search, projectCode, priority, status, assignedToId }
      );

      return NextResponse.json({ success: true, data: tasks }, { status: 200 });
    } catch (err: any) {
      console.error('[TaskController] getAllTasks error:', err);
      return NextResponse.json({ success: false, message: err.message }, { status: 500 });
    }
  }

  async getTaskById(_req: NextRequest, id: string) {
    try {
      const task = await this.taskService.getTaskById(id);
      if (!task) {
        return NextResponse.json({ success: false, message: 'Task not found.' }, { status: 404 });
      }
      return NextResponse.json({ success: true, data: task }, { status: 200 });
    } catch (err: any) {
      return NextResponse.json({ success: false, message: err.message }, { status: 500 });
    }
  }

  async createTask(req: NextRequest, user: any) {
    try {
      const body = await req.json();
      const task = await this.taskService.createTask(body, {
        companyId: user?.companyId || 'COM-001',
        branchId: user?.branchId || null,
        userId: user?.userId,
        userName: user?.name
      });
      return NextResponse.json({
        success: true,
        data: task,
        message: `Task "${task.taskName}" created successfully with code ${task.taskCode}.`
      }, { status: 201 });
    } catch (err: any) {
      return NextResponse.json({ success: false, message: err.message }, { status: 400 });
    }
  }

  async updateTask(req: NextRequest, id: string, user: any) {
    try {
      const body = await req.json();
      const task = await this.taskService.updateTask(id, body, {
        companyId: user?.companyId,
        role: user?.role
      });
      if (!task) {
        return NextResponse.json({ success: false, message: 'Task not found.' }, { status: 404 });
      }
      return NextResponse.json({
        success: true,
        data: task,
        message: 'Task updated successfully.'
      }, { status: 200 });
    } catch (err: any) {
      return NextResponse.json({ success: false, message: err.message }, { status: 400 });
    }
  }

  async deleteTask(_req: NextRequest, id: string, _user: any) {
    try {
      const success = await this.taskService.deleteTask(id);
      if (!success) {
        return NextResponse.json({ success: false, message: 'Task not found.' }, { status: 404 });
      }
      return NextResponse.json({ success: true, message: 'Task deleted successfully.' }, { status: 200 });
    } catch (err: any) {
      return NextResponse.json({ success: false, message: err.message }, { status: 500 });
    }
  }
}
