/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { test, expect } from '@playwright/test';
import { LoginPage } from 'playwright/pages/login.page';

test.use({ storageState: { cookies: [], origins: [] } });

/**
 * Login Responsive Layout Tests
 *
 * This test suite validates that the login page displays correctly
 * and fills the viewport at different screen sizes.
 */

/** Below this width the brand panel is hidden and the logo moves onto the card. */
const BRAND_PANEL_MIN_WIDTH = 900;
const SUBMIT_BUTTON = '#login-form button[type="submit"]';

const VIEWPORTS = {
  mobile: { width: 375, height: 667 }, // iPhone SE
  mobileLandscape: { width: 667, height: 375 },
  tablet: { width: 768, height: 1024 }, // iPad
  desktop: { width: 1280, height: 720 }, // Desktop
  largeDesktop: { width: 1920, height: 1080 } // Full HD
};

test.describe('Login Page - Responsive Layout', () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.navigate();
  });

  test('should fill viewport on mobile portrait (375x667)', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobile);
    // Verify the login form is visible
    await loginPage.assertOnLoginPage();

    // Check login wrapper fills viewport
    const loginWrapper = loginPage.divLocator('.login-wrapper');
    await expect(loginWrapper).toBeVisible();

    const wrapperBox = await loginWrapper.boundingBox();
    expect(wrapperBox?.height).toBeGreaterThanOrEqual(VIEWPORTS.mobile.height - 10);

    // Check login panel exists and is visible
    const loginPanel = loginPage.divLocator('.login-panel');
    await expect(loginPanel).toBeVisible();

    // Check all essential elements are visible
    await expect(loginPage.divLocator('.logo-section')).toBeVisible();
    await expect(loginPage.divLocator('.form-section')).toBeVisible();
    // The reload-settings footer is a support tool, hidden until Ctrl + Alt + R.
    await expect(loginPage.divLocator('.login-footer')).toHaveCount(0);

    // Verify no horizontal scroll
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyWidth).toBeLessThanOrEqual(VIEWPORTS.mobile.width + 1);
  });

  test('should fill viewport on tablet (768x1024)', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.tablet);
    // Verify the login form is visible
    await loginPage.assertOnLoginPage();

    const loginWrapper = loginPage.divLocator('.login-wrapper');
    await expect(loginWrapper).toBeVisible();

    const wrapperBox = await loginWrapper.boundingBox();
    expect(wrapperBox?.height).toBeGreaterThanOrEqual(VIEWPORTS.tablet.height - 10);

    // On tablet, hero panel should be hidden
    const heroPanel = loginPage.divLocator('.hero-panel');
    await expect(heroPanel).not.toBeVisible();

    // Login panel should be visible
    const loginPanel = loginPage.divLocator('.login-panel');
    await expect(loginPanel).toBeVisible();

    // All sections should be visible
    await expect(loginPage.divLocator('.logo-section')).toBeVisible();
    await expect(loginPage.divLocator('.form-section')).toBeVisible();
  });

  test('should fill viewport on desktop (1280x720)', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    // Verify the login form is visible
    await loginPage.assertOnLoginPage();

    const loginWrapper = loginPage.divLocator('.login-wrapper');
    await expect(loginWrapper).toBeVisible();

    const wrapperBox = await loginWrapper.boundingBox();
    expect(wrapperBox?.height).toBeGreaterThanOrEqual(VIEWPORTS.desktop.height - 10);

    // On desktop, hero panel should be visible
    const heroPanel = loginPage.divLocator('.hero-panel');
    await expect(heroPanel).toBeVisible();

    // Login panel should be visible
    const loginPanel = loginPage.divLocator('.login-panel');
    await expect(loginPanel).toBeVisible();

    // Login card should be centered
    const loginCard = loginPage.divLocator('.login-card');
    await expect(loginCard).toBeVisible();
  });

  test('should display all content without scrolling on desktop', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    // Verify the login form is visible
    await loginPage.assertOnLoginPage();

    // Check if login card content is fully visible
    const loginCard = loginPage.divLocator('.login-card');
    const cardBox = await loginCard.boundingBox();

    // On desktop the logo is on the brand panel
    const logo = page.locator('.hero-logo');
    const logoBox = await logo.boundingBox();
    expect(logoBox).toBeTruthy();

    // Username input should be visible
    const usernameInput = page.locator('input[formcontrolname="username"]');
    const usernameBox = await usernameInput.boundingBox();
    expect(usernameBox).toBeTruthy();

    // Password input should be visible
    const passwordInput = page.locator('input[formcontrolname="password"]');
    const passwordBox = await passwordInput.boundingBox();
    expect(passwordBox).toBeTruthy();

    // Login button should be visible
    const loginButton = page.locator(SUBMIT_BUTTON);
    const buttonBox = await loginButton.boundingBox();
    expect(buttonBox).toBeTruthy();

    // The Mifos resources links are not part of the Magma Soft sign-in
    await expect(page.locator('.resources-section')).toHaveCount(0);
  });

  test('should handle small mobile screens (375x667) with all content visible', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobile);
    // Verify the login form is visible
    await loginPage.assertOnLoginPage();

    // The reload-settings footer appears with Ctrl + Alt + R and is reachable after scrolling
    await page.keyboard.press('Control+Alt+r');
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await expect(loginPage.divLocator('.login-footer')).toBeVisible();

    // Scroll back to top
    await page.evaluate(() => window.scrollTo(0, 0));

    // Logo and form should be visible at top
    await expect(loginPage.divLocator('.logo-section')).toBeVisible();
    await expect(loginPage.divLocator('.form-section')).toBeVisible();
  });

  test('should maintain proper spacing between elements on all viewports', async ({ page }) => {
    const viewports = [
      VIEWPORTS.mobile,
      VIEWPORTS.tablet,
      VIEWPORTS.desktop
    ];

    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      // Verify the login form is visible
      await loginPage.assertOnLoginPage();

      const form = loginPage.divLocator('.form-section');
      await expect(form).toBeVisible();

      if (viewport.width > BRAND_PANEL_MIN_WIDTH) {
        // Wide screens: the logo is on the brand panel, beside the form
        await expect(page.locator('.hero-panel')).toBeVisible();
        continue;
      }

      const logo = loginPage.divLocator('.logo-section');
      await expect(logo).toBeVisible();

      // Form should be below the card logo
      const logoBox = await logo.boundingBox();
      const formBox = await form.boundingBox();
      if (logoBox && formBox) {
        expect(formBox.y).toBeGreaterThan(logoBox.y + logoBox.height);
      }
    }
  });

  test('should not have horizontal overflow on any viewport', async ({ page }) => {
    const viewports = [
      VIEWPORTS.mobile,
      VIEWPORTS.tablet,
      VIEWPORTS.desktop
    ];

    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.goto('/#/login');
      await page.waitForLoadState('networkidle');

      // Check no horizontal scroll
      const hasHorizontalScroll = await page.evaluate(() => {
        return document.body.scrollWidth > window.innerWidth;
      });

      expect(hasHorizontalScroll).toBe(false);
    }
  });

  test('should center login card vertically on desktop', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    // Verify the login form is visible
    await loginPage.assertOnLoginPage();

    const loginCard = page.locator('.login-card');
    const cardBox = await loginCard.boundingBox();

    const viewportHeight = VIEWPORTS.desktop.height;

    // Card should be roughly centered (with some tolerance)
    if (cardBox) {
      const cardCenter = cardBox.y + cardBox.height / 2;
      const viewportCenter = viewportHeight / 2;

      // Allow tolerance for header/footer (header ~76px, footer ~60px)
      expect(Math.abs(cardCenter - viewportCenter)).toBeLessThan(200);
    }
  });

  test('should show all form fields on mobile', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobile);
    // Verify the login form is visible
    await loginPage.assertOnLoginPage();

    // Username field
    const usernameField = page.locator('.ms-auth-field').filter({ hasText: 'Username' });
    await expect(usernameField).toBeVisible();

    // Password field
    const passwordField = page.locator('.ms-auth-field').filter({ hasText: 'Password' });
    await expect(passwordField).toBeVisible();

    // Login button
    const loginButton = page.locator(SUBMIT_BUTTON);
    await expect(loginButton).toBeVisible();
  });

  test('should show logo on all screen sizes', async ({ page }) => {
    const viewports = [
      VIEWPORTS.mobile,
      VIEWPORTS.tablet,
      VIEWPORTS.desktop
    ];

    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      // Verify the login form is visible
      await loginPage.assertOnLoginPage();

      const logo = page.locator(viewport.width > BRAND_PANEL_MIN_WIDTH ? '.hero-logo' : '.logo-image');
      await expect(logo).toBeVisible();

      // Logo should have appropriate size
      const logoBox = await logo.boundingBox();
      expect(logoBox?.width).toBeGreaterThan(0);
      expect(logoBox?.height).toBeGreaterThan(0);
    }
  });
});
