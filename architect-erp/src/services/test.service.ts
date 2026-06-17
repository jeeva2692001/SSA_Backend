export class TestService {
  constructor() {}

  async getTestMessage() {
    // In a real scenario, you could process business logic here
    return {
      id: 1,
      message: 'Hello directly from the Test Service!',
      status: 'ACTIVE'
    };
  }
}
