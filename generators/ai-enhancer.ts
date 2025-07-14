import path from 'path';
import {
  existsSync,
  readFileSync,
  writeFileSync,
  readdirSync,
  lstatSync,
  mkdirSync
} from 'fs';
import ora from 'ora';
import chalk from 'chalk';

interface ProjectAnalysis {
  template: string;
  projectRoot: string;
  packageJson?: any;
  dependencies: string[];
  devDependencies: string[];
  files: string[];
  structure: ProjectStructure;
  improvements: Enhancement[];
}

interface ProjectStructure {
  hasTests: boolean;
  hasLinting: boolean;
  hasFormatting: boolean;
  hasTypeScript: boolean;
  hasDocumentation: boolean;
  hasErrorHandling: boolean;
  hasEnvironmentConfig: boolean;
  hasLogging: boolean;
  hasValidation: boolean;
  hasApiDocumentation: boolean;
}

interface Enhancement {
  type: 'file' | 'dependency' | 'config' | 'code';
  description: string;
  priority: 'high' | 'medium' | 'low';
  implementation: () => Promise<void>;
}

export class AIProjectAnalyzer {
  private projectRoot: string;
  private template: string;

  constructor(projectRoot: string, template: string) {
    this.projectRoot = projectRoot;
    this.template = template;
  }

  async analyze(): Promise<ProjectAnalysis> {
    const files = this.getProjectFiles();
    const packageJson = this.getPackageJson();
    const structure = this.analyzeStructure(files, packageJson);
    const improvements = await this.identifyImprovements(structure, packageJson);

    return {
      template: this.template,
      projectRoot: this.projectRoot,
      packageJson,
      dependencies: packageJson?.dependencies ? Object.keys(packageJson.dependencies) : [],
      devDependencies: packageJson?.devDependencies ? Object.keys(packageJson.devDependencies) : [],
      files,
      structure,
      improvements
    };
  }

  private getProjectFiles(): string[] {
    const files: string[] = [];
    const traverse = (dir: string) => {
      if (!existsSync(dir)) return;
      const items = readdirSync(dir);
      for (const item of items) {
        if (item === 'node_modules' || item === '.git') continue;
        const fullPath = path.join(dir, item);
        const stat = lstatSync(fullPath);
        if (stat.isDirectory()) {
          traverse(fullPath);
        } else {
          files.push(path.relative(this.projectRoot, fullPath));
        }
      }
    };
    traverse(this.projectRoot);
    return files;
  }

  private getPackageJson(): any {
    const packageJsonPath = path.join(this.projectRoot, 'package.json');
    if (existsSync(packageJsonPath)) {
      return JSON.parse(readFileSync(packageJsonPath, 'utf8'));
    }
    return null;
  }

  private analyzeStructure(files: string[], packageJson: any): ProjectStructure {
    const hasTests = files.some(f => f.includes('test') || f.includes('spec')) || 
                     !!packageJson?.devDependencies?.jest || !!packageJson?.devDependencies?.mocha;
    const hasLinting = packageJson?.devDependencies?.eslint || files.some(f => f.includes('eslint'));
    const hasFormatting = packageJson?.devDependencies?.prettier || files.some(f => f.includes('prettier'));
    const hasTypeScript = files.some(f => f.endsWith('.ts') || f.endsWith('.tsx')) || 
                         packageJson?.devDependencies?.typescript;
    const hasDocumentation = files.some(f => f.toLowerCase().includes('readme'));
    const hasErrorHandling = this.checkForErrorHandling(files);
    const hasEnvironmentConfig = files.some(f => f.includes('.env') || f.includes('config'));
    const hasLogging = this.checkForLogging(files, packageJson);
    const hasValidation = this.checkForValidation(files, packageJson);
    const hasApiDocumentation = files.some(f => f.includes('swagger') || f.includes('openapi'));

    return {
      hasTests,
      hasLinting,
      hasFormatting,
      hasTypeScript,
      hasDocumentation,
      hasErrorHandling,
      hasEnvironmentConfig,
      hasLogging,
      hasValidation,
      hasApiDocumentation
    };
  }

  private checkForErrorHandling(files: string[]): boolean {
    // Check for try-catch blocks or error handling patterns
    for (const file of files) {
      if (file.endsWith('.js') || file.endsWith('.ts') || file.endsWith('.jsx') || file.endsWith('.tsx')) {
        const filePath = path.join(this.projectRoot, file);
        if (existsSync(filePath)) {
          const content = readFileSync(filePath, 'utf8');
          if (content.includes('try') || content.includes('catch') || content.includes('throw')) {
            return true;
          }
        }
      }
    }
    return false;
  }

