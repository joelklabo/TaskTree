import "@testing-library/jest-dom";

// Minimal EventSource mock to prevent hanging tests that open log streams.
class MockEventSource {
  url: string;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onopen: ((event: Event) => void) | null = null;
  readyState = 1; // OPEN

  constructor(url: string) {
    this.url = url;
    // Immediately signal open so callers proceed.
    setTimeout(() => {
      this.onopen?.(new Event("open"));
    }, 0);
  }

  close() {
    this.readyState = 2; // CLOSED
  }
}

// @ts-expect-error allow overriding global in test env
global.EventSource = MockEventSource;
