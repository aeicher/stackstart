#!/usr/bin/env node
import { Command } from 'commander';
import path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import { existsSync } from 'fs';
import { generateScaffold } from '../generators/scaffold';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import pkg from '../package.json';

const program = new Command();

program
  .name('stackstart')
  .description('Scaffold production-ready repositories in seconds')
  .version(pkg.version);

program
  .command('create')
  .argument('<project-name>', 'name of the project')
  .option('-t, --template <template>', 'project template (react, node, python, full-stack)', 'node')
  .option('--ai-enhanced', 'use GPT-4o for custom scaffolding', false)
  .option('-d, --deploy-target <target>', 'deployment target (vercel, netlify, aws, gcp)', 'vercel')
  .option('--with-demo', 'include sample app with the scaffold', false)
  .action(async (projectName: string, options: Record<string, unknown>) => {
    const targetDir = path.resolve(process.cwd(), projectName);
    if (existsSync(targetDir)) {
      console.error(chalk.red(`❌ Directory ${projectName} already exists.`));
      process.exit(1);
    }

    const spinner = ora(`Creating project ${chalk.cyan(projectName)}...`).start();
    try {
      await generateScaffold(projectName, {
        template: options.template as string,
        aiEnhanced: Boolean(options.aiEnhanced),
        deployTarget: options.deployTarget as string,
        withDemo: Boolean(options.withDemo)
      });
      spinner.succeed(`Project ${chalk.green(projectName)} created successfully!`);
      console.log();
      console.log(chalk.bold('Next steps:'));
      console.log(`  cd ${projectName}`);
      console.log('  git remote add origin <your-repo-url>');
      console.log('  git push -u origin main');
    } catch (err: unknown) {
      spinner.fail('Failed to create project');
      console.error(chalk.red((err as Error).message));
      process.exit(1);
    }
  });

program.parse(); 