  private checkForLogging(files: string[], packageJson: any): boolean {
    const loggingLibs = ['winston', 'bunyan', 'pino', 'morgan'];
    return loggingLibs.some(lib => 
      packageJson?.dependencies?.[lib] || packageJson?.devDependencies?.[lib]
    ) || files.some(f => f.includes('log'));
  }

  private checkForValidation(files: string[], packageJson: any): boolean {
    const validationLibs = ['joi', 'yup', 'ajv', 'express-validator', 'zod'];
    return validationLibs.some(lib => 
      packageJson?.dependencies?.[lib] || packageJson?.devDependencies?.[lib]
    );
  }

  private async identifyImprovements(structure: ProjectStructure, packageJson: any): Promise<Enhancement[]> {
    const improvements: Enhancement[] = [];

    // Add logging enhancement
    if (!structure.hasLogging) {
      improvements.push({
        type: 'dependency',
        description: 'Add structured logging with Winston',
        priority: 'high',
        implementation: () => this.addLogging()
      });
    }

    // Add error handling enhancement
    if (!structure.hasErrorHandling) {
      improvements.push({
        type: 'code',
        description: 'Add comprehensive error handling',
        priority: 'high',
        implementation: () => this.addErrorHandling()
      });
    }

    // Add environment configuration
    if (!structure.hasEnvironmentConfig) {
      improvements.push({
        type: 'config',
        description: 'Add environment configuration with dotenv',
        priority: 'medium',
        implementation: () => this.addEnvironmentConfig()
      });
    }

    // Add validation for API projects
    if ((this.template === 'node' || this.template === 'full-stack') && !structure.hasValidation) {
      improvements.push({
        type: 'dependency',
        description: 'Add input validation with Joi',
        priority: 'medium',
        implementation: () => this.addValidation()
      });
    }

    // Add API documentation for backend projects
    if ((this.template === 'node' || this.template === 'full-stack') && !structure.hasApiDocumentation) {
      improvements.push({
        type: 'file',
        description: 'Add API documentation with Swagger/OpenAPI',
        priority: 'medium',
        implementation: () => this.addApiDocumentation()
      });
    }

    // Add enhanced testing setup
    improvements.push({
      type: 'config',
      description: 'Enhance testing configuration with coverage reporting',
      priority: 'medium',
      implementation: () => this.enhanceTestingConfig()
    });

    // Template-specific improvements
    const templateSpecificImprovements = await this.getTemplateSpecificImprovements(structure);
    improvements.push(...templateSpecificImprovements);

    return improvements;
  }

  private async getTemplateSpecificImprovements(structure: ProjectStructure): Promise<Enhancement[]> {
    const improvements: Enhancement[] = [];

    switch (this.template) {
      case 'react':
        improvements.push(...await this.getReactImprovements(structure));
        break;
      case 'node':
        improvements.push(...await this.getNodeImprovements(structure));
        break;
      case 'python':
        improvements.push(...await this.getPythonImprovements(structure));
        break;
      case 'full-stack':
        improvements.push(...await this.getFullStackImprovements(structure));
        break;
    }

    return improvements;
  }

  private async getReactImprovements(structure: ProjectStructure): Promise<Enhancement[]> {
    const improvements: Enhancement[] = [];

    improvements.push({
      type: 'file',
      description: 'Add React performance optimization utilities',
      priority: 'medium',
      implementation: () => this.addReactPerformanceUtils()
    });

    improvements.push({
      type: 'dependency',
      description: 'Add React Router for navigation',
      priority: 'medium',
      implementation: () => this.addReactRouter()
    });

    improvements.push({
      type: 'file',
      description: 'Add custom React hooks for common patterns',
      priority: 'low',
      implementation: () => this.addReactHooks()
    });

    return improvements;
  }

  private async getNodeImprovements(structure: ProjectStructure): Promise<Enhancement[]> {
    const improvements: Enhancement[] = [];

    improvements.push({
      type: 'file',
      description: 'Add database connection utilities',
      priority: 'medium',
      implementation: () => this.addDatabaseUtils()
    });

    improvements.push({
      type: 'dependency',
      description: 'Add security middleware (helmet, cors)',
      priority: 'high',
      implementation: () => this.addSecurityMiddleware()
    });

    improvements.push({
      type: 'file',
      description: 'Add rate limiting and caching',
      priority: 'medium',
      implementation: () => this.addRateLimitingAndCaching()
    });

    return improvements;
  }

