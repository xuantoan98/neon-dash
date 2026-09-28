// The same UI-only scenario runs in CI and through the in-app browser adapter.
export async function coreFlow(page) {
  const assert = (condition, message) => {
    if (!condition) throw new Error(message);
  };
  await page.getByRole('button', { name: 'Bắt đầu chạy ↗', exact: true }).click();
  await page.getByRole('button', { name: 'Tạm dừng', exact: true }).click();
  assert(
    (await page.locator('#gameStatus').textContent()).includes('Đã tạm dừng'),
    'Pause button must pause',
  );
  const pausedScore = await page.locator('#score').textContent();
  await page.getByRole('button', { name: 'Tiếp tục ↗', exact: true }).click();
  assert(
    (await page.locator('#gameStatus').textContent()).includes('Đang chạy'),
    'Resume button must resume',
  );
  await page.getByRole('button', { name: 'Tạm dừng', exact: true }).click();
  await page.getByRole('button', { name: 'Kết thúc lượt', exact: true }).click();
  await page.getByRole('button', { name: 'Chạy lại ↻', exact: true }).waitFor({ state: 'visible' });
  const score = await page.locator('#score').textContent();
  assert(score === (await page.locator('#final').textContent()), 'Final score must equal HUD');
  assert(Number(score) >= Number(pausedScore), 'Score must not move backwards');
  await page.getByRole('button', { name: 'Chạy lại ↻', exact: true }).click();
  await page.getByRole('button', { name: 'Tạm dừng', exact: true }).click();
  assert(
    (await page.locator('#gameStatus').textContent()).includes('Đã tạm dừng'),
    'Retry must start a new working run',
  );
  return {
    passed: true,
    finalScore: score,
    checks: ['start', 'pause', 'resume', 'finish', 'score consistency', 'retry'],
  };
}
