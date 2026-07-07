import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [medico, setMedico] = useState(null);
  const [loading, setLoading] = useState(true);

  async function loadMedico(authUserId) {
    const { data, error } = await supabase
      .from("medicos")
      .select("*")
      .eq("auth_user_id", authUserId)
      .single();
    setMedico(error ? null : data);
  }

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (data.session) {
        await loadMedico(data.session.user.id);
      }
      if (active) setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session) {
          await loadMedico(session.user.id);
        } else {
          setMedico(null);
        }
        setLoading(false);
      },
    );

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    setMedico(null);
  }

  return (
    <AuthContext.Provider value={{ medico, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
