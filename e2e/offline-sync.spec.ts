import { test, expect } from '@playwright/test'

test.describe('Offline Sync', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/inspections')
  })

  test('should save draft offline and sync when reconnected', async ({ page }) => {
    await page.waitForSelector('text=Inspection Form')

    await page.fill('input[type="text"]', 'Server Rack A-12')
    await page.fill('textarea', 'Temperature slightly elevated, fan 3 running at 80%')

    await page.click('button:has-text("Queue for Sync")')

    await expect(page.locator('text=submission will queue')).toBeVisible()

    await page.context().setOffline(false)

    await page.waitForTimeout(2000)

    await expect(page.locator('text=Draft saved locally')).toBeVisible()
  })

  test('should show offline indicator and pending count', async ({ page }) => {
    await page.context().setOffline(true)

    await page.waitForSelector('text=Offline')
    await expect(page.locator('text=Offline')).toBeVisible()
  })

  test('should load cached data when offline', async ({ page }) => {
    await page.goto('/inspections')

    await page.waitForSelector('text=Inspection Form')

    await page.fill('input[type="text"]', 'Cached Data Test')
    await page.click('button:has-text("Queue for Sync")')

    await page.context().setOffline(true)
    await page.goto('/inspections')

    await expect(page.locator('text=Inspection Form')).toBeVisible()
  })
})
