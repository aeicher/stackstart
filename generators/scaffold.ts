import path from 'path';
import {
  mkdirSync,
  existsSync,
  readdirSync,
  lstatSync,
  copyFileSync,
  chmodSync,
  writeFileSync,
  readFileSync
} from 'fs';
import execa from 'execa';
import ora from 'ora';
import chalk from 'chalk';
import simpleGit from 'simple-git';

export interface ScaffoldOptions {
  template: string;
  aiEnhanced: boolean;
  deployTarget: string;
  withDemo: boolean;
}

function copyRecursive(src: string, dest: string): void {
  const stats = lstatSync(src);
  if (stats.isDirectory()) {
    if (!existsSync(dest)) mkdirSync(dest, { recursive: true });
    const entries = readdirSync(src);
    for (const entry of entries) {
      copyRecursive(path.join(src, entry), path.join(dest, entry));
    }
  } else {
    // ensure dest dir exists
    const dir = path.dirname(dest);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    copyFileSync(src, dest);
    // preserve executable bits for scripts
    chmodSync(dest, stats.mode);
  }
}

function replacePlaceholders(currentPath: string, placeholders: Record<string, string>): void {
  const stats = lstatSync(currentPath);
  if (stats.isDirectory()) {
    const entries = readdirSync(currentPath);
    for (const entry of entries) {
      // skip node_modules for speed
      if (entry === 'node_modules') continue;
      replacePlaceholders(path.join(currentPath, entry), placeholders);
    }
  } else {
    // simple heuristic: only process smallish text files (<1MB)
    if (stats.size > 1024 * 1024) return;
    let content: string;
    try {
      content = readFileSync(currentPath, 'utf8');
    } catch (err) {
      // binary file read error; skip
      return;
    }
    let newContent = content;
    for (const [key, value] of Object.entries(placeholders)) {
      newContent = newContent.split(`{{${key}}}`).join(value);
    }
    if (newContent !== content) {
      writeFileSync(currentPath, newContent, 'utf8');
    }
  }
}

function writeCiWorkflow(projectRoot: string, template: string): void {
  const ciDir = path.join(projectRoot, '.github', 'workflows');
  if (!existsSync(ciDir)) {
    mkdirSync(ciDir, { recursive: true });
  }
  const ciYamlPath = path.join(ciDir, 'ci.yml');

  const isPython = template === 'python';
  const isFullStack = template === 'full-stack';
  let ciYamlContent: string;

  if (isPython) {
    ciYamlContent = `name: CI (Python)

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  build:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        python-version: ['3.8', '3.9', '3.10']
    steps:
      - uses: actions/checkout@v4

      - name: Setup Python
        uses: actions/setup-python@v5
        with:
          python-version: \${{ matrix.python-version }}

      - name: Install dependencies
        run: pip install -r requirements.txt

      - name: Test
        run: pytest
`;
  } else if (isFullStack) {
    ciYamlContent = `name: CI (Full Stack)

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  backend:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [16, 18, 20]
    defaults:
      run:
        working-directory: server
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: \${{ matrix.node-version }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Lint
        run: npm run lint --if-present

      - name: Test
        run: npm test

  frontend:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [16, 18, 20]
    defaults:
      run:
        working-directory: client
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: \${{ matrix.node-version }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build --if-present

      - name: Test
        run: npm test
`;
  } else {
    ciYamlContent = `name: CI (Node)

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  build:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [16, 18, 20]
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: \${{ matrix.node-version }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Lint
        run: npm run lint --if-present

      - name: Build
        run: npm run build --if-present

      - name: Test
        run: npm test
`;
  }

  writeFileSync(ciYamlPath, ciYamlContent, 'utf8');
}

