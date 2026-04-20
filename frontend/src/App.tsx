import { useState } from "react";
import AuthScreen from "./components/AuthScreen";
import Dashboard from "./components/Dashboard";
import { AuthState } from "./types";

export default function App() {
  const [authState, setAuthState] = useState<AuthState | null>(null);

  const handleAuthSuccess = (uid: string, email: string, lastHead: number) => {
    setAuthState({ uid, email, lastHead });
  };

  if (!authState) {
    return <AuthScreen onAuthSuccess={handleAuthSuccess} />;
  }

  return (
    <Dashboard
      uid={authState.uid}
      email={authState.email}
      initialLastHead={authState.lastHead}
    />
  );
}
