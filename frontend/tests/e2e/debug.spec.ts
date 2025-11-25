import { test, expect } from './fixtures';

test.describe('Debug Page', () => {
  test.beforeEach(async ({ page }) => {
    // Mock Flows API
    await page.route('**/api/editor/flows', async route => {
      await route.fulfill({ json: ['test_flow.yaml'] });
    });

    // Mock Flow content
    await page.route('**/api/editor/flows/test_flow.yaml', async route => {
      await route.fulfill({ json: { name: 'test_flow.yaml', content: `
id: test_flow
version: "1.0"
start: plan
steps:
  - id: plan
    agent: codex_cli
    action: plan_bugfix
    transitions:
      success: end
` } });
    });
    
    // Mock Agent config
    await page.route('**/api/editor/agents/codex_cli.yaml', async route => {
      await route.fulfill({ json: { name: 'codex_cli.yaml', content: 'id: codex_cli\nmodel: gpt-test\nprompt_map:\n  plan_bugfix: code_plan.j2' } });
    });

    // Mock Prompt template
    await page.route('**/api/editor/prompts/code_plan.j2', async route => {
      await route.fulfill({ json: { name: 'code_plan.j2', content: 'Prompt for {{ flow_name }}' } });
    });
    
    // Mock Start Session API - default handler
    await page.route('**/api/debug/sessions', async route => {
      await route.fulfill({ json: { session_id: 'test-session-123' } });
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
          // Expose this instance to the window for test control
          (window as any).mockWebSocket = this;
          
          setTimeout(() => {
            this.onopen();
          }, 10);
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
  });

  test('should handle empty flows list', async ({ page }) => {
    // Mock Flows API to return empty list
    await page.route('**/api/editor/flows', async route => {
      await route.fulfill({ json: [] });
    });

    await page.goto('/debug');
    
    // Verify dropdown shows "No flows found" and is disabled
    const select = page.getByLabel('Debug Flow', { exact: true });
    await expect(select).toBeDisabled();
    await expect(select).toHaveText('No flows found');
    
    // Verify Start button is disabled
    await expect(page.getByRole('button', { name: 'Start Debugging' })).toBeDisabled();
  });

  test('should start debug session with default settings', async ({ page }) => {
    let requestPayload: any = null;
    await page.route('**/api/editor/flows', async route => {
      await route.fulfill({ json: ['test_flow.yaml'] });
    });
    await page.route('**/api/editor/flows/test_flow.yaml', async route => {
      await route.fulfill({ json: { name: 'test_flow.yaml', content: 'id: test_flow\nstart: start\nsteps: []' } });
    });
    await page.route('**/api/debug/sessions', async route => {
      requestPayload = route.request().postDataJSON();
      await route.fulfill({ json: { session_id: 'test-session-default' } });
    });

    await page.goto('/debug');
    await page.getByLabel('Debug Flow', { exact: true }).selectOption('test_flow.yaml');
    await page.getByRole('button', { name: 'Start Debugging' }).click();

    expect(requestPayload).toBeTruthy();
    expect(requestPayload.flow_id).toBe('test_flow');
    expect(requestPayload.agent_profile).toBeUndefined();
    expect(requestPayload.scenario_id).toBeTruthy();
    expect(String(requestPayload.scenario_id)).toContain('scn-');
    
    await expect(page.getByText('Session started: test-session-default')).toBeVisible();
    
    // Verify logs
    await expect(page.getByText('Session Logs')).toBeVisible();
    // Verify viewer is waiting for logs (connected)
    await expect(page.getByText('Waiting for logs...')).toBeVisible();
  });

  test('should start debug session with Real LLM enabled', async ({ page }) => {
    let requestPayload: any = null;
    await page.route('**/api/debug/sessions', async route => {
      requestPayload = route.request().postDataJSON();
      await route.fulfill({ json: { session_id: 'test-session-real' } });
    });

    await page.goto('/debug');
    await page.getByLabel('Debug Flow', { exact: true }).selectOption('test_flow.yaml');
    
    // Toggle Real LLM
    await page.getByLabel('Use Real LLM (Codex)').check();
    
    await page.getByRole('button', { name: 'Start Debugging' }).click();

    expect(requestPayload).toBeTruthy();
    expect(requestPayload.flow_id).toBe('test_flow');
    expect(requestPayload.agent_profile).toBe('codex_cli_codex');
    expect(requestPayload.scenario_id).toBeTruthy();
    
    await expect(page.getByText('Session started: test-session-real')).toBeVisible();
  });

  test('should save and load scenario with overrides', async ({ page }) => {
    let requestPayload: any = null;
    await page.route('**/api/debug/sessions', async route => {
      requestPayload = route.request().postDataJSON();
      await route.fulfill({ json: { session_id: 'test-session-scenario' } });
    });

    await page.goto('/debug');
    await page.getByLabel('Debug Flow', { exact: true }).selectOption('test_flow.yaml');

    await page.getByLabel('Scenario name').fill('My Scenario');
    await page.getByLabel('Agent profile (optional)').fill('custom_profile');
    await page.getByLabel('Model override (optional)').fill('gpt-4-test');

    // Prompt override editor
    await page.locator('textarea#prompt-override').fill('Custom prompt body');

    await page.getByRole('button', { name: 'Save' }).click();
    // Scope the assertion to the saved-scenario context to avoid duplicate text matches.
    await expect(page.getByTestId('debug-context').getByText('My Scenario')).toBeVisible();

    await page.getByRole('button', { name: 'Start Debugging' }).click();

    expect(requestPayload).toBeTruthy();
    expect(requestPayload.agent_profile).toBe('custom_profile');
    expect(requestPayload.llm_model).toBe('gpt-4-test');
    expect(requestPayload.scenario_id).toBeTruthy();
    expect(requestPayload.prompt_overrides).toEqual({ plan_bugfix: 'Custom prompt body' });
  });

  test('should show saved scenarios list and delete', async ({ page }) => {
    await page.goto('/debug');
    await page.getByLabel('Debug Flow', { exact: true }).selectOption('test_flow.yaml');
    await page.getByLabel('Scenario name').fill('DeleteMe');
    await page.getByRole('button', { name: 'Save' }).click();

    const scenarioCard = page.getByTestId('debug-context').getByText('DeleteMe');
    await expect(scenarioCard).toBeVisible();

    // Load should populate name
    await page.getByRole('button', { name: 'Load' }).click();
    await expect(page.getByLabel('Scenario name')).toHaveValue('DeleteMe');

    await page.getByRole('button', { name: 'Delete' }).click();
    await expect(page.getByText('DeleteMe')).not.toBeVisible();
  });

  test('should handle WebSocket interactions', async ({ page }) => {
    await page.goto('/debug');
    await page.getByLabel('Debug Flow', { exact: true }).selectOption('test_flow.yaml');
    await page.getByRole('button', { name: 'Start Debugging' }).click();

    // Wait for WebSocket connection log
    await expect(page.getByText('WebSocket connected')).toBeVisible();

    // Simulate "paused" message from backend
    await page.evaluate(() => {
      const ws = (window as any).mockWebSocket;
      ws.onmessage({ 
        data: JSON.stringify({ 
          type: "paused", 
          phase: "before", 
          step: "step1", 
          context: { var1: "value1" } 
        }) 
      });
    });

    // Verify UI updates
    await expect(page.getByText('Paused at before step1')).toBeVisible();
    await expect(page.getByText('"var1": "value1"')).toBeVisible();
    
    // Click "Step Over"
    await page.getByRole('button', { name: 'Step Over' }).click();
    
    // Verify message sent
    const sentStep = await page.evaluate(() => {
      const ws = (window as any).mockWebSocket;
      return ws.sentMessages.find((m: string) => m.includes('"command":"step"'));
    });
    expect(sentStep).toBeTruthy();

    // Click "Resume"
    await page.getByRole('button', { name: 'Resume' }).click();
    
    // Verify message sent
    const sentResume = await page.evaluate(() => {
      const ws = (window as any).mockWebSocket;
      return ws.sentMessages.find((m: string) => m.includes('"command":"resume"'));
    });
    expect(sentResume).toBeTruthy();

    // Simulate "finished" message
    await page.evaluate(() => {
      const ws = (window as any).mockWebSocket;
      ws.onmessage({ 
        data: JSON.stringify({ 
          type: "finished", 
          result: { status: "success" } 
        }) 
      });
    });

    await expect(page.getByText('Flow finished')).toBeVisible();
    
    // Click "Stop"
    await page.getByRole('button', { name: 'Stop' }).click();
    
    // Verify message sent
    const sentStop = await page.evaluate(() => {
      const ws = (window as any).mockWebSocket;
      return ws.sentMessages.find((m: string) => m.includes('"command":"stop"'));
    });
    expect(sentStop).toBeTruthy();
  });

  test('supports context templates, saved captures, and agent/prompt viewers', async ({ page }) => {
    let requestPayload: any = null;
    await page.route('**/api/debug/sessions', async route => {
      requestPayload = route.request().postDataJSON();
      await route.fulfill({ json: { session_id: 'test-session-with-context' } });
    });

    await page.goto('/debug');
    await page.getByLabel('Debug Flow', { exact: true }).selectOption('test_flow.yaml');

    // Context editor should start with a template showing input/breakpoints
    const contextEditor = page.getByTestId('context-editor').locator('textarea');
    await expect(contextEditor).toContainText('"input"');

    await contextEditor.fill('{"input":{"bug":"boom"},"breakpoints":["plan"]}');
    await page.getByRole('button', { name: 'Start Debugging' }).click();

    expect(requestPayload?.input).toMatchObject({ bug: 'boom' });
    expect(requestPayload?.breakpoints).toContain('plan');

    // Simulate a pause to populate current context
    await page.evaluate(() => {
      const ws = (window as any).mockWebSocket;
      ws.onmessage({ 
        data: JSON.stringify({ 
          type: "paused", 
          phase: "before", 
          step: "plan", 
          context: { bug: "boom" } 
        }) 
      });
    });

    // Capture the context and verify it shows up in saved contexts list
    await page.getByRole('button', { name: 'Capture Context' }).click();
    const savedList = page.getByTestId('saved-contexts');
    await expect(savedList.getByRole('button', { name: /Load/i })).toBeVisible();

    // Load the saved context back into the editor
    await savedList.getByRole('button', { name: /Load/i }).click();
    await expect(contextEditor).toContainText(/"bug": "boom"/);

    // Agent config and prompt template viewers should render
    await expect(page.getByTestId('agent-viewer')).toContainText('model: gpt-test');
    await expect(page.getByTestId('prompt-viewer')).toContainText('Prompt for');
  });
});
