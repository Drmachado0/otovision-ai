import { useEffect, useId, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Subscribe to Supabase realtime postgres_changes for a table and run a
 * callback whenever rows change.
 *
 * Two improvements over a naive subscription:
 *
 * 1. Unique channel name per hook instance. Supabase channel names must be
 *    unique per subscriber: if two components subscribe to the same table
 *    using the same channel name (`realtime-${table}`), one subscription can
 *    silently override/drop the other. We append a stable per-instance id
 *    (from React's `useId`) so multiple subscribers to the same table coexist.
 *
 * 2. Debounced callback. A single DB operation can emit many
 *    postgres_changes events (e.g. a batch insert of parcelas or a multi-row
 *    update). Instead of firing the (usually full-table refetch) callback once
 *    per event, we coalesce a burst into a single call after a short quiet
 *    period.
 *
 * Public API is unchanged: useRealtimeSubscription(table, onDataChange).
 */
const DEBOUNCE_MS = 250;

export function useRealtimeSubscription(
  table: string,
  onDataChange: () => void
) {
  const uid = useId();

  // Keep the latest callback in a ref so the debounced handler stays stable
  // and the subscription effect isn't forced to tear down just because the
  // callback identity changed.
  const onDataChangeRef = useRef(onDataChange);
  onDataChangeRef.current = onDataChange;

  // Holds the pending debounce timer between events.
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const scheduleRefetch = () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        timeoutRef.current = null;
        onDataChangeRef.current();
      }, DEBOUNCE_MS);
    };

    const channel = supabase
      .channel(`realtime-${table}-${uid}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        () => scheduleRefetch()
      )
      .subscribe();

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      supabase.removeChannel(channel);
    };
  }, [table, uid]);
}