  private async getPythonImprovements(structure: ProjectStructure): Promise<Enhancement[]> {
    const improvements: Enhancement[] = [];

    improvements.push({
      type: 'file',
      description: 'Add Python logging configuration',
      priority: 'high',
      implementation: () => this.addPythonLogging()
    });

    improvements.push({
      type: 'file',
      description: 'Add Flask/FastAPI utilities',
      priority: 'medium',
      implementation: () => this.addPythonWebUtils()
    });

    improvements.push({
      type: 'config',
      description: 'Add Python type hints and mypy configuration',
      priority: 'medium',
      implementation: () => this.addPythonTypeHints()
    });

    return improvements;
  }

  private async getFullStackImprovements(structure: ProjectStructure): Promise<Enhancement[]> {
    const improvements: Enhancement[] = [];
    
    // Combine improvements from both frontend and backend
    const reactImprovements = await this.getReactImprovements(structure);
    const nodeImprovements = await this.getNodeImprovements(structure);
    
    improvements.push(...reactImprovements);
    improvements.push(...nodeImprovements);

    improvements.push({
      type: 'file',
      description: 'Add API client utilities for frontend-backend communication',
      priority: 'high',
      implementation: () => this.addApiClientUtils()
    });

    return improvements;
  }

  // Implementation methods for enhancements
  private async addLogging(): Promise<void> {
    const packageJsonPath = path.join(this.projectRoot, 'package.json');
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
    
    packageJson.dependencies = packageJson.dependencies || {};
    packageJson.dependencies.winston = '^3.11.0';
    
    writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2), 'utf8');

    const loggingConfigPath = path.join(this.projectRoot, 'src/utils/logger.js');
    const loggingConfig = `const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'app' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

module.exports = logger;
`;

    const utilsDir = path.join(this.projectRoot, 'src/utils');
    if (!existsSync(utilsDir)) {
      mkdirSync(utilsDir, { recursive: true });
    }
    
    const logsDir = path.join(this.projectRoot, 'logs');
    if (!existsSync(logsDir)) {
      mkdirSync(logsDir, { recursive: true });
    }

    writeFileSync(loggingConfigPath, loggingConfig, 'utf8');
  }

  private async addErrorHandling(): Promise<void> {
    const errorHandlerPath = path.join(this.projectRoot, 'src/utils/errorHandler.js');
    const errorHandlerContent = `class AppError extends Error {
  constructor(message, statusCode = 500, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

const handleError = (error, req, res, next) => {
  const { statusCode = 500, message, isOperational } = error;
  
  if (!isOperational) {
    console.error('System Error:', error);
  }
  
  res.status(statusCode).json({
    status: 'error',
    message: isOperational ? message : 'Something went wrong!',
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
};

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = { AppError, handleError, asyncHandler };
`;

    const utilsDir = path.join(this.projectRoot, 'src/utils');
    if (!existsSync(utilsDir)) {
      mkdirSync(utilsDir, { recursive: true });
    }

    writeFileSync(errorHandlerPath, errorHandlerContent, 'utf8');
  }

  private async addEnvironmentConfig(): Promise<void> {
    const packageJsonPath = path.join(this.projectRoot, 'package.json');
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
    
    packageJson.dependencies = packageJson.dependencies || {};
    packageJson.dependencies.dotenv = '^16.3.1';
    
    writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2), 'utf8');

    const envExamplePath = path.join(this.projectRoot, '.env.example');
    const envExampleContent = `# Application Configuration
NODE_ENV=development
PORT=3000
LOG_LEVEL=info

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=myapp
DB_USER=username
DB_PASSWORD=password

# API Keys
API_KEY=your-api-key-here
JWT_SECRET=your-jwt-secret-here
`;

    writeFileSync(envExamplePath, envExampleContent, 'utf8');

    // Add .env to .gitignore if it exists
    const gitignorePath = path.join(this.projectRoot, '.gitignore');
    if (existsSync(gitignorePath)) {
      const gitignoreContent = readFileSync(gitignorePath, 'utf8');
      if (!gitignoreContent.includes('.env')) {
        writeFileSync(gitignorePath, gitignoreContent + '\n.env\n', 'utf8');
      }
    } else {
      writeFileSync(gitignorePath, '.env\nnode_modules/\nlogs/\n', 'utf8');
    }
  }

  private async addValidation(): Promise<void> {
    const packageJsonPath = path.join(this.projectRoot, 'package.json');
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
    
    packageJson.dependencies = packageJson.dependencies || {};
    packageJson.dependencies.joi = '^17.11.0';
    
    writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2), 'utf8');

    const validationPath = path.join(this.projectRoot, 'src/utils/validation.js');
    const validationContent = `const Joi = require('joi');

const validateRequest = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation error',
        details: error.details.map(detail => detail.message)
      });
    }
    next();
  };
};

const userSchema = Joi.object({
  name: Joi.string().min(2).max(50).required(),
  email: Joi.string().email().required(),
  age: Joi.number().integer().min(0).max(120).optional()
});

const schemas = {
  user: userSchema
};

module.exports = { validateRequest, schemas };
`;

    const utilsDir = path.join(this.projectRoot, 'src/utils');
    if (!existsSync(utilsDir)) {
      mkdirSync(utilsDir, { recursive: true });
    }

    writeFileSync(validationPath, validationContent, 'utf8');
  }

  private async addApiDocumentation(): Promise<void> {
    const packageJsonPath = path.join(this.projectRoot, 'package.json');
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
    
    packageJson.dependencies = packageJson.dependencies || {};
    packageJson.dependencies['swagger-ui-express'] = '^5.0.0';
    packageJson.dependencies['swagger-jsdoc'] = '^6.2.8';
    
    writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2), 'utf8');

    const swaggerConfigPath = path.join(this.projectRoot, 'src/utils/swagger.js');
    const swaggerConfig = `const swaggerJSDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'API Documentation',
      version: '1.0.0',
      description: 'API documentation for this application'
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server'
      }
    ]
  },
  apis: ['./src/routes/*.js', './src/index.js']
};

const specs = swaggerJSDoc(options);

const setupSwagger = (app) => {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));
  console.log('📚 API Documentation available at http://localhost:3000/api-docs');
};

module.exports = { setupSwagger };
`;

    const utilsDir = path.join(this.projectRoot, 'src/utils');
    if (!existsSync(utilsDir)) {
      mkdirSync(utilsDir, { recursive: true });
    }

    writeFileSync(swaggerConfigPath, swaggerConfig, 'utf8');
  }

  private async enhanceTestingConfig(): Promise<void> {
    const packageJsonPath = path.join(this.projectRoot, 'package.json');
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
    
    packageJson.scripts = packageJson.scripts || {};
    packageJson.scripts['test:coverage'] = 'jest --coverage';
    packageJson.scripts['test:watch'] = 'jest --watch';
    
    packageJson.devDependencies = packageJson.devDependencies || {};
    packageJson.devDependencies['@types/jest'] = '^29.5.2';
    packageJson.devDependencies['supertest'] = '^6.3.3';
    
    writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2), 'utf8');

    const jestConfigPath = path.join(this.projectRoot, 'jest.config.js');
    const jestConfig = `module.exports = {
  testEnvironment: 'node',
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/coverage/'
  ],
  testMatch: [
    '**/__tests__/**/*.js',
    '**/?(*.)+(spec|test).js'
  ]
};
`;

    writeFileSync(jestConfigPath, jestConfig, 'utf8');
  }

  // React-specific enhancements
  private async addReactPerformanceUtils(): Promise<void> {
    const utilsDir = path.join(this.projectRoot, 'src/utils');
    if (!existsSync(utilsDir)) {
      mkdirSync(utilsDir, { recursive: true });
    }

    const performanceUtilsPath = path.join(utilsDir, 'performance.js');
    const performanceUtils = `import React, { memo, useCallback, useMemo } from 'react';

// Higher-order component for performance optimization
export const withPerformance = (Component) => {
  return memo(Component);
};

// Custom hook for debouncing
export const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = React.useState(value);

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

// Custom hook for throttling
export const useThrottle = (value, limit) => {
  const [throttledValue, setThrottledValue] = React.useState(value);
  const lastRan = React.useRef(Date.now());

  React.useEffect(() => {
    const handler = setTimeout(() => {
      if (Date.now() - lastRan.current >= limit) {
        setThrottledValue(value);
        lastRan.current = Date.now();
      }
    }, limit - (Date.now() - lastRan.current));

    return () => {
      clearTimeout(handler);
    };
  }, [value, limit]);

  return throttledValue;
};
`;

    writeFileSync(performanceUtilsPath, performanceUtils, 'utf8');
  }

  private async addReactRouter(): Promise<void> {
    const packageJsonPath = path.join(this.projectRoot, 'package.json');
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
    
    packageJson.dependencies = packageJson.dependencies || {};
    packageJson.dependencies['react-router-dom'] = '^6.8.0';
    
    writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2), 'utf8');
  }

  private async addReactHooks(): Promise<void> {
    const hooksDir = path.join(this.projectRoot, 'src/hooks');
    if (!existsSync(hooksDir)) {
      mkdirSync(hooksDir, { recursive: true });
    }

    const useApiHookPath = path.join(hooksDir, 'useApi.js');
    const useApiHook = `import { useState, useEffect } from 'react';

export const useApi = (url, options = {}) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch(url, options);
        if (!response.ok) {
          throw new Error(\`HTTP error! status: \${response.status}\`);
        }
        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [url]);

  return { data, loading, error };
};
`;

    writeFileSync(useApiHookPath, useApiHook, 'utf8');
  }

  // Node.js-specific enhancements
  private async addDatabaseUtils(): Promise<void> {
    const utilsDir = path.join(this.projectRoot, 'src/utils');
    if (!existsSync(utilsDir)) {
      mkdirSync(utilsDir, { recursive: true });
    }

    const dbUtilsPath = path.join(utilsDir, 'database.js');
    const dbUtils = `// Database connection utility
class Database {
  constructor() {
    this.pool = null;
  }

  async connect(config) {
    try {
      // This is a template - replace with your preferred database driver
      console.log('Connecting to database with config:', config);
      // this.pool = new Pool(config);
      console.log('Database connected successfully');
    } catch (error) {
      console.error('Database connection failed:', error);
      throw error;
    }
  }

  async query(sql, params = []) {
    try {
      // const result = await this.pool.query(sql, params);
      // return result;
      console.log('Executing query:', sql, 'with params:', params);
      return { rows: [], rowCount: 0 };
    } catch (error) {
      console.error('Query execution failed:', error);
      throw error;
    }
  }

  async close() {
    if (this.pool) {
      await this.pool.end();
      console.log('Database connection closed');
    }
  }
}

module.exports = new Database();
`;

    writeFileSync(dbUtilsPath, dbUtils, 'utf8');
  }

  private async addSecurityMiddleware(): Promise<void> {
    const packageJsonPath = path.join(this.projectRoot, 'package.json');
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
    
    packageJson.dependencies = packageJson.dependencies || {};
    packageJson.dependencies.helmet = '^7.1.0';
    packageJson.dependencies.cors = '^2.8.5';
    packageJson.dependencies['express-rate-limit'] = '^7.1.5';
    
    writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2), 'utf8');

    const securityPath = path.join(this.projectRoot, 'src/middleware/security.js');
    const securityContent = `const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});

// CORS configuration
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
  optionsSuccessStatus: 200
};

const setupSecurity = (app) => {
  // Security headers
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
  }));

  // CORS
  app.use(cors(corsOptions));

  // Rate limiting
  app.use('/api/', limiter);

  console.log('🔒 Security middleware configured');
};

module.exports = { setupSecurity };
`;

    const middlewareDir = path.join(this.projectRoot, 'src/middleware');
    if (!existsSync(middlewareDir)) {
      mkdirSync(middlewareDir, { recursive: true });
    }

    writeFileSync(securityPath, securityContent, 'utf8');
  }

  private async addRateLimitingAndCaching(): Promise<void> {
    const packageJsonPath = path.join(this.projectRoot, 'package.json');
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
    
    packageJson.dependencies = packageJson.dependencies || {};
    packageJson.dependencies['node-cache'] = '^5.1.2';
    
    writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2), 'utf8');

    const cachePath = path.join(this.projectRoot, 'src/utils/cache.js');
    const cacheContent = `const NodeCache = require('node-cache');

// Create cache instance with default TTL of 10 minutes
const cache = new NodeCache({ stdTTL: 600 });

const cacheMiddleware = (duration = 300) => {
  return (req, res, next) => {
    const key = req.originalUrl || req.url;
    const cachedResponse = cache.get(key);

    if (cachedResponse) {
      return res.json(cachedResponse);
    }

    res.sendResponse = res.json;
    res.json = (body) => {
      cache.set(key, body, duration);
      res.sendResponse(body);
    };

    next();
  };
};

module.exports = { cache, cacheMiddleware };
`;

    const utilsDir = path.join(this.projectRoot, 'src/utils');
    if (!existsSync(utilsDir)) {
      mkdirSync(utilsDir, { recursive: true });
    }

    writeFileSync(cachePath, cacheContent, 'utf8');
  }

  // Python-specific enhancements
  private async addPythonLogging(): Promise<void> {
    const loggingConfigPath = path.join(this.projectRoot, 'src/utils/logger.py');
    const loggingConfig = `import logging
import os
from logging.handlers import RotatingFileHandler

def setup_logging():
    """Configure logging for the application."""
    log_level = os.getenv('LOG_LEVEL', 'INFO').upper()
    
    # Create logs directory if it doesn't exist
    os.makedirs('logs', exist_ok=True)
    
    # Configure logging
    logging.basicConfig(
        level=getattr(logging, log_level),
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            RotatingFileHandler('logs/app.log', maxBytes=10485760, backupCount=5),
            logging.StreamHandler()
        ]
    )
    
    return logging.getLogger(__name__)

# Initialize logger
logger = setup_logging()
`;

    const utilsDir = path.join(this.projectRoot, 'src/utils');
    if (!existsSync(utilsDir)) {
      mkdirSync(utilsDir, { recursive: true });
    }

    writeFileSync(loggingConfigPath, loggingConfig, 'utf8');
  }

  private async addPythonWebUtils(): Promise<void> {
    const webUtilsPath = path.join(this.projectRoot, 'src/utils/web.py');
    const webUtils = `from functools import wraps
from flask import request, jsonify
import time

def validate_json(required_fields=None):
    """Decorator to validate JSON request data."""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if not request.is_json:
                return jsonify({'error': 'Request must be JSON'}), 400
            
            data = request.get_json()
            if required_fields:
                missing_fields = [field for field in required_fields if field not in data]
                if missing_fields:
                    return jsonify({'error': f'Missing required fields: {missing_fields}'}), 400
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator

def rate_limit(max_requests=100, window_seconds=3600):
    """Simple rate limiting decorator."""
    requests = {}
    
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            client_ip = request.remote_addr
            current_time = time.time()
            
            if client_ip not in requests:
                requests[client_ip] = []
            
            # Remove old requests outside the window
            requests[client_ip] = [req_time for req_time in requests[client_ip] 
                                 if current_time - req_time < window_seconds]
            
            if len(requests[client_ip]) >= max_requests:
                return jsonify({'error': 'Rate limit exceeded'}), 429
            
            requests[client_ip].append(current_time)
            return f(*args, **kwargs)
        return decorated_function
    return decorator

def handle_errors(f):
    """Decorator to handle common errors."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            return f(*args, **kwargs)
        except ValueError as e:
            return jsonify({'error': f'Invalid input: {str(e)}'}), 400
        except Exception as e:
            return jsonify({'error': 'Internal server error'}), 500
    return decorated_function
`;

    const utilsDir = path.join(this.projectRoot, 'src/utils');
    if (!existsSync(utilsDir)) {
      mkdirSync(utilsDir, { recursive: true });
    }

    writeFileSync(webUtilsPath, webUtils, 'utf8');
  }

  private async addPythonTypeHints(): Promise<void> {
    const requirementsPath = path.join(this.projectRoot, 'requirements.txt');
    let requirements = '';
    
    if (existsSync(requirementsPath)) {
      requirements = readFileSync(requirementsPath, 'utf8');
    }
    
    if (!requirements.includes('mypy')) {
      requirements += '\nmypy==1.7.1\n';
    }
    
    writeFileSync(requirementsPath, requirements, 'utf8');

    const mypyConfigPath = path.join(this.projectRoot, 'mypy.ini');
    const mypyConfig = `[mypy]
python_version = 3.9
warn_return_any = True
warn_unused_configs = True
disallow_untyped_defs = True
disallow_incomplete_defs = True
check_untyped_defs = True
disallow_untyped_decorators = True
no_implicit_optional = True
warn_redundant_casts = True
warn_unused_ignores = True
warn_no_return = True
warn_unreachable = True
strict_equality = True
`;

    writeFileSync(mypyConfigPath, mypyConfig, 'utf8');
  }

  // Full-stack specific enhancements
  private async addApiClientUtils(): Promise<void> {
    const clientUtilsDir = path.join(this.projectRoot, 'client/src/utils');
    if (!existsSync(clientUtilsDir)) {
      mkdirSync(clientUtilsDir, { recursive: true });
    }

    const apiClientPath = path.join(clientUtilsDir, 'apiClient.js');
    const apiClientContent = `const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

class ApiClient {
  constructor(baseURL = API_BASE_URL) {
    this.baseURL = baseURL;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
    };
  }

  async request(endpoint, options = {}) {
    const url = \`\${this.baseURL}\${endpoint}\`;
    const config = {
      headers: { ...this.defaultHeaders, ...options.headers },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        throw new Error(\`HTTP error! status: \${response.status}\`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  async get(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'GET' });
  }

  async post(endpoint, data, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async put(endpoint, data, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async delete(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'DELETE' });
  }
}

export default new ApiClient();
`;

    writeFileSync(apiClientPath, apiClientContent, 'utf8');
  }
}

