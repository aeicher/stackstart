import path from 'path';
import { existsSync, readFileSync, writeFileSync, mkdirSync, rmSync } from 'fs';
import { AIProjectAnalyzer, enhanceWithAI } from '../generators/ai-enhancer';

// Create test project directory
const testProjectPath = path.join(__dirname, 'test-project');

describe('AIProjectAnalyzer', () => {
  let analyzer: AIProjectAnalyzer;

  beforeEach(() => {
    // Clean up any existing test directory
    if (existsSync(testProjectPath)) {
      rmSync(testProjectPath, { recursive: true, force: true });
    }
    
    // Create fresh test project directory
    mkdirSync(testProjectPath, { recursive: true });
    
    // Create basic package.json
    const packageJson = {
      name: 'test-project',
      version: '1.0.0',
      scripts: {
        test: 'jest'
      },
      dependencies: {},
      devDependencies: {
        jest: '^29.7.0'
      }
    };
    
    writeFileSync(path.join(testProjectPath, 'package.json'), JSON.stringify(packageJson, null, 2));
    
    // Create basic project structure
    mkdirSync(path.join(testProjectPath, 'src'), { recursive: true });
    writeFileSync(path.join(testProjectPath, 'src/index.js'), 'console.log("Hello World");');
    writeFileSync(path.join(testProjectPath, 'README.md'), '# Test Project');
    
    analyzer = new AIProjectAnalyzer(testProjectPath, 'node');
  });

  afterEach(() => {
    // Clean up test directory
    if (existsSync(testProjectPath)) {
      rmSync(testProjectPath, { recursive: true, force: true });
    }
  });

  describe('Project Analysis', () => {
    it('should analyze basic project structure', async () => {
      const analysis = await analyzer.analyze();
      
      expect(analysis.template).toBe('node');
      expect(analysis.projectRoot).toBe(testProjectPath);
      expect(analysis.packageJson).toBeDefined();
      expect(analysis.packageJson.name).toBe('test-project');
      expect(analysis.files).toContain('package.json');
      expect(analysis.files).toContain('src/index.js');
      expect(analysis.files).toContain('README.md');
    });

    it('should detect existing features in project structure', async () => {
      // Add additional files to simulate existing features
      writeFileSync(path.join(testProjectPath, '.eslintrc.js'), 'module.exports = {};');
      writeFileSync(path.join(testProjectPath, '.prettierrc'), '{}');
      
      const analysis = await analyzer.analyze();
      
      expect(analysis.structure.hasTests).toBe(true); // jest is in devDependencies
      expect(analysis.structure.hasLinting).toBe(true); // .eslintrc.js exists
      expect(analysis.structure.hasFormatting).toBe(true); // .prettierrc exists
      expect(analysis.structure.hasDocumentation).toBe(true); // README.md exists
    });

    it('should identify missing features', async () => {
      const analysis = await analyzer.analyze();
      
      expect(analysis.structure.hasErrorHandling).toBe(false);
      expect(analysis.structure.hasEnvironmentConfig).toBe(false);
      expect(analysis.structure.hasLogging).toBe(false);
      expect(analysis.structure.hasValidation).toBe(false);
      expect(analysis.structure.hasApiDocumentation).toBe(false);
    });

    it('should detect error handling in code', async () => {
      // Add code with error handling
      const codeWithErrorHandling = `
        try {
          const result = someFunction();
          return result;
        } catch (error) {
          console.error('Error occurred:', error);
          throw error;
        }
      `;
      
      writeFileSync(path.join(testProjectPath, 'src/index.js'), codeWithErrorHandling);
      
      const analysis = await analyzer.analyze();
      expect(analysis.structure.hasErrorHandling).toBe(true);
    });

    it('should detect logging libraries', async () => {
      const packageJson = JSON.parse(readFileSync(path.join(testProjectPath, 'package.json'), 'utf8'));
      packageJson.dependencies.winston = '^3.11.0';
      writeFileSync(path.join(testProjectPath, 'package.json'), JSON.stringify(packageJson, null, 2));
      
      const analysis = await analyzer.analyze();
      expect(analysis.structure.hasLogging).toBe(true);
    });

    it('should detect validation libraries', async () => {
      const packageJson = JSON.parse(readFileSync(path.join(testProjectPath, 'package.json'), 'utf8'));
      packageJson.dependencies.joi = '^17.11.0';
      writeFileSync(path.join(testProjectPath, 'package.json'), JSON.stringify(packageJson, null, 2));
      
      const analysis = await analyzer.analyze();
      expect(analysis.structure.hasValidation).toBe(true);
    });
  });

  describe('Enhancement Identification', () => {
    it('should identify basic enhancements for node project', async () => {
      const analysis = await analyzer.analyze();
      
      expect(analysis.improvements.length).toBeGreaterThan(0);
      
      const improvementDescriptions = analysis.improvements.map(imp => imp.description);
      expect(improvementDescriptions).toContain('Add structured logging with Winston');
      expect(improvementDescriptions).toContain('Add comprehensive error handling');
      expect(improvementDescriptions).toContain('Add environment configuration with dotenv');
    });

    it('should prioritize improvements correctly', async () => {
      const analysis = await analyzer.analyze();
      
      const highPriorityImprovements = analysis.improvements.filter(imp => imp.priority === 'high');
      const mediumPriorityImprovements = analysis.improvements.filter(imp => imp.priority === 'medium');
      const lowPriorityImprovements = analysis.improvements.filter(imp => imp.priority === 'low');
      
      expect(highPriorityImprovements.length).toBeGreaterThan(0);
      expect(mediumPriorityImprovements.length).toBeGreaterThan(0);
      
      // Check that high priority improvements include critical features
      const highPriorityDescriptions = highPriorityImprovements.map(imp => imp.description);
      expect(highPriorityDescriptions).toContain('Add structured logging with Winston');
      expect(highPriorityDescriptions).toContain('Add comprehensive error handling');
    });
  });

  describe('Template-Specific Enhancements', () => {
    it('should provide React-specific enhancements', async () => {
      const reactAnalyzer = new AIProjectAnalyzer(testProjectPath, 'react');
      const analysis = await reactAnalyzer.analyze();
      
      const improvementDescriptions = analysis.improvements.map(imp => imp.description);
      expect(improvementDescriptions).toContain('Add React performance optimization utilities');
      expect(improvementDescriptions).toContain('Add React Router for navigation');
    });

    it('should provide Python-specific enhancements', async () => {
      const pythonAnalyzer = new AIProjectAnalyzer(testProjectPath, 'python');
      const analysis = await pythonAnalyzer.analyze();
      
      const improvementDescriptions = analysis.improvements.map(imp => imp.description);
      expect(improvementDescriptions).toContain('Add Python logging configuration');
      expect(improvementDescriptions).toContain('Add Flask/FastAPI utilities');
    });

    it('should provide full-stack enhancements', async () => {
      const fullStackAnalyzer = new AIProjectAnalyzer(testProjectPath, 'full-stack');
      const analysis = await fullStackAnalyzer.analyze();
      
      const improvementDescriptions = analysis.improvements.map(imp => imp.description);
      expect(improvementDescriptions).toContain('Add API client utilities for frontend-backend communication');
    });
  });
});