/** Write dependabot.yml with basic npm or pip ecosystem */
function writeDependabotConfig(projectRoot: string, template: string): void {
  const githubDir = path.join(projectRoot, '.github');
  if (!existsSync(githubDir)) {
    mkdirSync(githubDir, { recursive: true });
  }
  const dependabotPath = path.join(githubDir, 'dependabot.yml');
  const isPython = template === 'python';

  const dependabotContent = `version: 2
updates:
  - package-ecosystem: ${isPython ? 'pip' : 'npm'}
    directory: "/"
    schedule:
      interval: weekly
`;

  writeFileSync(dependabotPath, dependabotContent, 'utf8');
}

/** Write CodeQL configuration */
function writeCodeQLConfig(projectRoot: string, template: string): void {
  const githubDir = path.join(projectRoot, '.github');
  if (!existsSync(githubDir)) {
    mkdirSync(githubDir, { recursive: true });
  }
  const codeqlPath = path.join(githubDir, 'codeql.yml');
  const language = template === 'python' ? 'python' : 'javascript';

  const codeqlContent = `name: "CodeQL"

on:
  push:
    branches: ["main"]
  pull_request:
    branches: ["main"]
  schedule:
    - cron: '0 0 * * 0'

jobs:
  analyze:
    name: Analyze
    runs-on: ubuntu-latest
    permissions:
      actions: read
      contents: read
      security-events: write

    strategy:
      fail-fast: false
      matrix:
        language: ['${language}']

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
      - name: Initialize CodeQL
        uses: github/codeql-action/init@v3
        with:
          languages: \${{ matrix.language }}
      - name: Autobuild
        uses: github/codeql-action/autobuild@v3
      - name: Perform CodeQL Analysis
        uses: github/codeql-action/analyze@v3
`;

  writeFileSync(codeqlPath, codeqlContent, 'utf8');
}

function writeDeploymentConfig(projectRoot: string, deployTarget: string, template: string): void {
  const isPython = template === 'python';
  const isFullStack = template === 'full-stack';
  
  switch (deployTarget) {
    case 'vercel':
      writeVercelConfig(projectRoot, template);
      break;
    case 'netlify':
      writeNetlifyConfig(projectRoot, template);
      break;
    case 'aws':
      writeAWSConfig(projectRoot, template);
      break;
    case 'gcp':
      writeGCPConfig(projectRoot, template);
      break;
    default:
      // Default to Vercel
      writeVercelConfig(projectRoot, template);
  }
}

function writeVercelConfig(projectRoot: string, template: string): void {
  const vercelJsonPath = path.join(projectRoot, 'vercel.json');
  let vercelConfig: any;

  if (template === 'python') {
    vercelConfig = {
      version: 2,
      functions: {
        'src/main.py': {
          runtime: 'python3.9'
        }
      },
      routes: [
        { src: '/(.*)', dest: '/src/main.py' }
      ]
    };
  } else if (template === 'full-stack') {
    vercelConfig = {
      version: 2,
      builds: [
        { src: 'client/package.json', use: '@vercel/static-build' },
        { src: 'server/package.json', use: '@vercel/node' }
      ],
      routes: [
        { src: '/api/(.*)', dest: '/server/$1' },
        { src: '/(.*)', dest: '/client/$1' }
      ]
    };
  } else {
    vercelConfig = {
      version: 2,
      builds: [
        { src: 'package.json', use: '@vercel/node' }
      ]
    };
  }

  writeFileSync(vercelJsonPath, JSON.stringify(vercelConfig, null, 2), 'utf8');
}

function writeNetlifyConfig(projectRoot: string, template: string): void {
  const netlifyTomlPath = path.join(projectRoot, 'netlify.toml');
  let netlifyConfig: string;

  if (template === 'python') {
    netlifyConfig = `[build]
  command = "pip install -r requirements.txt"
  publish = "public"

[build.environment]
  PYTHON_VERSION = "3.9"

[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/:splat"
  status = 200`;
  } else if (template === 'full-stack') {
    netlifyConfig = `[build]
  command = "npm run build"
  publish = "client/build"

[build.environment]
  NODE_VERSION = "18"

[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/:splat"
  status = 200

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200`;
  } else {
    netlifyConfig = `[build]
  command = "npm run build"
  publish = "dist"

[build.environment]
  NODE_VERSION = "18"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200`;
  }

  writeFileSync(netlifyTomlPath, netlifyConfig, 'utf8');
}

