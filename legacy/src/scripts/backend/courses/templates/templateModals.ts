import { TEMPLATE_TYPE_OPTIONS } from "./templateOptions.js";

const templateTypeOptionsMarkup = TEMPLATE_TYPE_OPTIONS
  .map(({ value, label }) => `<option value="${value}">${label}</option>`)
  .join("");

const createTemplateModal = `
  <article class="modal" data-modal id="create-template-modal" aria-hidden="true">
    <div class="modal__content" data-modal-content style="max-width: 32rem;">
      <header class="modal__header">
        <h2 class="modal__title">Create New Template</h2>
        <button class="button button--ghost" data-modal-close type="button" aria-label="Close">
          &times;
        </button>
      </header>
      <form class="form" id="create-template-form" data-template-form>
        <div class="modal__body">
          <label class="form__label">
            Template Name*
            <input class="input input--text" type="text" name="template-name" required placeholder="Enter template name" />
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
            <textarea class="input input--textarea form__textarea" name="template-description" rows="3"
              placeholder="Describe your template..."></textarea>
          </label>
        </div>
      </form>
      <footer class="modal__footer">
        <button class="button button--outline" type="button"
          onclick="TemplateManager.hideCreateTemplateModal()">
          Cancel
        </button>
        <button class="button button--primary" type="submit" form="create-template-form">
          Create Template
        </button>
      </footer>
    </div>
  </article>
`;

const loadTemplateModal = `
  <article class="modal" data-modal id="load-template-modal" aria-hidden="true">
    <div class="modal__content" data-modal-content style="max-width: 48rem;">
      <header class="modal__header">
        <h2 class="modal__title">Load Existing Template</h2>
        <button class="button button--ghost" data-modal-close type="button" aria-label="Close">
          &times;
        </button>
      </header>
      <div class="modal__body">
        <form class="form" role="search" data-template-browser-controls>
          <div class="form__row">
            <label class="form__label" style="flex: 1;">
              <input class="input input--text" type="text" id="template-search" placeholder="Search templates..." />
            </label>
            <label class="form__label" style="flex: 0 0 12rem;">
              <select class="input input--select" id="template-type-filter">
                <option value="">All Types</option>
                ${templateTypeOptionsMarkup}
              </select>
            </label>
          </div>
        </form>
        <div>
          <p class="modal__text" id="template-loading" style="display: none; text-align: center;" data-template-loading>
            Loading your templates...
          </p>
          <div id="template-list-content" style="display: none; margin-top: 1rem;" data-template-list>
            <!-- Templates will be populated here by JavaScript -->
          </div>
          <div style="text-align: center; padding: 2rem; display: none;" id="no-templates-message" data-template-empty>
            <div style="font-size: 2rem; margin-bottom: 0.5rem;" data-template-empty-icon>📄</div>
            <h3 class="heading heading--h4" style="margin: 0.5rem 0;">No Templates Found</h3>
            <p class="modal__text">
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
