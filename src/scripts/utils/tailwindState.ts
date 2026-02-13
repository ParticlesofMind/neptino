const ACTIVE_BUTTON_CLASSES = [
  'bg-primary-600',
  'text-white',
  'border-primary-600',
  'hover:bg-primary-700',
  'hover:text-white',
];

const INACTIVE_BUTTON_CLASSES = [
  'bg-white',
  'text-neutral-700',
  'border-neutral-300',
  'hover:bg-neutral-50',
  'hover:text-neutral-900',
];

const ENGINE_BUTTON_BASE_CLASSES = [
  'inline-flex',
  'items-center',
  'justify-center',
  'gap-2',
  'rounded-lg',
  'border',
  'px-3',
  'py-2',
  'text-sm',
  'font-medium',
  'shadow-sm',
  'transition-all',
  'focus-visible:outline-none',
  'focus-visible:ring-2',
  'focus-visible:ring-primary-500',
  'focus-visible:ring-offset-2',
  'disabled:opacity-50',
  'disabled:pointer-events-none',
];

const FIELD_ERROR_CLASSES = ['ring-2', 'ring-error-500', 'border-error-500', 'text-error-700'];
const FIELD_BASE_RING = ['ring-1', 'ring-inset', 'ring-neutral-300', 'border-transparent'];

export const applyEngineButtonBase = (button: HTMLElement): void => {
  button.classList.add(...ENGINE_BUTTON_BASE_CLASSES);
  button.classList.add(...INACTIVE_BUTTON_CLASSES);
};

export const setButtonActive = (button: HTMLElement, active: boolean): void => {
  if (active) {
    button.classList.remove(...INACTIVE_BUTTON_CLASSES);
    button.classList.add(...ACTIVE_BUTTON_CLASSES);
  } else {
    button.classList.remove(...ACTIVE_BUTTON_CLASSES);
    button.classList.add(...INACTIVE_BUTTON_CLASSES);
  }
};

export const setElementHidden = (element: HTMLElement, hidden: boolean): void => {
  element.classList.toggle('hidden', hidden);
  element.setAttribute('aria-hidden', hidden ? 'true' : 'false');
};

export const setFieldError = (input: HTMLElement, invalid: boolean): void => {
  if (invalid) {
    input.classList.remove(...FIELD_BASE_RING);
    input.classList.add(...FIELD_ERROR_CLASSES);
  } else {
    input.classList.remove(...FIELD_ERROR_CLASSES);
    input.classList.add(...FIELD_BASE_RING);
  }
};
