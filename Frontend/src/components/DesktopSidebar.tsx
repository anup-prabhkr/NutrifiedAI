import React from "react";
import { Home, BarChart3, User, LogOut, Sun, Moon } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";

const tabs = [
  { icon: Home, label: "Home", path: "/" },
  { icon: BarChart3, label: "Analytics", path: "/analytics" },
  { icon: User, label: "Profile", path: "/profile" },
];

const DesktopSidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, user } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const handleLogout = async () => {
    if (!window.confirm("Are you sure you want to sign out?")) return;
    await logout();
    navigate("/login");
  };

  return (
    <aside className="fixed left-0 top-0 z-50 hidden h-full w-56 flex-col border-r border-border bg-card/95 backdrop-blur-lg lg:flex">
      <div className="px-5 py-6">
        <h1 className="text-lg font-bold text-primary">NutrifiedAI</h1>
        <p className="text-[10px] text-muted-foreground">AI Nutrition Tracker</p>
      </div>
      <nav className="flex flex-1 flex-col gap-1 px-3">
        {tabs.map(({ icon: Icon, label, path }) => {
          const active = location.pathname === path;
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
            >
              <Icon size={18} />
              {label}
            </button>
          );
        })}
      </nav>
      <div className="border-t border-border px-3 py-4">
        <div className="mb-2 px-3 text-xs text-muted-foreground truncate">
          {user?.email}
        </div>
        <button
          onClick={toggleTheme}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          {theme === "dark" ? "Light Mode" : "Dark Mode"}
        </button>
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <LogOut size={18} />
          Sign Out
        </button>
      </div>
    </aside>
  );
};

export default DesktopSidebar;
