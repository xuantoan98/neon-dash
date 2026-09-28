import config from './playwright.config.mjs';

export default {
  ...config,
  use: { ...config.use, baseURL: 'http://127.0.0.1:4173' },
  webServer: undefined,
  projects: config.projects.filter(({ name }) => name === 'chromium').map((project) => ({
    ...project,
    use: { ...project.use, channel: 'chrome', deviceScaleFactor: 2 },
  })),
};
