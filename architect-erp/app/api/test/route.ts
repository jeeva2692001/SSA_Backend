import { NextRequest } from 'next/server';
import { TestController } from '../../../src/controllers/test.controller';
import { testMiddleware } from '../../../src/middlewares/test.middleware';

const testController = new TestController();

export async function GET(req: NextRequest) {
  // Wrap controller call with the middleware
  return await testMiddleware(req, async () => {
    return await testController.getTest(req);
  });
}
