import type * as Preset from "@docusaurus/preset-classic";
import * as path from "node:path";
import type { Config, PluginConfig } from "@docusaurus/types";
import type * as OpenApiPlugin from "docusaurus-plugin-openapi-docs";

const config: Config = {
  title: "ARC VISION",
  tagline: "Intelligent Surveillance Platform — See More. Know Faster. Act Smarter.",
  url: "https://arc-vision.local",
  baseUrl: "/",
  onBrokenLinks: "throw",
  onBrokenMarkdownLinks: "warn",
  favicon: "img/branding/favicon.ico",
  organizationName: "arc-vision",
  projectName: "arc-vision",
  themes: [
    "@docusaurus/theme-mermaid",
    "docusaurus-theme-openapi-docs",
  ],
  markdown: {
    mermaid: true,
  },
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
    localeConfigs: {
      en: {
        label: 'English',
      }
    },
  },
  themeConfig: {
    docs: {
      sidebar: {
        hideable: true,
      },
    },
    prism: {
      magicComments:[
        {
          className: 'theme-code-block-highlighted-line',
          line: 'highlight-next-line',
          block: {start: 'highlight-start', end: 'highlight-end'},
        },
        {
          className: 'code-block-error-line',
          line: 'highlight-error-line',
        },
      ],
      additionalLanguages: ["bash", "json"],
    },
    languageTabs: [
      {
        highlight: "python",
        language: "python",
        logoClass: "python",
      },
      {
        highlight: "javascript",
        language: "nodejs",
        logoClass: "nodejs",
      },
      {
        highlight: "javascript",
        language: "javascript",
        logoClass: "javascript",
      },
      {
        highlight: "bash",
        language: "curl",
        logoClass: "curl",
      },
      {
        highlight: "rust",
        language: "rust",
        logoClass: "rust",
      },
    ],
    navbar: {
      title: "ARC VISION",
      logo: {
        alt: "ARC VISION",
        src: "img/branding/logo.svg",
        srcDark: "img/branding/logo-dark.svg",
      },
      items: [
        {
          to: "/",
          activeBasePath: "docs",
          label: "Documentation",
          position: "left",
        },
        {
          to: "/guides/getting_started",
          label: "Quick Start",
          position: "left",
        },
        {
          to: "/configuration/config",
          label: "Configuration",
          position: "left",
        },
      ],
    },
    footer: {
      style: "dark",
      links: [
        {
          title: "ARC VISION Platform",
          items: [
            {
              label: "Documentation",
              to: "/",
            },
            {
              label: "Getting Started",
              to: "/guides/getting_started",
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} ARC VISION Intelligent Surveillance Platform. All rights reserved.`,
    },
  },
  plugins: [
    path.resolve(__dirname, "plugins", "raw-loader"),
    path.resolve(__dirname, "plugins", "yaml-loader"),
    [
      "docusaurus-plugin-openapi-docs",
      {
        id: "openapi",
        docsPluginId: "classic", // configured for preset-classic
        config: {
          frigateApi: {
            specPath: "static/frigate-api.yaml",
            outputDir: "docs/integrations/api",
            sidebarOptions: {
              groupPathsBy: "tag",
              categoryLinkSource: "tag",
              sidebarCollapsible: true,
              sidebarCollapsed: true,
            },
            showSchemas: true,
          } satisfies OpenApiPlugin.Options,
        },
      },
    ],
  ] as PluginConfig[],
  presets: [
    [
      "classic",
      {
        docs: {
          routeBasePath: "/",
          sidebarPath: "./sidebars.ts",
          sidebarCollapsible: false,
          docItemComponent: "@theme/ApiItem", // Derived from docusaurus-theme-openapi
        },

        theme: {
          customCss: "./src/css/custom.css",
        },
      } satisfies Preset.Options,
    ],
  ],
};

export default async function createConfig() {
  return config;
}
