import { test, expect } from './fixtures';

test.describe('Real User Workflows', () => {
  test('Complete flow: New user explores, runs a flow, views results', async ({ page }) => {
    await page.route('**/api/runs/', async route => {
      if (route.request().method() === 'POST') {
        await route.fulfill({ json: { session_id: 'sess-workflow', trace_run_id: 'workflow-trace' } });
        return;
      }
      await route.fallback();
    });
    await page.route('**/api/trace/runs', async route => {
      await route.fulfill({ json: [{ run_id: 'code_fix_run', flow_name: 'code_fix', status: 'tests_passed' }] });
    });

    // Step 1: User opens app for first time
    await page.goto('/');

    // Step 2: Sees flows tab (should be active by default)
    const flowsTab = page.getByRole('tab', { name: 'Flows' });
    await expect(flowsTab).toBeVisible();
    await expect(flowsTab).toHaveAttribute('data-state', 'active');

    // Step 3: Sees list of available flows
    await expect(page.getByText('code_fix')).toBeVisible({ timeout: 10000 });

    // Step 4: Clicks on a flow to see details
    await page.getByText('code_fix').click();

    // Step 5: Sees flow details (description, graph, input form)
    await expect(page.getByText(/Flow detail: code_fix/i)).toBeVisible();

    // Step 6: Runs the flow with tracing enabled
    const flowRow = page.getByRole('row', { name: /code_fix/ });
    await flowRow.getByRole('button', { name: /Run with trace/i }).click();

    // Step 7: Goes to Traces tab to view results
    await page.getByRole('tab', { name: 'Traces' }).click();

    // Step 8: Finds the run in the list and clicks it
    await expect(page.getByRole('button', { name: /code_fix/i }).first()).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: /code_fix/i }).first().click();

    // Step 9: Views run detail
    await page.getByRole('tab', { name: 'Run detail' }).click({ force: true });
    await expect(page.getByRole('heading', { name: 'Trace events' })).toBeVisible();
  });

  test('Error reporting workflow: User encounters issue and reports it', async ({ page }) => {
    // Mock the error logging endpoint
    await page.route('**/api/debug/log-client-error', async route => {
      await route.fulfill({
        json: { status: 'logged', log_file: '/tmp/backend-dev.log' }
      });
    });

    // Step 1: User encounters an issue and wants to report it
    // (Simulated by going directly to error playground)
    await page.goto('/error-playground');
    await expect(page.getByRole('heading', { name: /Error lab/i })).toBeVisible();

    // Step 2: Fills in error details
    await page.getByLabel(/Error name/i).fill('ButtonNotClickable');
    await page.getByLabel(/Error message/i).fill('Run button is grayed out');

    // Step 3: Adds context (what they were doing)
    const contextField = page.getByLabel(/Context/i);
    await contextField.fill('{"page": "/flows", "action": "clicking run button", "flow": "code_fix"}');

    // Step 4: Submits the error
    await page.getByRole('button', { name: /Send to Backend/i }).click();

    // Step 5: Sees success confirmation
    await expect(page.getByText(/Logged to/i)).toBeVisible({ timeout: 3000 });
  });

  test('Configuration editing workflow: User edits a prompt template', async ({ page }) => {
    // Mock the editor APIs
    await page.route('**/api/editor/prompts', async route => {
      await route.fulfill({ json: ['code_plan.j2', 'code_implement.j2'] });
    });

    await page.route('**/api/editor/prompts/code_plan.j2', async route => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          json: { name: 'code_plan.j2', content: 'Plan for {{ bug_description }}' }
        });
      } else if (route.request().method() === 'PUT') {
        await route.fulfill({
          json: { status: 'ok', name: 'code_plan.j2' }
        });
      }
    });

    // Step 1: User goes to Editor tab
    await page.goto('/editor');

    // Step 2: Sees prompts list
    await expect(page.getByRole('button', { name: 'code_plan.j2' })).toBeVisible();

    // Step 3: Clicks on a prompt to edit
    await page.getByRole('button', { name: 'code_plan.j2' }).click();

    // Step 4: Sees the template content
    const editor = page.locator('textarea');
    await expect(editor).toHaveValue(/Plan for/);

    // Step 5: Makes changes
    await editor.fill('Detailed plan for fixing: {{ bug_description }}\n\nSteps:\n1. Investigate\n2. Fix\n3. Test');

    // Step 6: Saves the changes
    await page.getByRole('button', { name: /Save Changes/i }).click();

    // Step 7: Sees success indication (toast would appear)
    // In a real scenario, user would see a success toast
  });

  test('Debugging workflow: User debugs a flow step-by-step', async ({ page }) => {
    // Mock the debug APIs
    await page.route('**/api/editor/flows', async route => {
      await route.fulfill({ json: ['code_fix.yaml'] });
    });

    await page.route('**/api/editor/flows/code_fix.yaml', async route => {
      await route.fulfill({
        json: {
          name: 'code_fix.yaml',
          content: `id: code_fix
version: "1.0"
start: plan
steps:
  - id: plan
    agent: codex_cli
    action: plan_bugfix
    transitions:
      success: implement
  - id: implement
    agent: codex_cli
    action: implement_fix
    transitions:
      success: end`
        }
      });
    });

    await page.route('**/api/debug/sessions', async route => {
      await route.fulfill({ json: { session_id: 'debug-session-123' } });
    });

    // Mock WebSocket
    await page.addInitScript(() => {
      class MockWebSocket {
        url: string;
        onopen: () => void = () => {};
        onmessage: (event: any) => void = () => {};
        onclose: () => void = () => {};
        sentMessages: string[] = [];

        constructor(url: string) {
          this.url = url;
          (window as any).mockWebSocket = this;
          setTimeout(() => this.onopen(), 10);
        }

        send(data: string) {
          this.sentMessages.push(data);
        }

        close() {
          this.onclose();
        }
      }
      (window as any).WebSocket = MockWebSocket;
    });

    // Step 1: User goes to Debug tab
    await page.goto('/debug');

    // Step 2: Selects a flow
    await page.getByLabel('Debug Flow', { exact: true }).selectOption('code_fix.yaml');

    // Step 4: Enters test input
    const contextEditor = page.getByTestId('context-editor').locator('textarea');
    await contextEditor.fill('{"input":{"bug_description":"Button crash"},"breakpoints":["plan"]}');

    // Step 5: Starts debugging
    await page.getByRole('button', { name: 'Start Debugging' }).click();

    // Step 6: Sees WebSocket connected
    await expect(page.getByText('WebSocket connected')).toBeVisible({ timeout: 3000 });

    // Step 7: Execution pauses at breakpoint (simulate backend message)
    await page.evaluate(() => {
      const ws = (window as any).mockWebSocket;
      ws.onmessage({
        data: JSON.stringify({
          type: 'paused',
          phase: 'before',
          step: 'plan',
          context: { bug_description: 'Button crash' }
        })
      });
    });

    // Step 8: User sees paused state
    await expect(page.getByText(/Paused at before plan/i)).toBeVisible();

    // Step 9: Inspects context variables
    const debugState = page.getByTestId('debug-state');
    await expect(debugState).toContainText(/bug_description/i);
    await expect(debugState).toContainText(/Button crash/i);

    // Step 10: Steps over to next instruction
    await page.getByRole('button', { name: 'Step Over' }).click();

    // Step 11: Resumes execution
    await page.getByRole('button', { name: 'Resume' }).click();

    // Verify commands were sent
    const commands = await page.evaluate(() => {
      const ws = (window as any).mockWebSocket;
      return ws.sentMessages;
    });
    expect(commands.some((cmd: string) => cmd.includes('step'))).toBe(true);
    expect(commands.some((cmd: string) => cmd.includes('resume'))).toBe(true);
  });

  test('Logs monitoring workflow: User views real-time logs', async ({ page }) => {
    // Mock the logs API
    await page.route('**/api/logs/sources', async route => {
      await route.fulfill({
        json: [
          { name: 'backend-dev.log', size: 123 },
          { name: 'agent-trace.log', size: 456 }
        ]
      });
    });

    await page.route('**/api/logs/events*', async route => {
      await route.fulfill({
        json: {
          events: [
            { timestamp: '2025-01-01T10:00:00Z', message: 'Starting flow execution' },
            { timestamp: '2025-01-01T10:00:01Z', message: 'Agent: codex_cli' },
            { timestamp: '2025-01-01T10:00:02Z', message: 'Step: plan_bugfix' }
          ]
        }
      });
    });

    // Step 1: User goes to Logs tab
    await page.goto('/logs');

    // Step 2: Sees log sources dropdown
    // Step 2: Sees log sources list (defaults to dev logs selected)
    const sourceButton = page.getByRole('button', { name: 'backend-dev.log' });
    await expect(sourceButton).toBeVisible();

    // Step 3: Sees streaming logs placeholder (events are mocked via polling)
    await expect(page.getByText(/Waiting for logs/i)).toBeVisible({ timeout: 5000 });
  });

  test('Run history workflow: User views past runs and artifacts', async ({ page }) => {
    const runId = 'trace-user-flow';

    await page.route('**/api/trace/runs', async route => {
      await route.fulfill({
        json: [
          {
            run_id: runId,
            flow_name: 'code_fix',
            status: 'tests_passed',
            label: 'User workflow run',
            start_time: '2025-01-01T00:00:00Z',
            end_time: '2025-01-01T00:00:05Z'
          }
        ]
      });
    });

    await page.route(`**/api/trace/runs/${runId}/trace`, async route => {
      await route.fulfill({
        json: [
          {
            run_id: runId,
            session: { flow_name: 'code_fix', flow_version: '0.1.0' }
          },
          {
            run_id: runId,
            step: { step_name: 'plan', agent_name: 'codex_cli', status: 'success' },
            data: { output: 'planned' }
          }
        ]
      });
    });

    await page.route(`**/api/trace/runs/${runId}/artifacts`, async route => {
      await route.fulfill({ json: [{ path: 'logs/output.log', size: 512 }] });
    });

    // Step 1: User goes to home, then Traces tab
    await page.goto('/');
    await page.getByRole('tab', { name: 'Traces' }).click();

    // Step 2: Sees list of past runs
    const runButton = page.getByRole('button', { name: runId });
    await expect(runButton).toBeVisible({ timeout: 15000 });
    await runButton.click();

    // Step 3: Opens Run Detail tab
    const runDetailTab = page.getByRole('tab', { name: 'Run detail' });
    await runDetailTab.click();
    await expect(runDetailTab).toHaveAttribute('data-state', 'active');

    // Step 4: Views trace events
    await expect(page.getByRole('heading', { name: 'Trace events' })).toBeVisible();

    // Step 5: Switches to Artifacts tab
    await page.getByRole('tab', { name: 'Artifacts' }).click();
    await expect(page.getByRole('heading', { name: 'Artifacts' })).toBeVisible();
  });

  test('Backend down scenario: User sees offline status', async ({ page }) => {
    // Step 1: User opens app normally
    await page.goto('/');

    // Step 2: Dev server status shows connected after initial health poll
    const statusIndicator = page.getByTestId('dev-server-status');
    await expect(statusIndicator).toContainText(/Backend.*(Connected|Checking)/i, { timeout: 10000 });
    const pip = page.getByTestId('dev-server-pip');
    let pipClass = await pip.getAttribute('class');
    expect(pipClass).toMatch(/green|amber/);

    // Step 3: Backend goes down (simulate by blocking health endpoints entirely)
    await page.route('**/api/health', route => route.abort());
    await page.route('**/health', route => route.abort());

    // Step 4: After polling interval, status turns red
    // (Component polls every 5 seconds by default)
    await page.waitForTimeout(6000);

    // Step 5: User sees "offline" status
    await expect(statusIndicator).toContainText(/offline/i, { timeout: 10000 });
    pipClass = await pip.getAttribute('class');
    expect(pipClass).toContain('red');

    // Step 6: User knows the system is down and should wait or report issue
  });
});