function writeAWSConfig(projectRoot: string, template: string): void {
  const serverlessYmlPath = path.join(projectRoot, 'serverless.yml');
  let serverlessConfig: any;

  if (template === 'python') {
    serverlessConfig = {
      service: '{{projectName}}',
      provider: {
        name: 'aws',
        runtime: 'python3.9',
        region: 'us-east-1'
      },
      functions: {
        api: {
          handler: 'src/main.handler',
          events: [
            { http: { path: '/{proxy+}', method: 'ANY' } }
          ]
        }
      }
    };
  } else {
    serverlessConfig = {
      service: '{{projectName}}',
      provider: {
        name: 'aws',
        runtime: 'nodejs18.x',
        region: 'us-east-1'
      },
      functions: {
        api: {
          handler: 'src/index.handler',
          events: [
            { http: { path: '/{proxy+}', method: 'ANY' } }
          ]
        }
      }
    };
  }

  writeFileSync(serverlessYmlPath, JSON.stringify(serverlessConfig, null, 2), 'utf8');
}

function writeGCPConfig(projectRoot: string, template: string): void {
  const appYamlPath = path.join(projectRoot, 'app.yaml');
  let appConfig: string;

  if (template === 'python') {
    appConfig = `runtime: python39
entrypoint: python src/main.py

env_variables:
  NODE_ENV: production`;
  } else {
    appConfig = `runtime: nodejs18
entrypoint: node dist/index.js

env_variables:
  NODE_ENV: production`;
  }

  writeFileSync(appYamlPath, appConfig, 'utf8');
}

async function enhanceWithAI(projectRoot: string, template: string): Promise<void> {
  const aiSpinner = ora('Enhancing project with AI...').start();
  
  try {
    // This is a placeholder for AI enhancement
    // In a real implementation, this would:
    // 1. Analyze the generated code
    // 2. Use OpenAI API to suggest improvements
    // 3. Apply the suggestions
    
    // For now, we'll add some AI-generated comments and documentation
    const aiReadmePath = path.join(projectRoot, 'AI_ENHANCEMENTS.md');
    const aiContent = `# AI-Enhanced Features

This project was enhanced with AI assistance. Here are some suggestions for further improvements:

## Code Quality
- Consider adding more comprehensive error handling
- Implement logging throughout the application
- Add input validation for all API endpoints

## Performance
- Implement caching strategies
- Consider database connection pooling
- Add performance monitoring

## Security
- Implement rate limiting
- Add CORS configuration
- Consider adding authentication middleware

## Testing
- Add integration tests
- Implement end-to-end testing
- Add performance testing

## Documentation
- Add API documentation
- Create deployment guides
- Add troubleshooting guides

Generated by OpenAI Internal Copilot 🤖
`;
    
    writeFileSync(aiReadmePath, aiContent, 'utf8');
    aiSpinner.succeed('AI enhancements applied');
  } catch (error) {
    aiSpinner.fail('AI enhancement failed');
    console.log(chalk.yellow('Continuing without AI enhancements...'));
  }
}

