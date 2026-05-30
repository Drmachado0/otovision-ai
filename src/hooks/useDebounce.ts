import { useEffect, useState } from "react";

/**
 * Returns a debounced copy of `value` that only updates after `delay`ms
 * have elapsed without `value` changing. Useful to keep a search input
 * responsive (controlled by the raw value) while deferring the expensive
 * work (filtering, refetching) until the user stops typing.
 */
export function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

export default useDebounce;
