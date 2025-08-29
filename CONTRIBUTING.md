# Contributing to Bunup

Thank you for your interest in contributing to our project! This guide will help you get started with the development process.

## Development Setup

### Prerequisites

- Bun installed on your system

### Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/bunup/bunup.git`
3. Navigate to the project directory: `cd bunup`
4. Install dependencies: `bun install`
5. Start development: `bun run dev`

## Development Workflow

1. Create a new branch: `git checkout -b feature/your-feature-name`
2. Make your changes
3. Check and fix code style and formatting issues: `bun run lint:fix`
5. Run tests: `bun run test`
6. Build the project: `bun run build`
7. Commit your changes using the conventions below
8. Push your branch to your fork
9. Open a pull request

## How to Test Your Changes

There are two main ways to test your changes:

### 1. Unit Tests
Add tests in `packages/bunup/test/specs/` and run:
```bash
bun run test
```

### 2. Manual Testing with Test Build
For more comprehensive testing, you can use the test fixtures:

1. **Basic testing**: Modify, add, or remove files in `packages/bunup/test/fixtures/` - the entrypoint is `tests/fixtures/index.ts`
2. **Run test build**:
   ```bash
   bun run test:build
   ```
   This runs a test build using your changes on the fixtures

3. **Configure test build**: Check `packages/bunup/test/bunup.config.ts` to see or modify the build configuration used for test builds

4. **Check test build output**: The output of the test build can be found in `packages/bunup/test/dist/` directory

The `packages/bunup/test/fixtures/` directory serves as a sandbox where you can create any file structure to test your changes. The test build will process these fixtures using your modifications to Bunup, allowing you to verify that your changes work as expected. The `packages/bunup/test/bunup.config.ts` file contains the build configuration used for this rough testing of the fixtures.

### 3. Testing DTS Bundler Changes

If you make changes to the DTS bundler (located in `packages/dts`), you can test them directly in the bunup test playground since the packages are linked. Any modifications to the DTS bundler will be automatically available when running test builds in the bunup package if you've started development mode with `bun run dev`. Otherwise, you'll need to run `bun run build` to make your changes available for testing.

## Commit Message Conventions

We follow [Conventional Commits](https://www.conventionalcommits.org/) for clear and structured commit messages:

- `feat:` New features
- `fix:` Bug fixes
- `docs:` Documentation changes
- `style:` Code style changes (formatting, etc.)
- `refactor:` Code changes that neither fix bugs nor add features
- `perf:` Performance improvements
- `test:` Adding or updating tests
- `chore:` Maintenance tasks, dependencies, etc.

## Documentation

If you're adding new features or making significant changes, please update the documentation accordingly. Bunup's documentation is located in the `docs` directory.

To run the documentation site locally:

```bash
bun run dev:docs
```

To build the documentation:

```bash
bun run build:docs
```

## Performance Considerations

Bunup focuses on speed. When contributing:

- Consider the performance impact of your changes
- Include benchmark results for performance-related changes
- Optimize for both speed and memory usage

## Project Structure

Here's a brief overview of the project structure:

- `packages/bunup/` - Core bundler package
  - `src/` - Source code
    - `build.ts` - Core build functionality
    - `watch.ts` - Watch mode functionality
    - `plugins/` - Bundler plugins
- `packages/cli/` - Command-line interface package
- `packages/dts/` - DTS bundler used by Bunup
- `packages/plugin-*/` - Official Bunup plugins

## Pull Request Guidelines

1. Update documentation if needed
2. Ensure all tests pass
3. Address any feedback from code reviews
4. Once approved, your PR will be merged

## Code of Conduct

Please be respectful and constructive in all interactions within our community.

## Questions?

If you have any questions, please open an issue for discussion.

Thank you for contributing to Bunup!