function addDemoApp(projectRoot: string, template: string): void {
  const demoSpinner = ora('Adding demo application...').start();
  
  try {
    if (template === 'node') {
      // Add a simple Express demo
      const demoPath = path.join(projectRoot, 'src/demo.js');
      const demoContent = `const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// Demo endpoints
app.get('/api/hello', (req, res) => {
  res.json({ message: 'Hello from the demo API!' });
});

app.get('/api/users', (req, res) => {
  res.json([
    { id: 1, name: 'John Doe', email: 'john@example.com' },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com' }
  ]);
});

app.post('/api/users', (req, res) => {
  const { name, email } = req.body;
  res.json({ 
    id: Math.floor(Math.random() * 1000),
    name,
    email,
    message: 'User created successfully!'
  });
});

app.listen(port, () => {
  console.log(\`Demo server running at http://localhost:\${port}\`);
  console.log('Available endpoints:');
  console.log('  GET  /api/hello');
  console.log('  GET  /api/users');
  console.log('  POST /api/users');
});
`;
      writeFileSync(demoPath, demoContent, 'utf8');
    } else if (template === 'react') {
      // Add a simple React demo component
      const demoPath = path.join(projectRoot, 'src/components/Demo.jsx');
      const demoContent = `import React, { useState, useEffect } from 'react';

const Demo = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/users')
      .then(res => res.json())
      .then(data => {
        setUsers(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching users:', err);
        setLoading(false);
      });
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div className="demo">
      <h2>Demo Component</h2>
      <p>This is a demo component showing API integration.</p>
      <div className="users">
        <h3>Users:</h3>
        <ul>
          {users.map(user => (
            <li key={user.id}>
              {user.name} ({user.email})
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default Demo;
`;
      writeFileSync(demoPath, demoContent, 'utf8');
    } else if (template === 'python') {
      // Add a simple Flask demo
      const demoPath = path.join(projectRoot, 'src/demo.py');
      const demoContent = `from flask import Flask, jsonify, request

app = Flask(__name__)

# Demo data
users = [
    {"id": 1, "name": "John Doe", "email": "john@example.com"},
    {"id": 2, "name": "Jane Smith", "email": "jane@example.com"}
]

@app.route('/api/hello')
def hello():
    return jsonify({"message": "Hello from the demo API!"})

@app.route('/api/users')
def get_users():
    return jsonify(users)

@app.route('/api/users', methods=['POST'])
def create_user():
    data = request.get_json()
    new_user = {
        "id": len(users) + 1,
        "name": data.get('name'),
        "email": data.get('email')
    }
    users.append(new_user)
    return jsonify(new_user), 201

if __name__ == '__main__':
    print("Demo server starting...")
    print("Available endpoints:")
    print("  GET  /api/hello")
    print("  GET  /api/users")
    print("  POST /api/users")
    app.run(debug=True, port=5000)
`;
      writeFileSync(demoPath, demoContent, 'utf8');
    }
    
    demoSpinner.succeed('Demo application added');
  } catch (error) {
    demoSpinner.fail('Failed to add demo application');
    console.log(chalk.yellow('Continuing without demo application...'));
  }
}

