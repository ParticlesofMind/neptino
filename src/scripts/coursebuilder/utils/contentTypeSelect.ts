/**
 * Content Type Dropdown Enhancer
 * Replaces the native select element with icon radio buttons for better UX.
 */

const ICON_PATHS = {
  text: '/src/assets/icons/coursebuilder/media/media-text.svg',
  image: '/src/assets/icons/coursebuilder/media/media-image.svg',
} as const;

interface EnhancedOption {
  value: string;
  label: string;
  icon: string;
}

const ENHANCED_ATTRIBUTE = 'data-content-type-enhanced';

function getOptionIcon(option: HTMLOptionElement): string | null {
  const explicitIcon = option.dataset.icon;
  if (explicitIcon) {
    return explicitIcon;
  }

  const fallback = ICON_PATHS[option.value as keyof typeof ICON_PATHS];
  return fallback ?? null;
}

function syncIconState(buttons: HTMLButtonElement[], activeValue: string): void {
  buttons.forEach((button) => {
    const isActive = button.dataset.value === activeValue;
    button.classList.toggle('is-active', isActive);
    button.setAttribute('aria-checked', isActive ? 'true' : 'false');
    button.tabIndex = isActive ? 0 : -1;
  });
}

function moveSelection(
  select: HTMLSelectElement,
  buttons: HTMLButtonElement[],
  targetIndex: number
): void {
  if (!buttons.length) {
    return;
  }

  const boundedIndex = (targetIndex + buttons.length) % buttons.length;
  const targetButton = buttons[boundedIndex];
  const targetValue = targetButton.dataset.value;

  if (!targetValue) {
    return;
  }

  if (select.value !== targetValue) {
    select.value = targetValue;
    select.dispatchEvent(new Event('change', { bubbles: true }));
  }

  targetButton.focus();
}

export function initializeContentTypeSelect(selectElement: HTMLSelectElement): void {
  if (!selectElement || selectElement.hasAttribute(ENHANCED_ATTRIBUTE)) {
    return;
  }

  const wrapper = selectElement.closest('.tools__control--dropdown');
  if (!wrapper) {
    return;
  }

  const options = Array.from(selectElement.options);
  if (!options.length) {
    return;
  }

  const enhancedOptions: EnhancedOption[] = [];

  for (const option of options) {
    const icon = getOptionIcon(option);
    if (!icon) {
      return; // Abort enhancement if any option is missing an icon.
    }
    enhancedOptions.push({
      value: option.value,
      label: option.text,
      icon,
    });
  }

  const radiogroup = document.createElement('div');
  radiogroup.className = 'tools__icon-options';
  radiogroup.setAttribute('role', 'radiogroup');
  const label =
    selectElement.getAttribute('aria-label') ??
    selectElement.getAttribute('title') ??
    'Content Type';
  radiogroup.setAttribute('aria-label', label);

  const buttons: HTMLButtonElement[] = [];

  enhancedOptions.forEach((option, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'button button--engine tools__icon-option';
    button.dataset.value = option.value;
    button.setAttribute('role', 'radio');
    button.setAttribute('aria-checked', 'false');
    button.tabIndex = -1;

    const image = document.createElement('img');
    image.src = option.icon;
    image.alt = option.label;
    image.className = 'tools__icon-option-image';
    button.appendChild(image);

    const text = document.createElement('span');
    text.className = 'tools__icon-option-label';
    text.textContent = option.label;
    button.appendChild(text);

    button.addEventListener('click', () => {
      if (selectElement.value !== option.value) {
        selectElement.value = option.value;
        selectElement.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });

    button.addEventListener('keydown', (event: KeyboardEvent) => {
      const currentIndex = buttons.findIndex((btn) => btn.dataset.value === selectElement.value);
      switch (event.key) {
        case 'ArrowRight':
        case 'ArrowDown':
          event.preventDefault();
          moveSelection(selectElement, buttons, currentIndex + 1);
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
          event.preventDefault();
          moveSelection(selectElement, buttons, currentIndex - 1);
          break;
        case 'Home':
          event.preventDefault();
          moveSelection(selectElement, buttons, 0);
          break;
        case 'End':
          event.preventDefault();
          moveSelection(selectElement, buttons, buttons.length - 1);
          break;
        case ' ':
        case 'Enter':
          event.preventDefault();
          if (selectElement.value !== option.value) {
            selectElement.value = option.value;
            selectElement.dispatchEvent(new Event('change', { bubbles: true }));
          }
          break;
        default:
          break;
      }
    });

    buttons.push(button);
    radiogroup.appendChild(button);
  });

  selectElement.classList.add('tools__dropdown-native');
  selectElement.setAttribute('aria-hidden', 'true');
  selectElement.tabIndex = -1;

  const syncWithSelect = (): void => {
    syncIconState(buttons, selectElement.value);
  };

  selectElement.addEventListener('change', syncWithSelect);
  wrapper.insertBefore(radiogroup, selectElement);

  // Ensure a selection is always present.
  if (!selectElement.value && enhancedOptions.length) {
    selectElement.value = enhancedOptions[0].value;
  }

  syncWithSelect();

  selectElement.setAttribute(ENHANCED_ATTRIBUTE, 'true');
}

export function isContentTypeSelect(element: HTMLElement): boolean {
  if (element.tagName !== 'SELECT') {
    return false;
  }

  const select = element as HTMLSelectElement;
  const wrapper = select.closest('.tools__control--dropdown');
  if (!wrapper) {
    return false;
  }

  const label = select.getAttribute('aria-label') ?? wrapper.getAttribute('title') ?? '';
  return label.toLowerCase().includes('content type');
}
