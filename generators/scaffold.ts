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
import { enhanceWithAI } from './ai-enhancer';

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
    const dir = path.dirname(dest);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    copyFileSync(src, dest);
    chmodSync(dest, stats.mode);
  }
}

function replacePlaceholders(currentPath: string, placeholders: Record<string, string>): void {
  const stats = lstatSync(currentPath);
  if (stats.isDirectory()) {
    const entries = readdirSync(currentPath);
    for (const entry of entries) {
      if (entry === 'node_modules') continue;
      replacePlaceholders(path.join(currentPath, entry), placeholders);
    }
  } else {
    if (stats.size > 1024 * 1024) return;
    let content: string;
    try {
      content = readFileSync(currentPath, 'utf8');
    } catch (err) {
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
  
  function addDemoApp(projectRoot: string, template: string): void {
  const demoSpinner = ora('Adding demo application...').start();
  
  try {
    if (template === 'node') {
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
    } else if (template === 'full-stack') {
      const serverDemoPath = path.join(projectRoot, 'server/src/index.js');
      const serverDemoContent = `const express = require('express');
const app = express();
const port = process.env.PORT || 3001;

app.use(express.json());

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'http://localhost:5173');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  next();
});

// Demo endpoints
app.get('/api/hello', (req, res) => {
  res.json({ message: 'Hello from the {{projectName}} API!' });
});

app.get('/api/users', (req, res) => {
  res.json([
    { id: 1, name: 'John Doe', email: 'john@example.com' },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com' },
    { id: 3, name: 'Bob Johnson', email: 'bob@example.com' }
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
  console.log(\`🚀 Server running at http://localhost:\${port}\`);
  console.log('📍 Available endpoints:');
  console.log('  GET  /api/hello');
  console.log('  GET  /api/users');
  console.log('  POST /api/users');
});
`;
      writeFileSync(serverDemoPath, serverDemoContent, 'utf8');

      const clientDemoPath = path.join(projectRoot, 'client/src/App.jsx');
      const clientDemoContent = `import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [newUser, setNewUser] = useState({ name: '', email: '' });

  useEffect(() => {
    fetch('http://localhost:3001/api/hello')
      .then(res => res.json())
      .then(data => setMessage(data.message))
      .catch(err => console.error('Error fetching message:', err));
  }, []);

  useEffect(() => {
    fetch('http://localhost:3001/api/users')
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('http://localhost:3001/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newUser),
      });
      const result = await response.json();
      setUsers([...users, result]);
      setNewUser({ name: '', email: '' });
      alert(result.message);
    } catch (err) {
      console.error('Error creating user:', err);
    }
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="App">
      <header className="header">
        <h1>🚀 {{projectName}}</h1>
        <p className="message">{message}</p>
      </header>

      <main className="main">
        <section className="users-section">
          <h2>👥 Users</h2>
          <div className="users-grid">
            {users.map(user => (
              <div key={user.id} className="user-card">
                <h3>{user.name}</h3>
                <p>{user.email}</p>
                <small>ID: {user.id}</small>
              </div>
            ))}
          </div>
        </section>

        <section className="add-user-section">
          <h2>➕ Add New User</h2>
          <form onSubmit={handleSubmit} className="user-form">
            <input
              type="text"
              placeholder="Name"
              value={newUser.name}
              onChange={(e) => setNewUser({...newUser, name: e.target.value})}
              required
            />
            <input
              type="email"
              placeholder="Email"
              value={newUser.email}
              onChange={(e) => setNewUser({...newUser, email: e.target.value})}
              required
            />
            <button type="submit">Add User</button>
          </form>
        </section>
      </main>
    </div>
  );
}

export default App;
`;
      writeFileSync(clientDemoPath, clientDemoContent, 'utf8');

      const clientCSSPath = path.join(projectRoot, 'client/src/App.css');
      const clientCSSContent = `/* App.css */
.App {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.header {
  text-align: center;
  margin-bottom: 40px;
  padding: 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.1);
}

.header h1 {
  margin: 0 0 10px 0;
  font-size: 2.5rem;
  font-weight: 700;
}

.message {
  font-size: 1.2rem;
  margin: 0;
  opacity: 0.9;
}

.main {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 40px;
}

.users-section, .add-user-section {
  background: white;
  padding: 30px;
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
}

.users-section h2, .add-user-section h2 {
  color: #333;
  margin-bottom: 20px;
  font-size: 1.5rem;
}

.users-grid {
  display: grid;
  gap: 15px;
}

.user-card {
  background: #f8f9fa;
  padding: 20px;
  border-radius: 8px;
  border-left: 4px solid #667eea;
}

.user-card h3 {
  margin: 0 0 8px 0;
  color: #333;
  font-size: 1.1rem;
}

.user-card p {
  margin: 0 0 8px 0;
  color: #666;
}

.user-card small {
  color: #999;
  font-size: 0.9rem;
}

.user-form {
  display: grid;
  gap: 15px;
}

.user-form input {
  padding: 12px;
  border: 2px solid #e9ecef;
  border-radius: 6px;
  font-size: 1rem;
  transition: border-color 0.3s ease;
}

.user-form input:focus {
  outline: none;
  border-color: #667eea;
}

.user-form button {
  padding: 12px 24px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 1rem;
  cursor: pointer;
  transition: background 0.3s ease;
}

.user-form button:hover {
  background: #5a67d8;
}

.loading {
  text-align: center;
  padding: 40px;
  font-size: 1.2rem;
  color: #666;
}

/* Responsive design */
@media (max-width: 768px) {
  .main {
    grid-template-columns: 1fr;
    gap: 20px;
  }
  
  .header h1 {
    font-size: 2rem;
  }
  
  .users-section, .add-user-section {
    padding: 20px;
  }
}
`;
      writeFileSync(clientCSSPath, clientCSSContent, 'utf8');
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
    
    const serverPackageJsonPath = path.join(projectRoot, 'server', 'package.json');
    const serverPackageJson = JSON.parse(readFileSync(serverPackageJsonPath, 'utf8'));
    serverPackageJson.dependencies = serverPackageJson.dependencies || {};
    serverPackageJson.dependencies.express = '^4.18.2';
    writeFileSync(serverPackageJsonPath, JSON.stringify(serverPackageJson, null, 2), 'utf8');
    
    writeCiWorkflow(projectRoot, 'full-stack');
    writeDependabotConfig(projectRoot, 'full-stack');
    writeCodeQLConfig(projectRoot, 'full-stack');
    copySpinner.succeed('Project files generated');
  } else {
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

  writeDeploymentConfig(projectRoot, deployTarget, template);

  if (withDemo) {
    addDemoApp(projectRoot, template);
    replacePlaceholders(projectRoot, { projectName, port: '3001' });
  }

  const installDependencies = async (cwd: string, spinner: ora.Ora) => {
    try {
      await execa('npm', ['install'], { cwd, stdio: 'inherit' });
      spinner.succeed('Dependencies installed');
    } catch (err) {
      spinner.fail('Dependency installation failed');
      throw err;
    }
  };

  if (isFullStack) {
    await installDependencies(projectRoot, ora('Installing root dependencies...').start());
    await installDependencies(path.join(projectRoot, 'server'), ora('Installing server dependencies...').start());
    await installDependencies(path.join(projectRoot, 'client'), ora('Installing client dependencies...').start());
  } else if (isPython) {
    const spinner = ora('Installing dependencies (pip install)...').start();
    try {
      await execa('pip', ['install', '-r', 'requirements.txt'], { cwd: projectRoot, stdio: 'inherit' });
      spinner.succeed('Dependencies installed');
    } catch (err) {
      spinner.fail('Dependency installation failed');
      throw err;
    }
  } else {
    await installDependencies(projectRoot, ora('Installing dependencies (npm install)...').start());
  }

  const gitSpinner = ora('Initializing git repository...').start();
  try {
    const git = simpleGit(projectRoot);
    await git.init();
    await git.add('.');
    await git.commit('chore: initial commit via stackstart');
    gitSpinner.succeed('Git repository initialized');
  } catch (err) {
    gitSpinner.fail('Git initialization failed');
  }

  if (process.env.GITHUB_TOKEN) {
    const ghSpinner = ora('Creating GitHub repository...').start();
    try {
      const { Octokit } = await import('@octokit/rest');
      const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
      await octokit.rest.repos.createForAuthenticatedUser({
        name: projectName,
        private: false,
        description: `Generated with StackStart - ${template} template`,
        auto_init: false
      });
      ghSpinner.succeed('GitHub repository created');
    } catch (err) {
      ghSpinner.fail('GitHub repository creation failed');
      console.log(chalk.yellow('You can create the repository manually on GitHub'));
    }
  }

  if (aiEnhanced) {
    await enhanceWithAI(projectRoot, template);
  }

  console.log();
  console.log(chalk.green('All done! Happy hacking ✨'));
}