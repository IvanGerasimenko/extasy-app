import {
  startPresenceTracking,
  stopPresenceTracking,
} from "@/services/presence";
import { supabase } from "@/services/supabase";
import React, { useEffect } from "react";

export function PresenceTracker() {
  useEffect(() => {
    let mounted = true;

    void supabase.auth.getSession().then(({ data }) => {
      if (mounted && data.session?.user.id) {
        void startPresenceTracking(data.session.user.id);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user.id) {
        void startPresenceTracking(session.user.id);
      } else {
        void stopPresenceTracking();
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
      void stopPresenceTracking();
    };
  }, []);

  return null;
}

