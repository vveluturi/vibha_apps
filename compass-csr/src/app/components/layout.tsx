import { Outlet, Link, useLocation } from "react-router";
import { 
  LayoutDashboard, 
  PlusCircle, 
  FolderKanban, 
  Heart, 
  Users, 
  Settings as SettingsIcon,
  Compass as CompassIcon
} from "lucide-react";
import { Avatar, AvatarFallback } from "./ui/avatar";

const navItems = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
  { path: "/new-program", label: "New Program", icon: PlusCircle },
  { path: "/my-programs", label: "My Programs", icon: FolderKanban },
  { path: "/nonprofit-partners", label: "Nonprofit Partners", icon: Heart },
  { path: "/team", label: "Team", icon: Users },
  { path: "/settings", label: "Settings", icon: SettingsIcon },
];

export function Layout() {
  const location = useLocation();

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
          {navItems.map((item) => {
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
            <h1 className="text-lg text-foreground">Acme Corporation</h1>
          </div>
          
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarFallback className="bg-primary text-primary-foreground">
                AC
              </AvatarFallback>
            </Avatar>
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
