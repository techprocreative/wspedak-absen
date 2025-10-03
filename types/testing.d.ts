// Type definitions for testing libraries
declare module '@testing-library/react' {
  export * from '@testing-library/dom';
  export interface RenderOptions {
    wrapper?: React.ComponentType<any>;
  }
  export function render(ui: React.ReactElement, options?: RenderOptions): any;
}

declare module '@playwright/test' {
  export interface Page {
    goto(url: string): Promise<void>;
    locator(selector: string): any;
    click(selector: string): Promise<void>;
    fill(selector: string, value: string): Promise<void>;
    press(key: string): Promise<void>;
    waitForSelector(selector: string): Promise<any>;
    isVisible(selector: string): Promise<boolean>;
    screenshot(options?: any): Promise<Buffer>;
    waitForURL(url: string): Promise<void>;
    reload(): Promise<void>;
  }
  
  export interface TestInfo {
    project: any;
    workerIndex: number;
    parallelIndex: number;
    retry: number;
  }
  
  export interface FullConfig {
    projects: any[];
    globalSetup?: string;
    globalTeardown?: string;
    webServer?: {
      url: string;
    };
  }
  
  export const chromium: {
    launch(options?: any): Promise<any>;
  };
  
  export function defineConfig(config: any): any;
  
  export const test: {
    extend(options: any): any;
    describe(title: string, fn: () => void): void;
    it(title: string, fn: (page: Page) => Promise<void>): void;
    beforeAll(fn: () => Promise<void>): void;
    afterAll(fn: () => Promise<void>): void;
    beforeEach(fn: ({ page }: { page: Page }) => Promise<void>): void;
    afterEach(fn: () => Promise<void>): void;
    (title: string, fn: ({ page }: { page: Page }) => Promise<void>): void;
  };
  
  export const expect: any;
  export const devices: any;
}