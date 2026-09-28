import { test, expect } from '@playwright/test';

async function previewFrame(page) {
  // Allow queued close/resize events and several animation frames to settle.
  return page.locator('#settingsPreview').evaluate(async (canvas) => {
    for (let index = 0; index < 8; index += 1) {
      await new Promise(requestAnimationFrame);
    }
    return canvas.toDataURL();
  });
}

test('preview reflects appearance, lighting and sound preferences immediately', async ({
  page,
}) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.getByRole('button', { name: 'Cài đặt', exact: true }).click();
  const original = await previewFrame(page);
  await page.locator('#skinSetting').selectOption('solar');
  await expect(page.locator('#previewAppearance')).toHaveText('Cáo mặt trời · Neo-Sài Gòn');
  const skin = await previewFrame(page);
  expect(skin).not.toBe(original);
  await page.locator('#sceneSetting').selectOption('arctic');
  await expect(page.locator('#previewAppearance')).toHaveText('Cáo mặt trời · Cực quang');
  const city = await previewFrame(page);
  expect(city).not.toBe(skin);
  await page.locator('#qualitySetting').selectOption('low');
  await expect(page.locator('#previewQuality')).toHaveText('Ánh sáng nhẹ');
  expect(await previewFrame(page)).not.toBe(city);
  await page.locator('#volumeSetting').fill('0.7');
  await expect(page.locator('#previewSound')).toHaveText('Âm lượng 70%');
  await expect(page.locator('#previewVolume')).toHaveJSProperty('value', 0.7);
  await page.locator('#previewSoundBtn').click();
  await page.locator('#soundSetting').uncheck();
  await expect(page.locator('#previewSound')).toHaveText('Đã tắt tiếng');
  await expect(page.locator('#previewVolume')).toHaveJSProperty('value', 0);
  await expect(page.locator('#previewSoundBtn')).toBeDisabled();
  await page.locator('#soundSetting').check();
  await page.locator('#volumeSetting').fill('0');
  await expect(page.locator('#previewSoundBtn')).toBeDisabled();
  await page.locator('#closeSettings').click();
  await page.reload();
  await page.locator('#settingsBtn').click();
  await expect(page.locator('#previewAppearance')).toHaveText('Cáo mặt trời · Cực quang');
  await expect(page.locator('#previewQuality')).toHaveText('Ánh sáng nhẹ');
  expect(errors).toEqual([]);
});

test('preview respects motion preferences and stops when closed without advancing a paused run', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.locator('#startBtn').click();
  await page.locator('#settingsBtn').click();
  const score = await page.locator('#score').textContent();
  await expect(page.locator('#previewMotion')).toContainText('Xem trước tĩnh');
  const still = await previewFrame(page);
  expect(await previewFrame(page)).toBe(still);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect(page.locator('#previewMotion')).toHaveText('Chuyển động bật');
  const moving = await previewFrame(page);
  expect(await previewFrame(page)).not.toBe(moving);
  await page.locator('#motionSetting').selectOption('on');
  const reduced = await previewFrame(page);
  expect(await previewFrame(page)).toBe(reduced);
  await page.locator('#motionSetting').selectOption('off');
  await page.keyboard.press('Escape');
  await expect(page.locator('#settings')).not.toBeVisible();
  const closed = await previewFrame(page);
  expect(await previewFrame(page)).toBe(closed);
  await expect(page.locator('#pause')).toBeVisible();
  await expect(page.locator('#score')).toHaveText(score);
  await page.locator('#settingsBtn').click();
  const reopened = await previewFrame(page);
  expect(await previewFrame(page)).not.toBe(reopened);
});

test('settings stay usable on narrow and landscape screens', async ({ page }, testInfo) => {
  await page.goto('/');
  await page.setViewportSize({ width: 320, height: 568 });
  await page.locator('#settingsBtn').click();
  await expect(page.locator('#settingsPreview')).toBeInViewport();
  await page.locator('#skinSetting').selectOption('arctic');
  await page.locator('#qualitySetting').selectOption('low');
  await page.locator('#soundSetting').uncheck();
  await expect(page.locator('#settingsPreview')).toBeInViewport();
  await expect(page.locator('#closeSettings')).toBeInViewport();
  expect(
    await page.locator('.settings-layout').evaluate((el) => el.scrollWidth <= el.clientWidth),
  ).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('settings-mobile.png') });
  await page.setViewportSize({ width: 844, height: 390 });
  await page.locator('#skinSetting').selectOption('solar');
  await expect(page.locator('#closeSettings')).toBeInViewport();
  expect(
    await page.locator('.settings-layout').evaluate((el) => el.scrollWidth <= el.clientWidth),
  ).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('settings-landscape.png') });
  await page.locator('#closeSettings').click();
  await expect(page.locator('#settings')).not.toBeVisible();
});