export async function enhanceWithAI(projectRoot: string, template: string): Promise<void> {
  const aiSpinner = ora('Enhancing project with AI...').start();
  
  try {
    const analyzer = new AIProjectAnalyzer(projectRoot, template);
    const analysis = await analyzer.analyze();
    
    aiSpinner.text = 'Applying AI enhancements...';
    
    // Apply high-priority improvements first
    const highPriorityImprovements = analysis.improvements.filter(imp => imp.priority === 'high');
    for (const improvement of highPriorityImprovements) {
      await improvement.implementation();
    }
    
    // Apply medium-priority improvements
    const mediumPriorityImprovements = analysis.improvements.filter(imp => imp.priority === 'medium');
    for (const improvement of mediumPriorityImprovements) {
      await improvement.implementation();
    }
    
    // Apply low-priority improvements
    const lowPriorityImprovements = analysis.improvements.filter(imp => imp.priority === 'low');
    for (const improvement of lowPriorityImprovements) {
      await improvement.implementation();
    }
    
    // Create enhancement summary
    const enhancementSummaryPath = path.join(projectRoot, 'AI_ENHANCEMENTS.md');
    const enhancementSummary = `# AI Enhancement Summary

This project was enhanced with AI assistance. Here's what was added:

## Applied Enhancements

${analysis.improvements.map(imp => `- **${imp.description}** (${imp.priority} priority)`).join('\n')}

## Project Analysis

- **Template**: ${analysis.template}
- **Dependencies**: ${analysis.dependencies.length} production dependencies
- **Dev Dependencies**: ${analysis.devDependencies.length} development dependencies
- **Files**: ${analysis.files.length} files analyzed

## Structure Analysis

- ✅ Tests: ${analysis.structure.hasTests ? 'Present' : 'Missing'}
- ✅ Linting: ${analysis.structure.hasLinting ? 'Present' : 'Missing'}
- ✅ Formatting: ${analysis.structure.hasFormatting ? 'Present' : 'Missing'}
- ✅ TypeScript: ${analysis.structure.hasTypeScript ? 'Present' : 'Missing'}
- ✅ Documentation: ${analysis.structure.hasDocumentation ? 'Present' : 'Missing'}
- ✅ Error Handling: ${analysis.structure.hasErrorHandling ? 'Present' : 'Missing'}
- ✅ Environment Config: ${analysis.structure.hasEnvironmentConfig ? 'Present' : 'Missing'}
- ✅ Logging: ${analysis.structure.hasLogging ? 'Present' : 'Missing'}
- ✅ Validation: ${analysis.structure.hasValidation ? 'Present' : 'Missing'}
- ✅ API Documentation: ${analysis.structure.hasApiDocumentation ? 'Present' : 'Missing'}

## Next Steps

1. Install new dependencies: \`npm install\`
2. Review the generated configuration files
3. Update environment variables in \`.env\`
4. Run tests to ensure everything works: \`npm test\`
5. Check API documentation at \`/api-docs\` (if applicable)

Generated by StackStart 🤖
`;
    
    writeFileSync(enhancementSummaryPath, enhancementSummary, 'utf8');
    
    aiSpinner.succeed(`AI enhancements applied: ${analysis.improvements.length} improvements made`);
  } catch (error) {
    aiSpinner.fail('AI enhancement failed');
    console.log(chalk.yellow('Continuing without AI enhancements...'));
    console.log(chalk.red('Error details:'), error);
  }
} 