# Template BEM Class Name Mapping

This document maps the old class names to new BEM-compliant class names for the template system.

## Template Structure Classes

### Old → New
- `template-nested-structure` → `template-structure`
- `template-hierarchy` → `template-structure__nested`
- `template-hierarchy-level` → `template-structure__level`
- `template-hierarchy-level--expandable` → `template-structure__level--expandable`
- `template-hierarchy-level-1` → `template-structure__level--primary`
- `template-hierarchy-level-2` → `template-structure__level--secondary`
- `template-hierarchy-level-3` → `template-structure__level--tertiary`
- `template-hierarchy-level-4` → `template-structure__level--quaternary`
- `template-content-fields` → `template-structure__content-fields`
- `template-content-field` → `content-field`
- `template-content-field--required` → `content-field--required`
- `template-content-field--optional` → `content-field--optional`
- `.field-type` → `content-field__type`
- `template-structure-builder` → `template-builder`
- `.structure-header` → `template-builder__header`
- `.add-level-button` → `template-builder__add-button`
- `.structure-controls` → `template-builder__controls`
- `.control-button` → `control-button`
- `.control-button.active` → `control-button--active`
- `.hierarchy-item.dragging` → `hierarchy-item--dragging`
- `.hierarchy-item.drag-over` → `hierarchy-item--drag-over`

## Template Blocks Classes

### Old → New
- `template-blocks__list` → `template-blocks__list` (unchanged)
- `template-block-item` → `block-item`
- `template-block-item--selected` → `block-item--selected`
- `template-block-item--disabled` → `block-item--disabled`
- `template-block-item__icon` → `block-item__icon`
- `template-block-item__icon--text` → `block-item__icon--text`
- `template-block-item__icon--image` → `block-item__icon--image`
- `template-block-item__icon--video` → `block-item__icon--video`
- `template-block-item__icon--audio` → `block-item__icon--audio`
- `template-block-item__icon--quiz` → `block-item__icon--quiz`
- `template-block-item__icon--embed` → `block-item__icon--embed`
- `template-block-item__content` → `block-item__content`
- `template-block-item__actions` → `block-item__actions`
- `block-config-form` → `block-config__form`
- `.empty-icon` → `empty-state__icon`
- `template-blocks__empty` → `template-blocks__empty` (unchanged but uses empty-state children)
- `.drag-over` → `--drag-over`
- `.dragging` → `--dragging`

## Template Preview Classes

### Old → New
- `template-preview__header` → `template-preview__header` (unchanged)
- `template-preview__content` → `template-preview__content` (unchanged)
- `template-preview__placeholder` → `template-preview__placeholder` (unchanged)
- `.preview-actions` → `template-preview__actions`
- `.placeholder-icon` → `preview-placeholder__icon`
- `preview-block` → `preview-block`
- `preview-block__header` → `preview-block__header`
- `preview-block__content` → `preview-block__content`
- `.block-type` → `preview-block__type`
- `.block-actions` → `preview-block__actions`

## Template List Classes

### Old → New
- `template-items` → `template-list__container`
- `template-item` → `template-card`
- `template-item--selected` → `template-card--selected`
- `template-item--disabled` → `template-card--disabled`
- `template-item-header` → `template-card__header`
- `.template-type` → `template-card__type`
- `template-description` → `template-card__description`
- `template-actions` → `template-card__actions`
- `template-meta` → `template-card__meta`
- `template-author` → `template-author`
- `.author-avatar` → `template-author__avatar`
- `template-date` → `template-card__date`
- `template-list-empty` → `template-list__empty`
- `template-filters` → `template-list__filters`
- `.search-input` → `list-filters__search`
- `.filter-select` → `list-filters__select`
- `.filter-toggle` → `filter-toggle`
- `.empty-icon` → `empty-state__icon`

## Template Modal Classes

### Old → New
- `template-modal.active` → `template-modal--active`
- `template-create-modal` → `template-modal--medium`
- `template-settings-modal` → `template-modal--large`
- `template-preview-modal` → `template-modal--extra-large`
- `template-delete-modal` → `template-modal--small`
- `.template-form` → `template-form`
- `.form-group` → `template-form__group`
- `.form-label` → `template-form__label`
- `.form-input` → `template-form__input`
- `.form-textarea` → `template-form__textarea`
- `.form-select` → `template-form__select`
- `.form-help` → `template-form__help`
- `.settings-tabs .tab` → `settings-tabs__tab`
- `.settings-tabs .tab.active` → `settings-tabs__tab--active`
- `.settings-content .setting-group` → `settings-content__group`
- `.setting-row` → `settings-content__row`
- `.setting-label` → `settings-content__label`
- `.setting-control` → `settings-content__control`
- `.device-selector` → `preview-toolbar__devices`
- `.device-option` → `device-option`
- `.device-option.active` → `device-option--active`
- `.preview-actions` → `preview-toolbar__actions`
- `.preview-frame iframe` → `preview-frame__content`
- `.preview-loading` → `preview-frame__loading`
- `.warning-icon` → `delete-confirmation__icon`
- `.delete-message` → `delete-confirmation__message`
- `.template-name` → `delete-confirmation__template-name`
- `.delete-actions` → `delete-confirmation__actions`
- `.cancel-button` → `modal-action--cancel`
- `.delete-button` → `modal-action--danger`

## Template Core Classes

### Old → New
- `template-type--course` → `template--course`
- `template-type--lesson` → `template--lesson`
- `template-type--quiz` → `template--quiz`
- `template-type--assignment` → `template--assignment`
- `template-text--muted` → `template-text--muted` (unchanged)
- `template-text--small` → `template-text--small` (unchanged)
- `template-text--truncate` → `template-text--truncated`
- `template-spacing--compact` → `template--compact`
- `template-spacing--normal` → `template--normal`
- `template-spacing--spacious` → `template--spacious`
