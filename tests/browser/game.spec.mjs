import { test, expect } from '@playwright/test';
import { coreFlow } from './scenarios.mjs';

test('start, pause, resume, end and retry work without browser errors', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await coreFlow(page);
  expect(errors).toEqual([]);
  const best = await page.locator('#best').textContent();
  await page.reload();
  await expect(page.locator('#best')).toHaveText(best);
});

test('keyboard input opens an accessible pause screen', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Bắt đầu chạy ↗' }).click();
  await page.keyboard.down('ArrowUp');
  await page.keyboard.down('ArrowUp');
  await page.keyboard.up('ArrowUp');
  await page.keyboard.press('p');
  await expect(page.locator('#pause')).toBeVisible();
  await expect(page.locator('#resumeBtn')).toBeInViewport();
});

test('preferences and cosmetic selections survive reload', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Cài đặt', exact: true }).click();
  await page.getByRole('checkbox', { name: 'Âm thanh', exact: true }).uncheck();
  await page.getByRole('combobox', { name: 'Nhân vật', exact: true }).selectOption('arctic');
  await page.getByRole('combobox', { name: 'Thành phố', exact: true }).selectOption('dawn');
  await page.getByRole('button', { name: 'Đóng cài đặt', exact: true }).click();
  await page.reload();
  await page.getByRole('button', { name: 'Cài đặt', exact: true }).click();
  await expect(page.getByRole('checkbox', { name: 'Âm thanh', exact: true })).not.toBeChecked();
  await expect(page.locator('#skinSetting')).toHaveValue('arctic');
  await expect(page.locator('#sceneSetting')).toHaveValue('dawn');
});

test('cached app starts and plays after network is disconnected', async ({ page, context }) => {
  await page.goto('/');
  await expect(page.locator('#offlineStatus')).toHaveText('Sẵn sàng chơi offline', {
    timeout: 20000,
  });
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
  await context.setOffline(true);
  await page.reload();
  await coreFlow(page);
  await expect(page.locator('#offlineStatus')).toHaveText('Đang chơi offline');
});

test('narrow and landscape screens keep pause actions inside the viewport', async ({
  page,
}, testInfo) => {
  await page.goto('/');
  await page.setViewportSize({ width: 320, height: 568 });
  await expect(page.getByRole('heading', { name: 'Neon Dash', exact: true })).toBeInViewport();
  await page.getByRole('button', { name: 'Bắt đầu chạy ↗', exact: true }).click();
  await page.getByRole('button', { name: 'Tạm dừng', exact: true }).click();
  await expect(page.locator('#resumeBtn')).toBeInViewport();
  await page.setViewportSize({ width: 844, height: 390 });
  await expect(page.locator('#start')).toHaveCSS('visibility', 'hidden');
  await expect(page.locator('#pause')).toHaveCSS('opacity', '1');
  await page.screenshot({
    path: testInfo.outputPath('landscape-pause.png'),
    animations: 'disabled',
  });
  await expect(page.locator('#resumeBtn')).toBeInViewport();
  await expect(page.locator('#endBtn')).toBeInViewport();
});
