import { useState, useEffect, useCallback, useRef } from 'react';

export const useApi = (apiFunction, immediate = true, dependencies = []) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState(null);
  const abortControllerRef = useRef(null);
  const isMountedRef = useRef(true);

  const execute = useCallback(async (...args) => {
    // Cancel previous request if it's still running
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new AbortController for this request
    abortControllerRef.current = new AbortController();

    try {
      setLoading(true);
      setError(null);
      
      // Add signal to the API call
      const result = await apiFunction(...args, { 
        signal: abortControllerRef.current.signal 
      });
      
      if (isMountedRef.current) {
        setData(result);
      }
      return result;
    } catch (err) {
      if (isMountedRef.current && err.name !== 'AbortError') {
        setError(err);
      }
      throw err;
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
      abortControllerRef.current = null;
    }
  }, [apiFunction]);

  useEffect(() => {
    isMountedRef.current = true;
    
    if (immediate) {
      execute();
    }

    // Cleanup: abort request when component unmounts
    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [execute, immediate, ...dependencies]);

  return { data, loading, error, execute, setData };
};