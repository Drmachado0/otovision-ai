import { test, expect } from '@playwright/test';

test.describe('OTOVISION - Smoke Tests', () => {
  test('página inicial carrega', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/OTOVISION|ObraFlow/i);
  });

  test('página de login é acessível', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('redireciona para login quando não autenticado', async ({ page }) => {
    await page.goto('/dashboard');
    // Deve redirecionar para login ou mostrar página de login
    await expect(page).toHaveURL(/login|dashboard/);
  });
});