export async function generateScaffold(
  projectName: string,
  { template, aiEnhanced, deployTarget, withDemo }: ScaffoldOptions
): Promise<void> {
  const projectRoot = path.resolve(process.cwd(), projectName);

  const isFullStack = template === 'full-stack';
  const isPython = template === 'python';

  if (existsSync(projectRoot)) {
    throw new Error(`Directory ${projectName} already exists.`);
  }

  if (isFullStack) {
    // Ensure required sub-templates exist
    const serverTemplatePath = path.resolve(process.cwd(), 'templates', 'node');
    const clientTemplatePath = path.resolve(process.cwd(), 'templates', 'react');
    const skeletonTemplatePath = path.resolve(process.cwd(), 'templates', 'full-stack');
    if (!existsSync(serverTemplatePath) || !existsSync(clientTemplatePath)) {
      throw new Error('Full-stack template requires both "node" and "react" templates.');
    }
    mkdirSync(projectRoot);

    const copySpinner = ora('Generating full-stack project structure...').start();
    if (existsSync(skeletonTemplatePath)) {
      copyRecursive(skeletonTemplatePath, projectRoot);
    }
    copyRecursive(serverTemplatePath, path.join(projectRoot, 'server'));
    copyRecursive(clientTemplatePath, path.join(projectRoot, 'client'));
    replacePlaceholders(projectRoot, { projectName, port: '3000' });
    writeCiWorkflow(projectRoot, 'full-stack');
    writeDependabotConfig(projectRoot, 'full-stack');
    writeCodeQLConfig(projectRoot, 'full-stack');
    copySpinner.succeed('Project files generated');
  } else {
    // Single template path
    const templatePath = path.resolve(process.cwd(), 'templates', template);
    if (!existsSync(templatePath)) {
      throw new Error(`Template '${template}' not found at ${templatePath}`);
    }
    mkdirSync(projectRoot);

    const copySpinner = ora('Generating project structure...').start();
    copyRecursive(templatePath, projectRoot);
    replacePlaceholders(projectRoot, { projectName, port: '3000' });
    writeCiWorkflow(projectRoot, template);
    writeDependabotConfig(projectRoot, template);
    writeCodeQLConfig(projectRoot, template);
    copySpinner.succeed('Project files generated');
  }

  // Add deployment configuration
  writeDeploymentConfig(projectRoot, deployTarget, template);

  // Add demo application if requested
  if (withDemo) {
    addDemoApp(projectRoot, template);
  }

  // Install dependencies
  if (isFullStack) {
    const serverInstallSpinner = ora('Installing server dependencies...').start();
    try {
      await execa('npm', ['install'], { cwd: path.join(projectRoot, 'server'), stdio: 'inherit' });
      serverInstallSpinner.succeed('Server dependencies installed');
    } catch (err) {
      serverInstallSpinner.fail('Server dependency installation failed');
      throw err;
    }

    const clientInstallSpinner = ora('Installing client dependencies...').start();
    try {
      await execa('npm', ['install'], { cwd: path.join(projectRoot, 'client'), stdio: 'inherit' });
      clientInstallSpinner.succeed('Client dependencies installed');
    } catch (err) {
      clientInstallSpinner.fail('Client dependency installation failed');
      throw err;
    }
  } else if (isPython) {
    const installSpinner = ora('Installing dependencies (pip install)...').start();
    try {
      await execa('pip', ['install', '-r', 'requirements.txt'], { cwd: projectRoot, stdio: 'inherit' });
      installSpinner.succeed('Dependencies installed');
    } catch (err) {
      installSpinner.fail('Dependency installation failed');
      throw err;
    }
  } else {
    const installSpinner = ora('Installing dependencies (npm install)...').start();
    try {
      await execa('npm', ['install'], { cwd: projectRoot, stdio: 'inherit' });
      installSpinner.succeed('Dependencies installed');
    } catch (err) {
      installSpinner.fail('Dependency installation failed');
      throw err;
    }
  }

  // Initialise git
  const gitSpinner = ora('Initializing git repository...').start();
  try {
    const git = simpleGit(projectRoot);
    await git.init();
    await git.add('.');
    await git.commit('chore: initial commit via openai-internal-copilot');
    gitSpinner.succeed('Git repository initialised');
  } catch (err) {
    gitSpinner.fail('Git initialisation failed');
  }

  // GitHub repo creation
  if (process.env.GITHUB_TOKEN) {
    const ghSpinner = ora('Creating GitHub repository...').start();
    try {
      const { Octokit } = await import('@octokit/rest');
      const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
      await octokit.rest.repos.createForAuthenticatedUser({ 
        name: projectName, 
        private: false,
        description: `Generated with OpenAI Internal Copilot - ${template} template`,
        auto_init: false
      });
      ghSpinner.succeed('GitHub repository created');
    } catch (err) {
      ghSpinner.fail('GitHub repository creation failed');
      console.log(chalk.yellow('You can create the repository manually on GitHub'));
    }
  }

  // AI enhancement
  if (aiEnhanced) {
    await enhanceWithAI(projectRoot, template);
  }

  console.log();
  console.log(chalk.green('All done! Happy hacking ✨'));
}