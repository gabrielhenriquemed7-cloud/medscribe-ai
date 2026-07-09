import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./AppLayout.css";

const PAPEL_LABEL = {
  admin: "Admin",
  medico: "Médico",
  recepcao: "Recepção",
};

const icons = {
  inicio: (
    <path d="M5 12H3l9-9 9 9h-2M5 12v7a1 1 0 0 0 1 1h3v-5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v5h3a1 1 0 0 0 1-1v-7" />
  ),
  consultas: (
    <>
      <path d="M6 4h11a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-3l-3 3-3-3H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" />
      <path d="M8 9h8M8 13h5" />
    </>
  ),
  agenda: (
    <>
      <rect x="4" y="5" width="16" height="16" rx="2" />
      <path d="M16 3v4M8 3v4M4 11h16" />
    </>
  ),
  pacientes: (
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20c0-3 2.7-5 6-5s6 2 6 5" />
      <path d="M16 3.5a3 3 0 0 1 0 5.8M21 20c0-2.4-1.3-4.2-3.5-4.8" />
    </>
  ),
  protocolos: (
    <>
      <path d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />
      <path d="M13 3v5h5M9 13h6M9 17h6" />
    </>
  ),
  scores: (
    <>
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="M9 7h6M8 12h.01M12 12h.01M16 12h.01M8 16h.01M12 16h.01M16 16h.01" />
    </>
  ),
  clinica: (
    <>
      <path d="M4 21V7l8-4 8 4v14" />
      <path d="M4 21h16M12 9v4M10 11h4M9 21v-4h6v4" />
    </>
  ),
  sair: (
    <>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5M21 12H9" />
    </>
  ),
};

function Icon({ name }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {icons[name]}
    </svg>
  );
}

export function AppLayout({ children }) {
  const { medico, papel, signOut } = useAuth();

  const items = [
    { to: "/inicio", label: "Início", icon: "inicio" },
    { to: "/consultas", label: "Consultas", icon: "consultas" },
    { to: "/agenda", label: "Agenda", icon: "agenda" },
    { to: "/pacientes", label: "Pacientes", icon: "pacientes" },
    { to: "/protocolos", label: "Protocolos", icon: "protocolos" },
    { to: "/scores", label: "Scores", icon: "scores" },
  ];
  if (papel === "admin") {
    items.push({ to: "/clinica", label: "Clínica", icon: "clinica" });
  }

  const iniciais = (medico?.nome || "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="brand-dot" />
          <span className="brand-name">MedScribe</span>
        </div>

        <nav className="sidebar-nav">
          {items.map((it) => (
            <NavLink
              key={it.to}
              to={it.to}
              className={({ isActive }) =>
                "nav-item" + (isActive ? " active" : "")
              }
            >
              <Icon name={it.icon} />
              <span>{it.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-foot">
          <div className="user-chip">
            <span className="user-avatar">{iniciais}</span>
            <span className="user-meta">
              <span className="user-name">{medico?.nome || "Usuário"}</span>
              <span className="user-role">{PAPEL_LABEL[papel] || "—"}</span>
            </span>
          </div>
          <button className="nav-item nav-signout" onClick={signOut}>
            <Icon name="sair" />
            <span>Sair</span>
          </button>
        </div>
      </aside>

      <main className="app-main">{children}</main>
    </div>
  );
}
