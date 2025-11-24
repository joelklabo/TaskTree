import { test, expect } from './fixtures';

test.describe('Constitution Page', () => {
  test('should display constitution data', async ({ page }) => {
    // Mock Constitution API
    await page.route('**/api/constitution/', async route => {
      await route.fulfill({
        json: {
          task_states: {
            states: ['todo', 'in_progress', 'done'],
            transitions: {
              todo: { start: 'in_progress' },
              in_progress: { finish: 'done' }
            }
          },
          ownership: {
            'src/backend': 'backend-team',
            'src/frontend': 'frontend-team'
          },
          protected: ['src/secrets']
        }
      });
    });

    await page.goto('/constitution');
    
    // Verify Header
    await expect(page.getByRole('heading', { name: 'Constitution' })).toBeVisible();
    await expect(page.getByText('Live from backend')).toBeVisible();
    
    // Verify Task States
    await expect(page.getByRole('heading', { name: 'Task states' })).toBeVisible();
    await expect(page.getByText('todo', { exact: true })).toBeVisible();
    await expect(page.getByText('in_progress', { exact: true })).toBeVisible();
    await expect(page.getByText('start -> in_progress')).toBeVisible();
    
    // Verify Ownership
    await expect(page.getByRole('heading', { name: 'Ownership' })).toBeVisible();
    await expect(page.getByText('src/backend')).toBeVisible();
    await expect(page.getByText('backend-team')).toBeVisible();
    
    // Verify Protected Paths
    await expect(page.getByRole('heading', { name: 'Protected paths' })).toBeVisible();
    await expect(page.getByText('src/secrets')).toBeVisible();
  });

  test('should handle empty constitution', async ({ page }) => {
    // Mock Empty Constitution
    await page.route('**/api/constitution/', async route => {
      await route.fulfill({ json: {} });
    });

    await page.goto('/constitution');
    
    // Should show the empty alert AND the empty cards
    await expect(page.getByText('No constitution data available')).toBeVisible();
    await expect(page.getByText('No task states configured.')).toBeVisible();
    await expect(page.getByText('No ownership entries.')).toBeVisible();
    await expect(page.getByText('No protected paths.')).toBeVisible();
  });

  test('should handle error loading constitution', async ({ page }) => {
    // Mock Error
    await page.route('**/api/constitution/', async route => {
      await route.fulfill({ status: 500, body: 'Internal Server Error' });
    });

    await page.goto('/constitution');
    
    await expect(page.getByText('Unable to load constitution')).toBeVisible();
  });
  
  test('should handle null response', async ({ page }) => {
      // Mock Null Response (simulating weird backend behavior)
      await page.route('**/api/constitution/', async route => {
        await route.fulfill({ json: null });
      });
  
      await page.goto('/constitution');
      
      // Expecting empty state behavior if null is returned
      await expect(page.getByText('No task states configured.')).toBeVisible();
    });
});
