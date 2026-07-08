import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Login } from "./pages/Login";
import { Consultas } from "./pages/Consultas";
import { Consentimento } from "./pages/Consentimento";
import { Gravacao } from "./pages/Gravacao";
import { Anamnese } from "./pages/Anamnese";
import { Paciente } from "./pages/Paciente";
import { Protocolos } from "./pages/Protocolos";
import { Scores } from "./pages/Scores";
import { Agenda } from "./pages/Agenda";

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/consultas"
            element={
              <ProtectedRoute>
                <Consultas />
              </ProtectedRoute>
            }
          />
          <Route
            path="/consulta/:id/consentimento"
            element={
              <ProtectedRoute>
                <Consentimento />
              </ProtectedRoute>
            }
          />
          <Route
            path="/consulta/:id/gravacao"
            element={
              <ProtectedRoute>
                <Gravacao />
              </ProtectedRoute>
            }
          />
          <Route
            path="/consulta/:id/anamnese"
            element={
              <ProtectedRoute>
                <Anamnese />
              </ProtectedRoute>
            }
          />
          <Route
            path="/paciente/:id"
            element={
              <ProtectedRoute>
                <Paciente />
              </ProtectedRoute>
            }
          />
          <Route
            path="/protocolos"
            element={
              <ProtectedRoute>
                <Protocolos />
              </ProtectedRoute>
            }
          />
          <Route
            path="/scores"
            element={
              <ProtectedRoute>
                <Scores />
              </ProtectedRoute>
            }
          />
          <Route
            path="/agenda"
            element={
              <ProtectedRoute>
                <Agenda />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/consultas" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
