import { useState, useCallback } from 'react';

export const useForm = (initialValues = {}, validators = {}) => {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  const handleChange = useCallback((name, value) => {
    setValues(prev => ({ ...prev, [name]: value }));
    
    // Validate field if it's been touched
    if (touched[name]) {
      const error = validators[name]?.(value);
      setErrors(prev => ({ ...prev, [name]: error }));
    }
  }, [validators, touched]);

  const handleBlur = useCallback((name) => {
    setTouched(prev => ({ ...prev, [name]: true }));
    
    // Validate field on blur
    const error = validators[name]?.(values[name]);
    setErrors(prev => ({ ...prev, [name]: error }));
  }, [validators, values]);

  const setValue = useCallback((name, value) => {
    handleChange(name, value);
  }, [handleChange]);

  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
  }, [initialValues]);

  const validate = useCallback(() => {
    const newErrors = {};
    Object.keys(validators).forEach(key => {
      const error = validators[key]?.(values[key]);
      if (error) {
        newErrors[key] = error;
      }
    });
    
    setErrors(newErrors);
    setTouched(Object.keys(values).reduce((acc, key) => ({ ...acc, [key]: true }), {}));
    
    return Object.keys(newErrors).length === 0;
  }, [validators, values]);

  return {
    values,
    errors,
    touched,
    handleChange,
    handleBlur,
    setValue,
    reset,
    validate,
    isValid: Object.keys(errors).length === 0
  };
};