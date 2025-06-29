# StackStart

A CLI tool that scaffolds production-ready repositories with full automation.

## Features

- 🚀 **Quick Setup**: Generate production-ready projects in seconds
- 🎯 **Multiple Templates**: Support for Node.js, React, Python, and Full-stack applications
- 🔧 **CI/CD Ready**: Automatic GitHub Actions, Dependabot, and CodeQL setup
- 🤖 **AI Enhanced**: Optional GPT-4o integration for custom scaffolding
- 🌐 **Deployment Ready**: Support for Vercel, Netlify, AWS, and GCP
- 📦 **Auto Setup**: Automatic dependency installation and git initialization

## Installation

```bash
npm install -g .
```

Or run directly with npx:

```bash
npx . create my-project
```

## Usage

### Basic Usage

```bash
# Create a new Node.js project
openai-internal-copilot create my-node-app

# Create a React project
openai-internal-copilot create my-react-app --template react

# Create a Python project
openai-internal-copilot create my-python-app --template python

# Create a full-stack project
openai-internal-copilot create my-fullstack-app --template full-stack
```

### Advanced Options

```bash
# Create with AI-enhanced scaffolding
openai-internal-copilot create my-app --ai-enhanced

# Specify deployment target
openai-internal-copilot create my-app --deploy-target aws

# Include demo application
openai-internal-copilot create my-app --with-demo

# Combine multiple options
openai-internal-copilot create my-app --template react --ai-enhanced --deploy-target vercel --with-demo
```

## Templates

### Node.js Template
- Express.js server setup
- Jest testing framework
- ESLint and Prettier configuration
- Basic API structure

### React Template
- Create React App setup
- Jest and React Testing Library
- ESLint and Prettier configuration
- Component structure

### Python Template
- Flask/FastAPI structure
- pytest testing framework
- requirements.txt management
- Basic API endpoints

### Full-Stack Template
- Node.js backend + React frontend
- Concurrent development setup
- API proxy configuration
- Shared development scripts

## What Gets Generated

Every generated project includes:

- ✅ **Project Structure**: Organized file and folder structure
- ✅ **Dependencies**: All necessary packages installed
- ✅ **Testing Setup**: Jest/pytest configuration
- ✅ **Linting**: ESLint/Flake8 configuration
- ✅ **CI/CD**: GitHub Actions workflows
- ✅ **Security**: Dependabot and CodeQL setup
- ✅ **Git**: Initialized repository with first commit
- ✅ **Documentation**: README with setup instructions

## Environment Variables

- `GITHUB_TOKEN`: GitHub personal access token for automatic repository creation

## Development

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Run in development mode
npm run dev

# Run tests
npm test
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT 