import { test, expect } from '@playwright/test';

test('home renders brand and curation modal opens', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Nexus home feed' })).toBeVisible();

  await page.getByRole('button', { name: /Curate Feed/i }).click();
  await expect(page.getByRole('heading', { name: 'Curate Your Feed' })).toBeVisible();
});

test('search filters studies interactively', async ({ page }) => {
  await page.goto('/');
  const searchInput = page.getByPlaceholder(/Search studies/i);
  await expect(searchInput).toBeVisible();

  await searchInput.fill('Neuroplasticity');
  await expect(page.getByText(/Neuroplasticity in Adult Lexical Learning/i)).toBeVisible();
});


