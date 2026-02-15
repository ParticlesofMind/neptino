import { TEMPLATE_TYPE_OPTIONS } from "./templateOptions";

const templateTypeOptionsMarkup = TEMPLATE_TYPE_OPTIONS
  .map(({ value, label }) => `<option value="${value}">${label}</option>`)
  .join("");

const createTemplateModal = `
  <article class="fixed inset-0 z-50 hidden items-center justify-center bg-black/40 p-4" data-modal id="create-template-modal" aria-hidden="true">
    <div class="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl" data-modal-content>
      <header class="mb-4 flex items-start justify-between">
        <h2 class="text-xl font-semibold text-neutral-900">Create New Template</h2>
        <button class="inline-flex h-8 w-8 items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-100" data-modal-close type="button">
          &times;
        </button>
      </header>
      <form class="space-y-4" id="create-template-form" data-template-form>
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
        <footer class="flex justify-end gap-3">
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
  <article class="fixed inset-0 z-50 hidden items-center justify-center bg-black/40 p-4" data-modal id="load-template-modal" aria-hidden="true">
    <div class="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-xl" data-modal-content>
      <header class="mb-4 flex items-start justify-between">
        <h2 class="text-xl font-semibold text-neutral-900">Load Existing Template</h2>
        <button class="inline-flex h-8 w-8 items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-100" data-modal-close type="button">
          &times;
        </button>
      </header>
      <div class="space-y-4">
        <form class="flex flex-col gap-3 sm:flex-row" role="search" data-template-browser-controls>
          <input class="w-full rounded-md border-0 py-2 text-sm text-neutral-900 shadow-sm ring-1 ring-inset ring-neutral-300 focus:ring-2 focus:ring-inset focus:ring-primary-600" type="text" id="template-search" placeholder="Search templates..." />
          <select class="w-full rounded-md border-0 py-2 text-sm text-neutral-900 shadow-sm ring-1 ring-inset ring-neutral-300 focus:ring-2 focus:ring-inset focus:ring-primary-600" id="template-type-filter">
            <option value="">All Types</option>
            ${templateTypeOptionsMarkup}
          </select>
        </form>
        <div>
          <p class="text-sm text-neutral-500" id="template-loading" style="display: none" data-template-loading>
            Loading your templates...
          </p>
          <div class="grid gap-3" id="template-list-content" style="display: none" data-template-list>
            <!-- Templates will be populated here by JavaScript -->
          </div>
          <div class="text-center text-sm text-neutral-500" id="no-templates-message" style="display: none" data-template-empty>
            <span class="text-2xl" data-template-empty-icon>📄</span>
            <h3 class="mt-2 text-base font-semibold text-neutral-800">No Templates Found</h3>
            <p class="mt-1">
              You haven't created any templates yet. Use the buttons in the Template Configuration section to create one.
            </p>
          </div>
        </div>
      </div>
      <footer class="mt-6 flex justify-end gap-3">
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
