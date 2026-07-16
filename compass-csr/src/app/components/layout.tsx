import { useState, useEffect } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router";
import {
  LayoutDashboard,
  PlusCircle,
  FolderKanban,
  Heart,
  Users,
  Settings as SettingsIcon,
  Compass as CompassIcon,
  FileBarChart,
  ClipboardList,
  CalendarRange,
  LogOut,
} from "lucide-react";
import { Avatar, AvatarFallback } from "./ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { initials } from "../lib/team";
import { useAuth } from "../context/auth-context";

const navItems = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
  { path: "/new-program", label: "New Program", icon: PlusCircle },
  { path: "/my-programs", label: "My Programs", icon: FolderKanban },
  { path: "/my-tasks", label: "My Tasks", icon: ClipboardList },
  { path: "/weekly-digest", label: "Weekly Digest", icon: CalendarRange },
  { path: "/nonprofit-partners", label: "Nonprofit Partners", icon: Heart },
  { path: "/impact-report", label: "Impact Report", icon: FileBarChart },
  { path: "/team", label: "Team", icon: Users },
  { path: "/settings", label: "Settings", icon: SettingsIcon },
];

type UserRole = "Admin" | "Member";
const USER_ROLE_KEY = "compass_user_role_v1";

function getUserRole(): UserRole {
  try {
    const raw = localStorage.getItem(USER_ROLE_KEY);
    return raw === "Member" ? "Member" : "Admin";
  } catch {
    return "Admin";
  }
}

export function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { company, userProfile, user, signOut } = useAuth();
  const companyName = company?.name?.trim() || "Your Company";
  const displayName = userProfile?.full_name?.trim() || user?.email || "Account";
  const [role, setRole] = useState<UserRole>(getUserRole);

  useEffect(() => {
    function handleUpdate() {
      setRole(getUserRole());
    }
    window.addEventListener("compass-settings-updated", handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener("compass-settings-updated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  const visibleNavItems = role === "Member" ? navItems.filter((item) => item.path !== "/new-program") : navItems;

  async function handleSignOut() {
    await signOut();
    navigate("/signin");
  }

  return (
    <div className="flex h-screen w-full bg-background">
      {/* Sidebar */}
      <aside className="w-64 border-r border-sidebar-border bg-sidebar flex flex-col">
        {/* Logo */}
        <div className="h-16 flex items-center gap-2 px-6 border-b border-sidebar-border">
          <CompassIcon className="h-7 w-7 text-primary" />
          <span className="text-xl font-semibold text-foreground">Compass</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {visibleNavItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors
                  ${isActive 
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground' 
                    : 'text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground'
                  }
                `}
              >
                <Icon className="h-5 w-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 border-b border-border bg-card flex items-center justify-between px-8">
          <div className="flex items-center gap-4">
            <h1 className="text-lg text-foreground">{companyName}</h1>
            {role === "Admin" && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                Admin
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button type="button" className="rounded-full outline-none" aria-label="Account menu">
                  <Avatar className="cursor-pointer">
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {initials(displayName)}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <p className="text-sm font-medium text-foreground truncate">{displayName}</p>
                  {user?.email && (
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  )}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/settings">
                    <SettingsIcon className="h-4 w-4" /> Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => void handleSignOut()} className="text-destructive focus:text-destructive">
                  <LogOut className="h-4 w-4" /> Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
