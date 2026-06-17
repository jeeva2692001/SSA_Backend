import { NextRequest, NextResponse } from 'next/server';
import { TestService } from '../services/test.service';

export class TestController {
  private testService: TestService;

  constructor() {
    this.testService = new TestService();
  }

  async getTest(req: NextRequest): Promise<NextResponse> {
    try {
      const data = await this.testService.getTestMessage();
      // Respond with just the data; the 200 status code in the header indicates success
      return NextResponse.json(data, { status: 200 });
    } catch (error: any) {
      // Error is only displayed on the console
      console.error('Error in TestController:', error);
      // Send failure purely via the 500 status code in the header, without a body
      return new NextResponse(null, { status: 500 });
    }
  }
}
