"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "@/contexts/theme-provider";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Search,
  Bell,
  MessageSquare,
  Moon,
  Sun,
  LogOut,
  User,
  Settings,
  KeyRound,
  Plus,
  Check,
  ChevronDown,
  X,
} from "lucide-react";
import { notifications, students, faculty } from "@/lib/data";

const quickActions = [
  { label: "Add Student", icon: User, href: "/students" },
  { label: "Mark Attendance", icon: Check, href: "/attendance" },
  { label: "Create Assignment", icon: Plus, href: "/assignments" },
];

const searchGroups = [
  { title: "Students", items: students.slice(0, 5).map(s => ({ label: s.name, sub: `${s.course} — ${s.rollNumber}`, href: `/students/${s.id}` })) },
  { title: "Faculty", items: faculty.slice(0, 5).map(f => ({ label: f.name, sub: f.department, href: `/faculty/${f.id}` })) },
  { title: "Pages", items: [
    { label: "Dashboard", sub: "Overview", href: "/dashboard" },
    { label: "Attendance", sub: "Mark attendance", href: "/attendance" },
    { label: "Examinations", sub: "Exam schedules", href: "/exams" },
    { label: "Fees & Finance", sub: "Fee management", href: "/fees" },
    { label: "Library", sub: "Book catalog", href: "/library" },
    { label: "Reports", sub: "Analytics & reports", href: "/reports" },
  ]},
];

export function TopNavbar() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const { user, logout } = useAuth();
  const router = useRouter();
  const [commandOpen, setCommandOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCommandOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-6">
        <div className="flex-1 flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            className="hidden md:flex items-center gap-2 text-muted-foreground max-w-sm"
            onClick={() => setCommandOpen(true)}
          >
            <Search className="h-4 w-4" />
            <span className="flex-1 text-left text-sm">Search...</span>
            <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
              ⌘K
            </kbd>
          </Button>
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setCommandOpen(true)}>
            <Search className="h-4 w-4" />
          </Button>

          <div className="hidden lg:flex items-center gap-2">
            <Badge variant="outline" className="text-xs">2026-27</Badge>
            <Badge variant="secondary" className="text-xs">Odd Semester</Badge>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="relative" onClick={() => setNotificationsOpen(!notificationsOpen)}>
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-destructive text-[10px] text-destructive-foreground flex items-center justify-center font-medium">
                {unreadCount}
              </span>
            )}
          </Button>

          <Button variant="ghost" size="icon" className="hidden sm:flex" onClick={() => router.push("/messages")}>
            <MessageSquare className="h-4 w-4" />
          </Button>

          <Button variant="ghost" size="icon" onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}>
            {resolvedTheme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>

          <Separator orientation="vertical" className="h-6 mx-1 hidden sm:block" />

          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-2 px-2 rounded-lg hover:bg-muted transition-colors">
              <Avatar className="h-7 w-7">
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                  {user?.name?.split(" ").map(n => n[0]).join("").slice(0, 2) || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="hidden md:block text-left">
                <div className="text-sm font-medium leading-none">{user?.name || "User"}</div>
                <div className="text-xs text-muted-foreground capitalize mt-0.5">{user?.role?.replace(/_/g, " ") || "Role"}</div>
              </div>
              <ChevronDown className="h-3 w-3 text-muted-foreground hidden md:block" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push("/settings")}>
                <User className="mr-2 h-4 w-4" />Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push("/change-password")}>
                <KeyRound className="mr-2 h-4 w-4" />Change Password
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push("/settings")}>
                <Settings className="mr-2 h-4 w-4" />Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => { logout(); router.push("/login"); }} variant="destructive">
                <LogOut className="mr-2 h-4 w-4" />Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Command Palette */}
      <Dialog open={commandOpen} onOpenChange={setCommandOpen}>
        <DialogContent className="p-0 max-w-lg">
          <Command>
            <CommandInput placeholder="Search students, faculty, pages..." />
            <CommandList>
              <CommandEmpty>No results found.</CommandEmpty>
              {searchGroups.map(group => (
                <CommandGroup key={group.title} heading={group.title}>
                  {group.items.map(item => (
                    <CommandItem
                      key={item.href}
                      onSelect={() => { router.push(item.href); setCommandOpen(false); }}
                      className="cursor-pointer"
                    >
                      <div>
                        <div className="font-medium">{item.label}</div>
                        <div className="text-xs text-muted-foreground">{item.sub}</div>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              ))}
              <CommandGroup heading="Quick Actions">
                {quickActions.map(action => (
                  <CommandItem
                    key={action.href}
                    onSelect={() => { router.push(action.href); setCommandOpen(false); }}
                    className="cursor-pointer"
                  >
                    <action.icon className="mr-2 h-4 w-4" />
                    {action.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>

      {/* Notification Panel */}
      {notificationsOpen && (
        <>
          <div className="fixed inset-0 z-50" onClick={() => setNotificationsOpen(false)} />
          <div className="fixed right-4 top-16 z-50 w-80 border rounded-xl bg-background shadow-xl">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-semibold text-sm">Notifications</h3>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setNotificationsOpen(false)}>
                <X className="h-3 w-3" />
              </Button>
            </div>
            <ScrollArea className="max-h-80">
              {notifications.map(n => (
                <div key={n.id} className={`p-3 border-b last:border-0 hover:bg-muted/50 cursor-pointer ${!n.read ? "bg-primary/5" : ""}`}>
                  <div className="flex items-start gap-2">
                    <div className={`h-2 w-2 rounded-full mt-1.5 shrink-0 ${!n.read ? "bg-primary" : "bg-muted"}`} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">{n.title}</div>
                      <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</div>
                      <div className="text-[10px] text-muted-foreground mt-1">{n.date}</div>
                    </div>
                  </div>
                </div>
              ))}
            </ScrollArea>
            <div className="p-2 border-t">
              <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => { setNotificationsOpen(false); router.push("/notices"); }}>
                View All Notifications
              </Button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
