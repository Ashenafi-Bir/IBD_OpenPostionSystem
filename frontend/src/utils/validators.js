export const required = (message = 'This field is required') => 
  (value) => !value ? message : undefined;

export const minLength = (min, message = `Must be at least ${min} characters`) => 
  (value) => value && value.length < min ? message : undefined;

export const maxLength = (max, message = `Must be less than ${max} characters`) => 
  (value) => value && value.length > max ? message : undefined;

export const email = (message = 'Invalid email address') => 
  (value) => value && !/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(value) ? message : undefined;

export const number = (message = 'Must be a number') => 
  (value) => value && isNaN(Number(value)) ? message : undefined;

export const minValue = (min, message = `Must be at least ${min}`) => 
  (value) => value && Number(value) < min ? message : undefined;

export const maxValue = (max, message = `Must be less than ${max}`) => 
  (value) => value && Number(value) > max ? message : undefined;

export const composeValidators = (...validators) => 
  (value) => validators.reduce((error, validator) => error || validator(value), undefined);