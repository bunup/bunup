# Scaffold with Bunup

Quickly scaffold modern TypeScript and React libraries in just 10 seconds with Bunup.

- 🚀 **Instant Setup**: Scaffold, code, edit README, and publish with a single command - with nothing to rename or configure
- 📦 **Modern**: ESM by default, TypeScript declarations, and optional monorepo support
- 🛠️ **DX First**: Integrated Bun-powered testing, Biome linting and formatting that just works out of the box
- 🚢 **Publishing**: One-command releases with automatic semantic versioning, GitHub tags, and detailed release notes
- ⚡️ **Mind-Blowing Speed**: Build times so fast they feel instantaneous - a library building experience you've never experienced before

## Getting Started

You can create a new project by using:

```sh
bunx @bunup/cli@latest create
```

That's it! You can now start coding.

## Setup for Releases

1. Generate an npm token:
   - Visit [npmjs.com](https://www.npmjs.com/), sign in
   - Go to profile → Access Tokens → Generate New Token (Classic)
   - Name it (e.g. "my-ts-lib publishing"), select "Automation"
   - Generate and copy token

2. Add token to GitHub:
   - Go to repo Settings → Secrets and variables → Actions
   - Click "New repository secret"
   - Set name as `NPM_TOKEN` and paste token value

## Development Workflow

After completing the setup, here's how to use your project:

```sh
bun run dev        # Start development mode
bun run test       # Run test suite
bun run lint       # Check code style and find problems
bun run lint:fix   # Fix linting and formatting issues automatically
bun run format:fix # Fix code formatting issues
bun run tsc        # Type check TypeScript code
bun run build      # Build production bundle
```

### Development Mode

The `bun run dev` command behaves differently based on your project type:

**React Library**: Launches a Bun + React preview app at `http://localhost:3000` where you can see your components in action.

**TypeScript Library**: Starts watch mode that automatically rebuilds your library whenever you make changes.

## CI/CD Workflows

The project comes with three GitHub Actions workflows:

1. **CI**: Runs on pull requests and pushes to main, validating types, linting, and tests
2. **Release**: Triggered by tags, builds and publishes the package to npm with provenance
3. **Issue Management**: Automatically marks issues as stale after 30 days of inactivity

## Releasing Your Package

When you're ready to release your package, simply run:

```sh
bun run release
```

This will:

1. Prompt you for a new version (patch, minor, or major)
2. Update package.json version
3. Create a Git tag
4. Push changes and tag to GitHub

The GitHub Actions workflow will automatically:

1. Build the package
2. Generate a GitHub release with changelog
3. Publish to npm with provenance

Happy coding!
