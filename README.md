# bunup

[![npm version](https://img.shields.io/npm/v/bunup.svg?style=flat-square)](https://www.npmjs.com/package/bunup)
[![npm downloads](https://img.shields.io/npm/dm/bunup.svg?style=flat-square)](https://www.npmjs.com/package/bunup)

Bunup is the **blazing-fast build tool** for TypeScript and JavaScript libraries, designed for beautiful developer experience and speed, **powered by Bun's native bundler** — up to **~50× faster than Tsup**.

| Bundler   | Format       | Build Time     | Build Time (with dts) |
| --------- | ------------ | -------------- | --------------------- |
| **bunup** | **esm, cjs** | **3.52ms ⚡️** | **20.84ms ⚡️**       |
| tsdown    | esm, cjs     | 5.81ms         | 35.84ms               |
| unbuild   | esm, cjs     | 42.47ms        | 314.54ms              |
| tsup      | esm, cjs     | 63.59ms        | 943.61ms              |

## Key Features

- 🚀 **Easy to Use**: Bunup preconfigures everything you need out-of-the-box. Just focus on your code.
- 🔥 **Bytecode Generation**: Faster startups by compiling to Bun bytecode—perfect for CLIs.
- 📦 **[Workspace](https://bunup.dev/workspaces) Support**: Build multiple packages within one config file and command.
- 🔄 **Tsup Familiarity**: Familiar tsup-like CLI and config.
- 🎯 **Bun Target**: First-class bundling support for libraries built with Bun.

## 📚 Documentation

To get started, visit the [documentation](https://bunup.dev/documentation).

## ❤️ Contributing

For guidelines on contributing, please read the [contributing guide](https://github.com/arshad-yaseen/bunup/blob/main/CONTRIBUTING.md).

We welcome contributions from the community to enhance Bunup's capabilities and make it even more powerful.
