import { generateScaffold } from '../generators/scaffold';
import { existsSync, readFileSync, rmSync } from 'fs';
import path from 'path';

// Mock dependencies
jest.mock('execa');
jest.mock('simple-git');
jest.mock('ora', () => {
  return jest.fn().mockImplementation(() => ({
    start: jest.fn().mockReturnThis(),
    succeed: jest.fn().mockReturnThis(),
    fail: jest.fn().mockReturnThis(),
    stop: jest.fn().mockReturnThis()
  }));
});

const mockExeca = require('execa');
const mockSimpleGit = require('simple-git');

describe('generateScaffold', () => {
  const testProjectName = 'test-project';
  const testProjectPath = path.resolve(process.cwd(), testProjectName);

  beforeEach(() => {
    // Clear mocks
    jest.clearAllMocks();
    
    // Mock execa to succeed
    mockExeca.mockResolvedValue({ stdout: '', stderr: '' });
    
    // Mock simple-git
    const mockGit = {
      init: jest.fn().mockResolvedValue(undefined),
      add: jest.fn().mockResolvedValue(undefined),
      commit: jest.fn().mockResolvedValue(undefined)
    };
    mockSimpleGit.mockReturnValue(mockGit);
  });

  afterEach(() => {
    // Clean up test project directory
    if (existsSync(testProjectPath)) {
      rmSync(testProjectPath, { recursive: true, force: true });
    }
  });

  describe('Node.js template', () => {
    it('should create a Node.js project successfully', async () => {
      await generateScaffold(testProjectName, {
        template: 'node',
        aiEnhanced: false,
        deployTarget: 'vercel',
        withDemo: false
      });

      expect(existsSync(testProjectPath)).toBe(true);
      expect(existsSync(path.join(testProjectPath, 'package.json'))).toBe(true);
      expect(existsSync(path.join(testProjectPath, 'src'))).toBe(true);
      expect(existsSync(path.join(testProjectPath, '.github/workflows/ci.yml'))).toBe(true);
    });

    it('should replace placeholders in generated files', async () => {
      await generateScaffold(testProjectName, {
        template: 'node',
        aiEnhanced: false,
        deployTarget: 'vercel',
        withDemo: false
      });

      const packageJson = JSON.parse(readFileSync(path.join(testProjectPath, 'package.json'), 'utf8'));
      expect(packageJson.name).toBe(testProjectName);
    });
  });

  describe('React template', () => {
    it('should create a React project successfully', async () => {
      await generateScaffold(testProjectName, {
        template: 'react',
        aiEnhanced: false,
        deployTarget: 'vercel',
        withDemo: false
      });

      expect(existsSync(testProjectPath)).toBe(true);
      expect(existsSync(path.join(testProjectPath, 'package.json'))).toBe(true);
      expect(existsSync(path.join(testProjectPath, 'src/App.jsx'))).toBe(true);
      expect(existsSync(path.join(testProjectPath, '.github/workflows/ci.yml'))).toBe(true);
    });
  });

  describe('Python template', () => {
    it('should create a Python project successfully', async () => {
      await generateScaffold(testProjectName, {
        template: 'python',
        aiEnhanced: false,
        deployTarget: 'vercel',
        withDemo: false
      });

      expect(existsSync(testProjectPath)).toBe(true);
      expect(existsSync(path.join(testProjectPath, 'requirements.txt'))).toBe(true);
      expect(existsSync(path.join(testProjectPath, 'src'))).toBe(true);
      expect(existsSync(path.join(testProjectPath, '.github/workflows/ci.yml'))).toBe(true);
    });
  });

  describe('Full-stack template', () => {
    it('should create a full-stack project successfully', async () => {
      await generateScaffold(testProjectName, {
        template: 'full-stack',
        aiEnhanced: false,
        deployTarget: 'vercel',
        withDemo: false
      });

      expect(existsSync(testProjectPath)).toBe(true);
      expect(existsSync(path.join(testProjectPath, 'server'))).toBe(true);
      expect(existsSync(path.join(testProjectPath, 'client'))).toBe(true);
      expect(existsSync(path.join(testProjectPath, 'package.json'))).toBe(true);
      expect(existsSync(path.join(testProjectPath, '.github/workflows/ci.yml'))).toBe(true);
    });
  });

  describe('Error handling', () => {
    it('should throw error if project directory already exists', async () => {
      // Create the directory first
      require('fs').mkdirSync(testProjectPath, { recursive: true });

      await expect(generateScaffold(testProjectName, {
        template: 'node',
        aiEnhanced: false,
        deployTarget: 'vercel',
        withDemo: false
      })).rejects.toThrow(`Directory ${testProjectName} already exists.`);
    });

    it('should throw error if template does not exist', async () => {
      await expect(generateScaffold(testProjectName, {
        template: 'non-existent-template',
        aiEnhanced: false,
        deployTarget: 'vercel',
        withDemo: false
      })).rejects.toThrow("Template 'non-existent-template' not found");
    });

    it('should handle npm install failure gracefully', async () => {
      mockExeca.mockRejectedValueOnce(new Error('npm install failed'));

      await expect(generateScaffold(testProjectName, {
        template: 'node',
        aiEnhanced: false,
        deployTarget: 'vercel',
        withDemo: false
      })).rejects.toThrow('npm install failed');
    });
  });

  describe('Git initialization', () => {
    it('should initialize git repository', async () => {
      await generateScaffold(testProjectName, {
        template: 'node',
        aiEnhanced: false,
        deployTarget: 'vercel',
        withDemo: false
      });

      const mockGit = mockSimpleGit();
      expect(mockGit.init).toHaveBeenCalled();
      expect(mockGit.add).toHaveBeenCalledWith('.');
      expect(mockGit.commit).toHaveBeenCalledWith('chore: initial commit via openai-internal-copilot');
    });
  });
}); 