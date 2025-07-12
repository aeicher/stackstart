# StackStart

Welcome! Tired of spending hours setting up new projects with the same boilerplate over and over? Me too. That's why I built StackStart - a CLI tool that gets you from idea to production-ready code in seconds, not hours.

## Why I built this

After setting up my umpteenth Express server with the exact same Jest config, ESLint rules, and GitHub Actions workflow, I wanted a simpler way. So, I created StackStart to handle all the boring setup stuff so you can focus on building cool things.

## What makes it awesome

**🚀 Lightning fast setup** - Your project will be ready before you finish your coffee  
**🎯 Multiple flavors** - Whether you're a Node.js person, React enthusiast, Python lover, or full-stack warrior, I've got you covered  
**🔧 CI/CD out of the box** - GitHub Actions, Dependabot, CodeQL - all configured and ready to go  
**🤖 AI superpowers** - Want something custom? Let GPT-4o help scaffold exactly what you need  
**🌐 Deploy anywhere** - Vercel, Netlify, AWS, GCP
**📦 Zero manual work** - Dependencies installed, git initialized, first commit made... !

## Getting started

Install it globally (recommended):
```bash
npm install -g .
```

Or if you'd rather try it first:
```bash
npx . create my-awesome-project
```

## How to use it

### The basics
```bash
# Spin up a Node.js project
openai-internal-copilot create my-node-app

# React is more your speed?
openai-internal-copilot create my-react-app --template react

# Python developer?
openai-internal-copilot create my-python-app --template python

# Want the whole enchilada?
openai-internal-copilot create my-fullstack-app --template full-stack
```

### Getting fancy
```bash
# Let AI help you build something custom
openai-internal-copilot create my-app --ai-enhanced

# Deploy to AWS from day one
openai-internal-copilot create my-app --deploy-target aws

# Include a working demo (great for showing off)
openai-internal-copilot create my-app --with-demo

# Go all out
openai-internal-copilot create my-app --template react --ai-enhanced --deploy-target vercel --with-demo
```

## What you get

### Node.js projects
Perfect for API development with Express.js, complete with Jest testing, ESLint/Prettier setup, and a clean project structure that your future self will thank you for.

### React projects
Built on Create React App because sometimes the classics are classic for a reason. Includes testing with React Testing Library, linting, and a component structure that actually makes sense.

### Python projects
Flask or FastAPI (your choice!), pytest for testing, proper requirements.txt management, and API endpoints that work right out of the gate.

### Full-stack projects
The best of both worlds - a Node.js backend talking nicely to a React frontend, with proxy configuration and shared scripts so you don't have to juggle multiple terminals.

## The full package

Every project comes loaded with:

- **Smart project structure** that follows best practices
- **All dependencies installed** because nobody likes npm install errors
- **Testing ready** with Jest or pytest, depending on your flavor
- **Linting configured** so your code stays clean
- **CI/CD pipelines** that actually work
- **Security scanning** with Dependabot and CodeQL
- **Git initialized** with a proper first commit
- **Documentation** :)

## One thing to set up

You'll need a GitHub personal access token in your environment as `GITHUB_TOKEN` if you want automatic repository creation. Don't worry, the tool will remind you if you forget.

## Want to contribute?

I built this for developers, by a developer. Got ideas? Found a bug? Want to add support for your favorite framework? 

1. Fork this repo
2. Create a branch for your feature
3. Make your changes (and add tests please!)
4. Submit a pull request

## Development setup

```bash
# Get the dependencies
npm install

# Build it
npm run build

# Run in dev mode
npm run dev

# Make sure everything works
npm test
```

## License

MIT - Use it, modify it, make it better.

---

*Built with ❤️. If this tool saves you time, consider starring the repo!*