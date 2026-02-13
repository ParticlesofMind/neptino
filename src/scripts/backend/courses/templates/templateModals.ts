import { TEMPLATE_TYPE_OPTIONS } from "./templateOptions.js";

const templateTypeOptionsMarkup = TEMPLATE_TYPE_OPTIONS
  .map(({ value, label }) => `<option value="${value}">${label}</option>`)
  .join("");

const createTemplateModal = `
  <article class="modal fixed inset-0 z-50 hidden items-center justify-center bg-black/40 p-4" id="create-template-modal" aria-hidden="true">
    <div class="modal__content w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
      <header class="modal__header mb-4 flex items-start justify-between">
        <h2 class="modal__title text-xl font-semibold text-neutral-900">Create New Template</h2>
        <button class="modal__close inline-flex h-8 w-8 items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-100" type="button">
          &times;
        </button>
      </header>
      <form class="form form--create-template modal__body space-y-4" id="create-template-form">
        <label class="block text-sm font-medium text-neutral-700">
          Template Name*
          <input class="mt-2 w-full rounded-md border-0 py-2 text-sm text-neutral-900 shadow-sm ring-1 ring-inset ring-neutral-300 focus:ring-2 focus:ring-inset focus:ring-primary-600" type="text" name="template-name" required placeholder="Enter template name" />
        </label>
        <label class="block text-sm font-medium text-neutral-700">
          Template Type*
          <select class="mt-2 w-full rounded-md border-0 py-2 text-sm text-neutral-900 shadow-sm ring-1 ring-inset ring-neutral-300 focus:ring-2 focus:ring-inset focus:ring-primary-600" name="template-type" required>
            <option value="">Select template type</option>
            ${templateTypeOptionsMarkup}
          </select>
        </label>
        <label class="block text-sm font-medium text-neutral-700">
          Description (Optional)
          <textarea class="mt-2 w-full rounded-md border-0 py-2 text-sm text-neutral-900 shadow-sm ring-1 ring-inset ring-neutral-300 focus:ring-2 focus:ring-inset focus:ring-primary-600" name="template-description" rows="3"
            placeholder="Describe your template..."></textarea>
        </label>
        <footer class="modal__footer flex justify-end gap-3">
          <button class="inline-flex items-center justify-center rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 shadow-sm hover:bg-neutral-50" type="button"
            onclick="TemplateManager.hideCreateTemplateModal()">
            Cancel
          </button>
          <button class="inline-flex items-center justify-center rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-700" type="submit">
            Create Template
          </button>
        </footer>
      </form>
    </div>
  </article>
`;

const loadTemplateModal = `
  <article class="modal fixed inset-0 z-50 hidden items-center justify-center bg-black/40 p-4" id="load-template-modal" aria-hidden="true">
    <div class="modal__content w-full max-w-3xl rounded-2xl bg-white p-6 shadow-xl">
      <header class="modal__header mb-4 flex items-start justify-between">
        <h2 class="modal__title text-xl font-semibold text-neutral-900">Load Existing Template</h2>
        <button class="modal__close inline-flex h-8 w-8 items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-100" type="button">
          &times;
        </button>
      </header>
      <div class="modal__body template-browser space-y-4">
        <form class="template-browser__controls flex flex-col gap-3 sm:flex-row" role="search">
          <input class="w-full rounded-md border-0 py-2 text-sm text-neutral-900 shadow-sm ring-1 ring-inset ring-neutral-300 focus:ring-2 focus:ring-inset focus:ring-primary-600" type="text" id="template-search" placeholder="Search templates..." />
          <select class="w-full rounded-md border-0 py-2 text-sm text-neutral-900 shadow-sm ring-1 ring-inset ring-neutral-300 focus:ring-2 focus:ring-inset focus:ring-primary-600" id="template-type-filter">
            <option value="">All Types</option>
            ${templateTypeOptionsMarkup}
          </select>
        </form>
        <div class="template-browser__content">
          <p class="template-browser__loading text-sm text-neutral-500" id="template-loading" style="display: none">
            Loading your templates...
          </p>
          <div class="template-browser__list grid gap-3" id="template-list-content" style="display: none">
            <!-- Templates will be populated here by JavaScript -->
          </div>
          <div class="template-browser__empty text-center text-sm text-neutral-500" id="no-templates-message" style="display: none">
            <span class="template-browser__empty-icon text-2xl">📄</span>
            <h3 class="mt-2 text-base font-semibold text-neutral-800">No Templates Found</h3>
            <p class="mt-1">
              You haven't created any templates yet. Use the buttons in the Template Configuration section to create one.
            </p>
          </div>
        </div>
      </div>
      <footer class="modal__footer mt-6 flex justify-end gap-3">
        <button class="inline-flex items-center justify-center rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 shadow-sm hover:bg-neutral-50" type="button"
          onclick="TemplateManager.hideLoadTemplateModal()">
          Cancel
        </button>
        <button class="inline-flex items-center justify-center rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 disabled:opacity-50" type="button" id="load-selected-template" disabled>
          Load Template
        </button>
      </footer>
    </div>
  </article>
`;

let injected = false;

function injectModals(): void {
  if (document.getElementById('create-template-modal')) {
    injected = true;
    return;
  }

  document.body.insertAdjacentHTML('beforeend', createTemplateModal + loadTemplateModal);

  injected = true;
}

export function ensureTemplateModals(): void {
  if (injected && document.getElementById('create-template-modal')) {
    return;
  }

  if (document.readyState === 'loading') {
    document.addEventListener(
      'DOMContentLoaded',
      () => {
        injectModals();
      },
      { once: true },
    );
  } else {
    injectModals();
  }
}

ensureTemplateModals();
