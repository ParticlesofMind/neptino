const ACTIVE_BUTTON_CLASSES = [
  'bg-primary-400',
  'text-white',
  'border-primary-400',
  'hover:bg-primary-500',
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
  'flex',
  'flex-col',
  'items-center',
  'justify-center',
  'gap-0.5',
  'w-[50px]',
  'h-[50px]',
  'rounded-md',
  'border',
  'text-sm',
  'font-medium',
  'shadow-sm',
  'transition-all',
  'cursor-pointer',
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
    // Make icons white when button is active
    const img = button.querySelector('img');
    if (img) {
      img.style.filter = 'brightness(0) invert(1)';
    }
    const svg = button.querySelector('svg');
    if (svg) {
      svg.style.filter = 'brightness(0) invert(1)';
    }
  } else {
    button.classList.remove(...ACTIVE_BUTTON_CLASSES);
    button.classList.add(...INACTIVE_BUTTON_CLASSES);
    // Reset icon filter
    const img = button.querySelector('img');
    if (img) {
      img.style.filter = '';
    }
    const svg = button.querySelector('svg');
    if (svg) {
      svg.style.filter = '';
    }
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
