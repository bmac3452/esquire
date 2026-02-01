import request from 'supertest';
import app from '../src/app';

describe('Auth End-to-End', () => {
  let token: string;

  it('should sign up a new user', async () => {
    const res = await request(app)
      .post('/auth/signup')
      .send({
        email: 'testuser@example.com',
        password: 'TestPassword123',
        state: 'CA',
        educationLevel: 'COLLEGE_PLUS'
      });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    token = res.body.token;
  });

  it('should access protected /me route', async () => {
    const res = await request(app)
      .get('/me')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.user).toBeDefined();
    expect(res.body.user.email).toBe('testuser@example.com');
  });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });
