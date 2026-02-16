import { NavLink, Outlet } from "react-router-dom";

const links = [
  { to: "/", label: "Dashboard" },
  { to: "/persons", label: "Persons" },
  { to: "/analyze", label: "Analyze" },
  { to: "/chat", label: "Chat" },
  { to: "/ml", label: "ML Pipeline" },
  { to: "/settings", label: "Settings" },
];

export default function Shell() {
  return (
    <div className="flex h-screen bg-gray-950 text-gray-100">
      <nav className="w-56 shrink-0 border-r border-gray-800 bg-gray-900 flex flex-col">
        <div className="p-4 text-lg font-bold tracking-tight border-b border-gray-800">
          NeuroGateway
        </div>
        <div className="flex-1 py-2">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.to === "/"}
              className={({ isActive }) =>
                `block px-4 py-2 text-sm transition-colors ${
                  isActive
                    ? "bg-indigo-600/20 text-indigo-400 border-r-2 border-indigo-500"
                    : "text-gray-400 hover:text-gray-200 hover:bg-gray-800"
                }`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </div>
        <div className="p-4 text-xs text-gray-600 border-t border-gray-800">
          v0.1.0
        </div>
      </nav>
      <main className="flex-1 overflow-y-auto p-6">
        <Outlet />
      </main>
    </div>
  );
}
