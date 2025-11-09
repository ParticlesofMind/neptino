import { TEMPLATE_TYPE_OPTIONS } from "./templateOptions.js";

const templateTypeOptionsMarkup = TEMPLATE_TYPE_OPTIONS
  .map(({ value, label }) => `<option value="${value}">${label}</option>`)
  .join("");

const createTemplateModal = `
  <article class="modal modal--coursebuilder" id="create-template-modal" aria-hidden="true">
    <div class="modal__content">
      <header class="modal__header">
        <h2 class="modal__title">Create New Template</h2>
        <button class="button button--subtle button--small modal__close" type="button">
          &times;
        </button>
      </header>
      <form class="form form--create-template modal__body" id="create-template-form">
        <label class="form__label">
          Template Name*
          <input class="input" type="text" name="template-name" required placeholder="Enter template name" />
        </label>
        <label class="form__label">
          Template Type*
          <select class="input input--select" name="template-type" required>
            <option value="">Select template type</option>
            ${templateTypeOptionsMarkup}
          </select>
        </label>
        <label class="form__label">
          Description (Optional)
          <textarea class="form__textarea" name="template-description" rows="3"
            placeholder="Describe your template..."></textarea>
        </label>
        <footer class="modal__footer">
          <button class="button button--outline" type="button"
            onclick="TemplateManager.hideCreateTemplateModal()">
            Cancel
          </button>
          <button class="button button--primary" type="submit">
            Create Template
          </button>
        </footer>
      </form>
    </div>
  </article>
`;

const loadTemplateModal = `
  <article class="modal modal--coursebuilder" id="load-template-modal" aria-hidden="true">
    <div class="modal__content">
      <header class="modal__header">
        <h2 class="modal__title">Load Existing Template</h2>
        <button class="button button--subtle button--small modal__close" type="button">
          &times;
        </button>
      </header>
      <div class="modal__body template-browser">
        <form class="template-browser__controls" role="search">
          <input class="input" type="text" id="template-search" placeholder="Search templates..." />
          <select class="input input--select" id="template-type-filter">
            <option value="">All Types</option>
            ${templateTypeOptionsMarkup}
          </select>
        </form>
        <div class="template-browser__content">
          <p class="template-browser__loading" id="template-loading" style="display: none">
            Loading your templates...
          </p>
          <div class="template-browser__list" id="template-list-content" style="display: none">
            <!-- Templates will be populated here by JavaScript -->
          </div>
          <div class="template-browser__empty" id="no-templates-message" style="display: none">
            <span class="template-browser__empty-icon">📄</span>
            <h3 class="heading heading--h3">No Templates Found</h3>
            <p class="text text--description">
              You haven't created any templates yet. Use the buttons in the Template Configuration section to create one.
            </p>
          </div>
        </div>
      </div>
      <footer class="modal__footer">
        <button class="button button--outline" type="button"
          onclick="TemplateManager.hideLoadTemplateModal()">
          Cancel
        </button>
        <button class="button button--primary" type="button" id="load-selected-template" disabled>
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
