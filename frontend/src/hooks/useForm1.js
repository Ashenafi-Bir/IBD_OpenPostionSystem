import { useState, useCallback } from 'react';

export const useForm = (initialValues = {}, validators = {}) => {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  const setValue = useCallback((name, value) => {
    setValues(prev => ({ ...prev, [name]: value }));
  }, []);

  const setAllValues = useCallback((newValues) => {
    setValues(newValues);
  }, []);

  const handleChange = useCallback((name, value) => {
    setValues(prev => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  }, [errors]);

  const handleBlur = useCallback((name) => {
    setTouched(prev => ({ ...prev, [name]: true }));
    
    // Validate the field on blur
    if (validators[name]) {
      const error = validators[name](values[name], values, false);
      if (error) {
        setErrors(prev => ({ ...prev, [name]: error }));
      }
    }
  }, [validators, values]);

  const validate = useCallback((isEditing = false) => {
    const newErrors = {};
    let isValid = true;

    Object.keys(validators).forEach(key => {
      const error = validators[key](values[key], values, isEditing);
      if (error) {
        newErrors[key] = error;
        isValid = false;
      }
    });

    setErrors(newErrors);
    setTouched(Object.keys(validators).reduce((acc, key) => {
      acc[key] = true;
      return acc;
    }, {}));

    return isValid;
  }, [validators, values]);

  const reset = useCallback((newValues = initialValues) => {
    setValues(newValues);
    setErrors({});
    setTouched({});
  }, [initialValues]);

  return {
    values,
    errors,
    touched,
    handleChange,
    handleBlur,
    validate,
    reset,
    setValue,
    setValues: setAllValues
  };
};