// @ts-nocheck
const { test, expect, _electron: electron } = require('@playwright/test');

test('launches Electron in development mode and opens the first window', async () => {
  const electronApp = await electron.launch({
    args: ['.'],
  });

  try {
    const isPackaged = await electronApp.evaluate(async ({ app }) => {
      return app.isPackaged;
    });

    expect(isPackaged).toBe(false);

    const window = await electronApp.firstWindow();
    await expect(window).toHaveTitle(/Canva|Home|$/);

    const url = window.url();
    expect(url).toBeTruthy();
  } finally {
    await electronApp.close();
  }
});
