// Type definitions for @barba/core
declare module '@barba/core' {
  interface BarbaTransition {
    name?: string;
    from?: { namespace?: string | string[] };
    to?: { namespace?: string | string[] };
    leave?(data: BarbaTransitionData): Promise<void> | void;
    enter?(data: BarbaTransitionData): Promise<void> | void;
    beforeEnter?(data: BarbaTransitionData): Promise<void> | void;
    afterEnter?(data: BarbaTransitionData): Promise<void> | void;
    beforeLeave?(data: BarbaTransitionData): Promise<void> | void;
    afterLeave?(data: BarbaTransitionData): Promise<void> | void;
  }

  interface BarbaTransitionData {
    current: {
      container: HTMLElement;
      namespace: string;
    };
    next: {
      container: HTMLElement;
      namespace: string;
    };
    trigger: HTMLElement;
  }

  interface BarbaView {
    namespace: string;
    beforeEnter?(data?: any): void;
    afterEnter?(data?: any): void;
    beforeLeave?(data?: any): void;
    afterLeave?(data?: any): void;
  }

  interface BarbaHooks {
    beforeEnter(callback: () => void): void;
    afterEnter(callback: () => void): void;
    beforeLeave(callback: () => void): void;
    afterLeave(callback: () => void): void;
  }

  interface BarbaConfig {
    transitions?: BarbaTransition[];
    views?: BarbaView[];
  }

  interface Barba {
    init(config: BarbaConfig): void;
    hooks: BarbaHooks;
  }

  const barba: Barba;
  export default barba;
}
