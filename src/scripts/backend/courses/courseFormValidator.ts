// ==========================================================================
// COURSE FORM VALIDATION - Validation logic and rules
// ==========================================================================

import { FormFieldConfig, ValidationState } from './courseFormConfig';

// ==========================================================================
// VALIDATION FUNCTIONS
// ==========================================================================

export function validateField(config: FormFieldConfig, value: any): boolean {
  // If field is not required and has no value, it's valid
  if (!value && !config.required) return true;
  
  // If field is required and has no value, it's invalid
  if (!value && config.required) return false;

  // Validate based on field type
  switch (config.type) {
    case 'text':
    case 'textarea':
      return validateTextField(config, value);
    
    case 'file':
      return validateFileField(config, value);
    
    case 'select':
      return validateSelectField(config, value);
    
    case 'number':
      return validateNumberField(config, value);
    
    case 'date':
    case 'time':
      return validateDateTimeField(config, value);
    
    case 'checkbox':
      return true; // Checkboxes are always valid
    
    case 'display':
      return true; // Display fields are always valid
    
    default:
      return Boolean(value);
  }
}

function validateTextField(config: FormFieldConfig, value: string): boolean {
  const strValue = String(value).trim();
  
  // Check minimum length
  if (config.minLength && strValue.length < config.minLength) {
    return false;
  }
  
  // Check maximum length
  if (config.maxLength && strValue.length > config.maxLength) {
    return false;
  }
  
  // Check pattern
  if (config.pattern && !config.pattern.test(strValue)) {
    return false;
  }
  
  return true;
}

function validateFileField(config: FormFieldConfig, value: File): boolean {
  if (!value) return !config.required;
  
  // Check file type if accept is specified
  if (config.accept && !isFileTypeAccepted(value, config.accept)) {
    return false;
  }
  
  return true;
}

function validateSelectField(config: FormFieldConfig, value: string): boolean {
  if (!value) return !config.required;
  
  // If options are specified, check if value is in the list
  if (config.options && !config.options.includes(value)) {
    return false;
  }
  
  return true;
}

function validateNumberField(config: FormFieldConfig, value: number | string): boolean {
  if (!value && value !== 0) return !config.required;
  
  const numValue = Number(value);
  return !isNaN(numValue);
}

function validateDateTimeField(config: FormFieldConfig, value: string): boolean {
  if (!value) return !config.required;
  
  // Basic date/time validation
  if (config.type === 'date') {
    const date = new Date(value);
    return !isNaN(date.getTime());
  }
  
  if (config.type === 'time') {
    // Basic time format validation (HH:MM)
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return timeRegex.test(value);
  }
  
  return true;
}

function isFileTypeAccepted(file: File, accept: string): boolean {
  const acceptedTypes = accept.split(',').map(type => type.trim());
  
  for (const acceptedType of acceptedTypes) {
    if (acceptedType.startsWith('.')) {
      // File extension check
      if (file.name.toLowerCase().endsWith(acceptedType.toLowerCase())) {
        return true;
      }
    } else if (acceptedType.includes('/*')) {
      // MIME type wildcard check (e.g., image/*)
      const baseType = acceptedType.split('/')[0];
      if (file.type.startsWith(baseType + '/')) {
        return true;
      }
    } else {
      // Exact MIME type check
      if (file.type === acceptedType) {
        return true;
      }
    }
  }
  
  return false;
}

// ==========================================================================
// FORM VALIDATION
// ==========================================================================

export function validateFormSection(
  fields: FormFieldConfig[], 
  formData: { [key: string]: any }
): ValidationState {
  const validationState: ValidationState = {};
  
  fields.forEach(fieldConfig => {
    const value = formData[fieldConfig.name];
    validationState[fieldConfig.name] = validateField(fieldConfig, value);
  });
  
  return validationState;
}

export function isFormSectionValid(
  requiredFields: string[], 
  validationState: ValidationState
): boolean {
  return requiredFields.every(fieldName => 
    validationState[fieldName] === true
  );
}

// ==========================================================================
// VALIDATION ERROR MESSAGES
// ==========================================================================

export function getValidationMessage(config: FormFieldConfig, value: any): string {
  if (!value && config.required) {
    return `${config.name.replace('_', ' ')} is required`;
  }
  
  if (config.type === 'text' || config.type === 'textarea') {
    const strValue = String(value || '').trim();
    
    if (config.minLength && strValue.length < config.minLength) {
      return `${config.name.replace('_', ' ')} must be at least ${config.minLength} characters`;
    }
    
    if (config.maxLength && strValue.length > config.maxLength) {
      return `${config.name.replace('_', ' ')} must be no more than ${config.maxLength} characters`;
    }
  }
  
  if (config.type === 'file' && value instanceof File) {
    if (config.accept && !isFileTypeAccepted(value, config.accept)) {
      return `Please select a valid file type (${config.accept})`;
    }
  }
  
  return ''; // No validation error
}

// ==========================================================================
// VALIDATION STATE HELPERS
// ==========================================================================

export function hasValidationErrors(validationState: ValidationState): boolean {
  return Object.values(validationState).some(isValid => !isValid);
}

export function getInvalidFields(validationState: ValidationState): string[] {
  return Object.keys(validationState).filter(fieldName => 
    !validationState[fieldName]
  );
}

export function getValidFields(validationState: ValidationState): string[] {
  return Object.keys(validationState).filter(fieldName => 
    validationState[fieldName]
  );
}
