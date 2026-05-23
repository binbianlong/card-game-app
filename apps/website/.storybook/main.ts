import path from "node:path";
import type { StorybookConfig } from "@storybook/react-vite";

const config: StorybookConfig = {
  stories: ["../src/**/*.stories.@(ts|tsx)"],
  addons: ["@storybook/addon-docs"],
  framework: {
    name: "@storybook/react-vite",
    options: {},
  },
  viteFinal: async (config) => {
    config.resolve ??= {};
    const aliases = Array.isArray(config.resolve.alias)
      ? config.resolve.alias
      : Object.entries(config.resolve.alias ?? {}).map(([find, replacement]) => ({
          find,
          replacement,
        }));

    config.resolve.alias = [
      ...aliases,
      { find: "@", replacement: path.resolve(import.meta.dirname, "../src") },
    ];

    return config;
  },
};

export default config;