describe('Enhancement Implementations', () => {
  let analyzer: AIProjectAnalyzer;

  beforeEach(() => {
    // Clean up any existing test directory
    if (existsSync(testProjectPath)) {
      rmSync(testProjectPath, { recursive: true, force: true });
    }
    
    // Create fresh test project directory
    mkdirSync(testProjectPath, { recursive: true });
    
    // Create basic package.json
    const packageJson = {
      name: 'test-project',
      version: '1.0.0',
      scripts: {
        test: 'jest'
      },
      dependencies: {},
      devDependencies: {
        jest: '^29.7.0'
      }
    };
    
    writeFileSync(path.join(testProjectPath, 'package.json'), JSON.stringify(packageJson, null, 2));
    
    // Create basic project structure
    mkdirSync(path.join(testProjectPath, 'src'), { recursive: true });
    writeFileSync(path.join(testProjectPath, 'src/index.js'), 'console.log("Hello World");');
    
    analyzer = new AIProjectAnalyzer(testProjectPath, 'node');
  });

  afterEach(() => {
    // Clean up test directory
    if (existsSync(testProjectPath)) {
      rmSync(testProjectPath, { recursive: true, force: true });
    }
  });

  describe('Logging Enhancement', () => {
    it('should add Winston logging configuration', async () => {
      const analysis = await analyzer.analyze();
      const loggingEnhancement = analysis.improvements.find(imp => 
        imp.description.includes('structured logging with Winston')
      );
      
      expect(loggingEnhancement).toBeDefined();
      
      // Apply the enhancement
      if (loggingEnhancement) {
        await loggingEnhancement.implementation();
      }
      
      // Check that Winston was added to dependencies
      const packageJson = JSON.parse(readFileSync(path.join(testProjectPath, 'package.json'), 'utf8'));
      expect(packageJson.dependencies.winston).toBeDefined();
      
      // Check that logger utility was created
      const loggerPath = path.join(testProjectPath, 'src/utils/logger.js');
      expect(existsSync(loggerPath)).toBe(true);
      
      const loggerContent = readFileSync(loggerPath, 'utf8');
      expect(loggerContent).toContain('winston');
      expect(loggerContent).toContain('createLogger');
    });
  });

  describe('Error Handling Enhancement', () => {
    it('should add comprehensive error handling utilities', async () => {
      const analysis = await analyzer.analyze();
      const errorHandlingEnhancement = analysis.improvements.find(imp => 
        imp.description.includes('comprehensive error handling')
      );
      
      expect(errorHandlingEnhancement).toBeDefined();
      
      // Apply the enhancement
      if (errorHandlingEnhancement) {
        await errorHandlingEnhancement.implementation();
      }
      
      // Check that error handler utility was created
      const errorHandlerPath = path.join(testProjectPath, 'src/utils/errorHandler.js');
      expect(existsSync(errorHandlerPath)).toBe(true);
      
      const errorHandlerContent = readFileSync(errorHandlerPath, 'utf8');
      expect(errorHandlerContent).toContain('AppError');
      expect(errorHandlerContent).toContain('handleError');
      expect(errorHandlerContent).toContain('asyncHandler');
    });
  });

  describe('Environment Configuration Enhancement', () => {
    it('should add dotenv configuration', async () => {
      const analysis = await analyzer.analyze();
      const envEnhancement = analysis.improvements.find(imp => 
        imp.description.includes('environment configuration with dotenv')
      );
      
      expect(envEnhancement).toBeDefined();
      
      // Apply the enhancement
      if (envEnhancement) {
        await envEnhancement.implementation();
      }
      
      // Check that dotenv was added to dependencies
      const packageJson = JSON.parse(readFileSync(path.join(testProjectPath, 'package.json'), 'utf8'));
      expect(packageJson.dependencies.dotenv).toBeDefined();
      
      // Check that .env.example was created
      const envExamplePath = path.join(testProjectPath, '.env.example');
      expect(existsSync(envExamplePath)).toBe(true);
      
      const envExampleContent = readFileSync(envExamplePath, 'utf8');
      expect(envExampleContent).toContain('NODE_ENV');
      expect(envExampleContent).toContain('PORT');
      
      // Check that .gitignore was created/updated
      const gitignorePath = path.join(testProjectPath, '.gitignore');
      expect(existsSync(gitignorePath)).toBe(true);
      
      const gitignoreContent = readFileSync(gitignorePath, 'utf8');
      expect(gitignoreContent).toContain('.env');
    });
  });

  describe('Validation Enhancement', () => {
    it('should add Joi validation utilities', async () => {
      const analysis = await analyzer.analyze();
      const validationEnhancement = analysis.improvements.find(imp => 
        imp.description.includes('input validation with Joi')
      );
      
      expect(validationEnhancement).toBeDefined();
      
      // Apply the enhancement
      if (validationEnhancement) {
        await validationEnhancement.implementation();
      }
      
      // Check that Joi was added to dependencies
      const packageJson = JSON.parse(readFileSync(path.join(testProjectPath, 'package.json'), 'utf8'));
      expect(packageJson.dependencies.joi).toBeDefined();
      
      // Check that validation utility was created
      const validationPath = path.join(testProjectPath, 'src/utils/validation.js');
      expect(existsSync(validationPath)).toBe(true);
      
      const validationContent = readFileSync(validationPath, 'utf8');
      expect(validationContent).toContain('Joi');
      expect(validationContent).toContain('validateRequest');
      expect(validationContent).toContain('userSchema');
    });
  });

  describe('API Documentation Enhancement', () => {
    it('should add Swagger/OpenAPI documentation', async () => {
      const analysis = await analyzer.analyze();
      const apiDocEnhancement = analysis.improvements.find(imp => 
        imp.description.includes('API documentation with Swagger/OpenAPI')
      );
      
      expect(apiDocEnhancement).toBeDefined();
      
      // Apply the enhancement
      if (apiDocEnhancement) {
        await apiDocEnhancement.implementation();
      }
      
      // Check that Swagger dependencies were added
      const packageJson = JSON.parse(readFileSync(path.join(testProjectPath, 'package.json'), 'utf8'));
      expect(packageJson.dependencies['swagger-ui-express']).toBeDefined();
      expect(packageJson.dependencies['swagger-jsdoc']).toBeDefined();
      
      // Check that Swagger configuration was created
      const swaggerPath = path.join(testProjectPath, 'src/utils/swagger.js');
      expect(existsSync(swaggerPath)).toBe(true);
      
      const swaggerContent = readFileSync(swaggerPath, 'utf8');
      expect(swaggerContent).toContain('swaggerJSDoc');
      expect(swaggerContent).toContain('setupSwagger');
    });
  });

  describe('Testing Configuration Enhancement', () => {
    it('should enhance testing configuration', async () => {
      const analysis = await analyzer.analyze();
      const testingEnhancement = analysis.improvements.find(imp => 
        imp.description.includes('testing configuration with coverage')
      );
      
      expect(testingEnhancement).toBeDefined();
      
      // Apply the enhancement
      if (testingEnhancement) {
        await testingEnhancement.implementation();
      }
      
      // Check that testing dependencies were added
      const packageJson = JSON.parse(readFileSync(path.join(testProjectPath, 'package.json'), 'utf8'));
      expect(packageJson.scripts['test:coverage']).toBeDefined();
      expect(packageJson.scripts['test:watch']).toBeDefined();
      expect(packageJson.devDependencies['supertest']).toBeDefined();
      
      // Check that Jest configuration was created
      const jestConfigPath = path.join(testProjectPath, 'jest.config.js');
      expect(existsSync(jestConfigPath)).toBe(true);
      
      const jestConfigContent = readFileSync(jestConfigPath, 'utf8');
      expect(jestConfigContent).toContain('collectCoverage');
      expect(jestConfigContent).toContain('coverageDirectory');
    });
  });
});

