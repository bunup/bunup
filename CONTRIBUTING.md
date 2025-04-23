# Contributing to Bunup

Thank you for your interest in contributing to Bunup! This document provides guidelines and instructions to help you contribute effectively.

## Getting Started

1. **Fork the repository**

   Start by forking the [Bunup repository](https://github.com/arshad-yaseen/bunup).

2. **Clone your fork**

   ```bash
   git clone https://github.com/arshad-yaseen/bunup.git
   cd bunup
   ```

3. **Install dependencies**

   ```bash
   bun install
   ```

4. **Set up the development environment**

   Bunup uses itself to build itself! The development setup is already configured in the `bunup.config.ts` file.

## Development Workflow

### Running in Development Mode

To start the development server with watch mode:

```bash
bun run dev
```

### Building the Project

To build the project:

```bash
bun run build
```

### Testing

Run tests to ensure your changes don't break existing functionality:

```bash
bun run test
```

To test your changes with a real build:

1. First, build bunup with your changes:

   ```bash
   bun run build
   ```

2. Then run the test build to verify your changes work correctly:

   ```bash
   bun run test-build
   ```

   This command builds the test project located in the `tests` directory using your local version of bunup, allowing you to verify that your changes work correctly in a real-world scenario.

To validate TypeScript types:

```bash
bun run tsc
```

### Code Formatting and Linting

Bunup uses Biome for code quality and formatting.

To lint your code:

```bash
bun run lint
```

To format your code:

```bash
bun run format:fix
```

## Conventional Commits

This project uses [Conventional Commit format](https://www.conventionalcommits.org/en/v1.0.0/) to automatically generate a changelog and better understand the changes in the project

Here are some examples of conventional commit messages:

- `feat: add new functionality`
- `fix: correct typos in code`
- `ci: add GitHub Actions for automated testing`

## Pull Request Process

1. **Create a new branch**

   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**

   Implement your feature or bug fix.

3. **Commit your changes**

   Use the [Conventional Commits](#conventional-commits) format to write your commit message.

4. **Push your changes**

   ```bash
   git push origin feature/your-feature-name
   ```

5. **Create a pull request**

   Open a pull request against the `main` branch of the Bunup repository.

   <!-- markdownlint-disable-next-line no-inline-html -->
   <a id="conventional-pr-titles"></a>The title of your pull request should follow the [Conventional Commit format](#conventional-commits). When a pull request is merged to the main branch, all changes are going to be squashed into a single commit. The message of this commit will be the title of the pull request. And for every release, the commit messages are used to generate the changelog.

   In your PR description:

   - Clearly describe the changes and their purpose
   - Reference any related issues

6. **Address review feedback**

   Be responsive to review comments and make necessary changes.

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

Bunup focuses on performance. When contributing:

- Consider the performance impact of your changes
- Include benchmark results for performance-related changes
- Optimize for both speed and memory usage

## Project Structure

Here's a brief overview of the project structure:

- `src/` - Source code
  - `cli.ts` - Command-line interface
  - `build.ts` - Core build functionality
  - `watch.ts` - Watch mode functionality
  - `plugins/` - Bundler plugins
  - `dts/` - TypeScript declaration file generation

## License

By contributing to Bunup, you agree that your contributions will be licensed under the project's [MIT License](LICENSE).

## Questions?

If you have any questions or need help, feel free to:

- Open an issue on GitHub
- Reach out to the maintainers:
  - Arshad Yaseen (<m@arshadyaseen.com>)

Thank you for contributing to make Bunup better!
