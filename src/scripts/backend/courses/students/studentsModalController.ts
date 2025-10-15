type Focusable = HTMLElement & { disabled?: boolean };

const FOCUSABLE_SELECTORS = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
];

function getFocusableElements(container: HTMLElement): Focusable[] {
  return Array.from(
    container.querySelectorAll<Focusable>(FOCUSABLE_SELECTORS.join(",")),
  ).filter((element) => !element.hasAttribute("disabled") && element.tabIndex >= 0);
}

export class StudentsModalController {
  private activeModal: HTMLElement | null = null;
  private lastFocused: HTMLElement | null = null;
  private initialized = false;

  constructor(private readonly root: Document = document) {}

  public init(): void {
    if (this.initialized) return;

    this.initialized = true;
    this.root.addEventListener("click", this.handleClick);
    this.root.addEventListener("keydown", this.handleKeydown, true);
  }

  public open(modalId: string): void {
    const modal = this.root.getElementById(modalId);
    if (!modal) return;

    if (!(modal instanceof HTMLElement)) return;

    this.lastFocused = this.root.activeElement as HTMLElement | null;
    this.closeActiveModal();

    modal.classList.add("modal--active");
    modal.setAttribute("aria-hidden", "false");
    this.root.body.classList.add("is-modal-open");
    this.activeModal = modal;

    const content = modal.querySelector<HTMLElement>(".modal__content");
    const focusable = content ? getFocusableElements(content) : [];
    const preferred = modal.querySelector<HTMLElement>("[data-modal-autofocus]");

    if (preferred) {
      preferred.focus();
    } else if (focusable.length) {
      focusable[0].focus();
    } else if (content) {
      content.setAttribute("tabindex", "-1");
      content.focus();
    }
  }

  public close(modalId?: string): void {
    if (!this.activeModal) return;
    if (modalId && this.activeModal.id !== modalId) return;
    this.closeActiveModal();
  }

  private closeActiveModal(): void {
    if (!this.activeModal) return;
    this.activeModal.classList.remove("modal--active");
    this.activeModal.setAttribute("aria-hidden", "true");
    this.activeModal = null;
    this.root.body.classList.remove("is-modal-open");

    if (this.lastFocused) {
      this.lastFocused.focus();
      this.lastFocused = null;
    }
  }

  private readonly handleClick = (event: MouseEvent): void => {
    const target = event.target as HTMLElement | null;
    if (!target) return;

    const trigger = target.closest<HTMLElement>(".students__trigger[data-modal-target]");
    if (trigger) {
      const modalId = trigger.getAttribute("data-modal-target");
      if (modalId) {
        event.preventDefault();
        this.open(modalId);
      }
      return;
    }

    const closeButton = target.closest<HTMLElement>("[data-modal-close]");
    if (closeButton) {
      const modalId = closeButton.getAttribute("data-modal-close");
      event.preventDefault();
      if (modalId) {
        this.close(modalId);
      } else {
        this.close();
      }
      return;
    }

    if (this.activeModal && !this.activeModal.contains(target) && target.matches(".modal")) {
      event.preventDefault();
      this.close();
    }
  };

  private readonly handleKeydown = (event: KeyboardEvent): void => {
    if (!this.activeModal) return;

    if (event.key === "Escape") {
      event.stopPropagation();
      event.preventDefault();
      this.close();
      return;
    }

    if (event.key !== "Tab") return;

    const content = this.activeModal.querySelector<HTMLElement>(".modal__content");
    if (!content) return;

    const focusable = getFocusableElements(content);
    if (!focusable.length) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const activeElement = this.root.activeElement as HTMLElement;

    if (event.shiftKey) {
      if (activeElement === first) {
        event.preventDefault();
        last.focus();
      }
    } else if (activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };
}
