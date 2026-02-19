/**
 * Test Users Configuration
 * Pre-defined test users for each role for Playwright tests
 */

export interface TestUser {
  email: string;
  password: string;
  fullName: string;
  role: 'student' | 'teacher' | 'admin';
}

export const testUsers: Record<string, TestUser> = {
  student1: {
    email: 'student1@test.com',
    password: 'testpassword123',
    fullName: 'Test Student One',
    role: 'student'
  },
  student2: {
    email: 'student2@test.com',
    password: 'testpassword123',
    fullName: 'Test Student Two',
    role: 'student'
  },
  teacher1: {
    email: 'teacher1@test.com',
    password: 'testpassword123',
    fullName: 'Test Teacher One',
    role: 'teacher'
  },
  teacher2: {
    email: 'teacher2@test.com',
    password: 'testpassword123',
    fullName: 'Test Teacher Two',
    role: 'teacher'
  },
  admin1: {
    email: 'admin1@test.com',
    password: 'testpassword123',
    fullName: 'Test Admin One',
    role: 'admin'
  }
};

export const getTestUser = (key: keyof typeof testUsers): TestUser => {
  return testUsers[key];
};

export const getTestUsersByRole = (role: 'student' | 'teacher' | 'admin'): TestUser[] => {
  return Object.values(testUsers).filter(user => user.role === role);
};

export const getAllTestUsers = (): TestUser[] => {
  return Object.values(testUsers);
};