describe('Integration Tests', () => {
  beforeEach(() => {
    // Clean up any existing test directory
    if (existsSync(testProjectPath)) {
      rmSync(testProjectPath, { recursive: true, force: true });
    }
  });

  afterEach(() => {
    // Clean up test directory
    if (existsSync(testProjectPath)) {
      rmSync(testProjectPath, { recursive: true, force: true });
    }
  });

  describe('Full Enhancement Flow', () => {
    it('should successfully enhance a basic Node.js project', async () => {
      // Create a basic project structure
      mkdirSync(testProjectPath, { recursive: true });
      mkdirSync(path.join(testProjectPath, 'src'), { recursive: true });
      
      const packageJson = {
        name: 'test-project',
        version: '1.0.0',
        scripts: {
          start: 'node src/index.js',
          test: 'jest'
        },
        dependencies: {},
        devDependencies: {
          jest: '^29.7.0'
        }
      };
      
      writeFileSync(path.join(testProjectPath, 'package.json'), JSON.stringify(packageJson, null, 2));
      writeFileSync(path.join(testProjectPath, 'src/index.js'), 'console.log("Hello World");');
      writeFileSync(path.join(testProjectPath, 'README.md'), '# Test Project');
      
      // Run the full enhancement
      await enhanceWithAI(testProjectPath, 'node');
      
      // Verify that enhancements were applied
      const enhancedPackageJson = JSON.parse(readFileSync(path.join(testProjectPath, 'package.json'), 'utf8'));
      expect(enhancedPackageJson.dependencies.winston).toBeDefined();
      expect(enhancedPackageJson.dependencies.dotenv).toBeDefined();
      expect(enhancedPackageJson.dependencies.joi).toBeDefined();
      
      // Verify that utility files were created
      expect(existsSync(path.join(testProjectPath, 'src/utils/logger.js'))).toBe(true);
      expect(existsSync(path.join(testProjectPath, 'src/utils/errorHandler.js'))).toBe(true);
      expect(existsSync(path.join(testProjectPath, 'src/utils/validation.js'))).toBe(true);
      expect(existsSync(path.join(testProjectPath, '.env.example'))).toBe(true);
      
      // Verify that enhancement summary was created
      const summaryPath = path.join(testProjectPath, 'AI_ENHANCEMENTS.md');
      expect(existsSync(summaryPath)).toBe(true);
      
      const summaryContent = readFileSync(summaryPath, 'utf8');
      expect(summaryContent).toContain('AI Enhancement Summary');
      expect(summaryContent).toContain('Applied Enhancements');
      expect(summaryContent).toContain('Project Analysis');
    });

    it('should handle React project enhancements', async () => {
      // Create a basic React project structure
      mkdirSync(testProjectPath, { recursive: true });
      mkdirSync(path.join(testProjectPath, 'src'), { recursive: true });
      
      const packageJson = {
        name: 'test-react-project',
        version: '1.0.0',
        scripts: {
          start: 'react-scripts start',
          test: 'react-scripts test'
        },
        dependencies: {
          react: '^18.2.0',
          'react-dom': '^18.2.0'
        },
        devDependencies: {
          '@testing-library/react': '^13.4.0',
          '@testing-library/jest-dom': '^5.16.5'
        }
      };
      
      writeFileSync(path.join(testProjectPath, 'package.json'), JSON.stringify(packageJson, null, 2));
      writeFileSync(path.join(testProjectPath, 'src/App.jsx'), 'import React from "react";\nexport default function App() { return <div>Hello</div>; }');
      
      // Run the enhancement
      await enhanceWithAI(testProjectPath, 'react');
      
      // Verify React-specific enhancements
      const enhancedPackageJson = JSON.parse(readFileSync(path.join(testProjectPath, 'package.json'), 'utf8'));
      expect(enhancedPackageJson.dependencies['react-router-dom']).toBeDefined();
      
      // Verify React utility files were created
      expect(existsSync(path.join(testProjectPath, 'src/utils/performance.js'))).toBe(true);
      expect(existsSync(path.join(testProjectPath, 'src/hooks/useApi.js'))).toBe(true);
    });

    it('should handle full-stack project enhancements', async () => {
      // Create a full-stack project structure
      mkdirSync(testProjectPath, { recursive: true });
      mkdirSync(path.join(testProjectPath, 'server/src'), { recursive: true });
      mkdirSync(path.join(testProjectPath, 'client/src'), { recursive: true });
      
      const packageJson = {
        name: 'test-fullstack-project',
        version: '1.0.0',
        scripts: {
          start: 'npm run start:server',
          'start:server': 'cd server && npm start',
          'start:client': 'cd client && npm start'
        },
        dependencies: {},
        devDependencies: {}
      };
      
      writeFileSync(path.join(testProjectPath, 'package.json'), JSON.stringify(packageJson, null, 2));
      writeFileSync(path.join(testProjectPath, 'server/src/index.js'), 'console.log("Server");');
      writeFileSync(path.join(testProjectPath, 'client/src/App.jsx'), 'import React from "react";\nexport default function App() { return <div>Client</div>; }');
      
      // Run the enhancement
      await enhanceWithAI(testProjectPath, 'full-stack');
      
      // Verify full-stack specific enhancements
      expect(existsSync(path.join(testProjectPath, 'client/src/utils/apiClient.js'))).toBe(true);
      
      const apiClientContent = readFileSync(path.join(testProjectPath, 'client/src/utils/apiClient.js'), 'utf8');
      expect(apiClientContent).toContain('ApiClient');
      expect(apiClientContent).toContain('request');
      expect(apiClientContent).toContain('get');
      expect(apiClientContent).toContain('post');
    });
  });

  describe('Error Handling', () => {
    it('should handle errors gracefully during enhancement', async () => {
      // Create a project with permission issues (simulate error condition)
      mkdirSync(testProjectPath, { recursive: true });
      
      const packageJson = {
        name: 'test-project',
        version: '1.0.0'
      };
      
      writeFileSync(path.join(testProjectPath, 'package.json'), JSON.stringify(packageJson, null, 2));
      
      // Mock console.log to capture output
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      // Run enhancement (should not throw)
      await expect(enhanceWithAI(testProjectPath, 'node')).resolves.not.toThrow();
      
      // Restore console.log
      consoleSpy.mockRestore();
    });
  });
}); 