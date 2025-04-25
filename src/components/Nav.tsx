"use client"

import Link from "next/link"
import { useState, useEffect } from "react"
import Image from "next/image"
import { usePathname, useRouter } from "next/navigation"
import { Menu, X, User, LogOut, Settings, Plus, Upload, FileUp, FileCode, Shapes, Image as ImageIcon } from "lucide-react" // Added Shapes and ImageIcon
import SignIn from "@/components/auth/sign-in"
import SignUp from "@/components/auth/sign-up"
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog"
import { authClient } from "@/lib/auth-client"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

// Define navigation items including Model and Image
const navigation = [
  { name: "Models", href: "/models", icon: Shapes }, // Added Models
  { name: "Images", href: "/images", icon: ImageIcon }, // Added Images
  // { name: "Features", href: "/features" },
  // { name: "Pricing", href: "/pricing" },
  // { name: "About", href: "/about" },
]

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [showSignIn, setShowSignIn] = useState(false)
  const [showSignUp, setShowSignUp] = useState(false)
  const pathname = usePathname()
  const router = useRouter()

  // Get user session
  const { data: session, isPending } = authClient.useSession()

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10)
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  // Handle sign out
  const handleSignOut = async () => {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          router.push("/")
        }
      }
    })
  }

  // Listen for custom events to open sign-in/sign-up dialogs
  useEffect(() => {
    const openSignIn = () => setShowSignIn(true)
    const openSignUp = () => setShowSignUp(true)
    const closeSignIn = () => setShowSignIn(false)
    const closeSignUp = () => setShowSignUp(false)

    window.addEventListener('openSignIn', openSignIn)
    window.addEventListener('openSignUp', openSignUp)
    window.addEventListener('closeSignIn', closeSignIn)
    window.addEventListener('closeSignUp', closeSignUp)

    return () => {
      window.removeEventListener('openSignIn', openSignIn)
      window.removeEventListener('openSignUp', openSignUp)
      window.removeEventListener('closeSignIn', closeSignIn)
      window.removeEventListener('closeSignUp', closeSignUp)
    }
  }, [])

  // Function to navigate to user dashboard
  const goToDashboard = () => {
    if (session?.user?.id) {
      router.push(`/user/${session.user.id}`);
    }
  };

  return (
    <nav className={`sticky top-0 z-40 w-full ${
      scrolled
        ? "bg-background/95 backdrop-blur-sm shadow-sm"
        : "bg-background"
      } transition-all duration-200 border-b border-border/40`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo/Brand */}
          <div className="flex-shrink-0 flex items-center">
            <Link href="/" className="flex items-center space-x-2">
              <span className="text-xl font-bold text-primary">MiyukiAI</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-4"> {/* Un-commented this section */}
            <div className="flex items-center space-x-1"> {/* Reduced space for tighter look */}
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    pathname.startsWith(item.href) // Use startsWith for active state on sub-paths
                      ? "bg-muted text-foreground font-semibold" // Adjusted active style
                      : "text-foreground/70 hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <item.icon className="mr-1.5 h-4 w-4" /> {/* Added icon */}
                  {item.name}
                </Link>
              ))}
            </div>
          </div>

          {/* Auth Buttons or User Menu with Create Button */}
          <div className="hidden md:flex items-center space-x-3">
            {isPending ? (
              <div className="h-8 w-20 bg-muted animate-pulse rounded-md"></div>
            ) : session ? (
              <>
                {/* Create Button - Only shown when logged in */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium text-foreground/70 hover:bg-secondary hover:text-foreground transition-colors">
                      <Plus className="h-4 w-4 mr-1" />
                      Create
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => router.push("/upload/model")}>
                      <FileCode className="mr-2 h-4 w-4" />
                      <span>Upload Model</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => router.push("/upload/lora")}>
                      <FileUp className="mr-2 h-4 w-4" />
                      <span>Upload LoRA</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* User Avatar */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center space-x-2 rounded-full focus:outline-none focus:ring-2 focus:ring-primary">
                      <Avatar className="h-8 w-8">
                        {session.user.image ? (
                          <AvatarImage
                            src={session.user.image}
                            alt={session.user.name || "User"}
                          />
                        ) : (
                          <AvatarFallback>
                            {(session.user.name?.charAt(0) || "U").toUpperCase()}
                          </AvatarFallback>
                        )}
                      </Avatar>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <div className="flex items-center justify-start gap-2 p-2">
                      <div className="flex flex-col space-y-0.5">
                        <p className="text-sm font-medium">{session.user.name}</p>
                        <p className="text-xs text-muted-foreground">{session.user.email}</p>
                      </div>
                    </div>
                    <DropdownMenuSeparator />
                    {/* Updated Dashboard Link */}
                    <DropdownMenuItem onClick={goToDashboard} disabled={!session?.user?.id}>
                      <User className="mr-2 h-4 w-4" />
                      <span>Dashboard</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => router.push("/settings")}>
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Settings</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut}>
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Log out</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <div className="flex items-center space-x-3">
                <Dialog open={showSignIn} onOpenChange={setShowSignIn}>
                  <DialogTrigger asChild>
                    <button
                      className="px-3 py-2 rounded-md text-sm font-medium text-foreground/70 hover:text-foreground"
                    >
                      Login
                    </button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <SignIn />
                  </DialogContent>
                </Dialog>

                <Dialog open={showSignUp} onOpenChange={setShowSignUp}>
                  <DialogTrigger asChild>
                    <button
                      className="px-4 py-2 rounded-full text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                    >
                      Sign Up
                    </button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <SignUp />
                  </DialogContent>
                </Dialog>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
             {/* Mobile Create Button (if logged in) */}
             {session && !isPending && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="p-2 rounded-md text-foreground/70 hover:text-foreground hover:bg-secondary focus:outline-none mr-2">
                    <Plus className="h-6 w-6" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => { router.push("/upload/model"); setIsOpen(false); }}>
                    <FileCode className="mr-2 h-4 w-4" />
                    <span>Upload Model</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { router.push("/upload/lora"); setIsOpen(false); }}>
                    <FileUp className="mr-2 h-4 w-4" />
                    <span>Upload LoRA</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            {/* Mobile User Avatar (if logged in) */}
            {session && !isPending && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center space-x-2 rounded-full focus:outline-none focus:ring-2 focus:ring-primary mr-2">
                    <Avatar className="h-8 w-8">
                      {session.user.image ? (
                        <AvatarImage
                          src={session.user.image}
                          alt={session.user.name || "User"}
                        />
                      ) : (
                        <AvatarFallback>
                          {(session.user.name?.charAt(0) || "U").toUpperCase()}
                        </AvatarFallback>
                      )}
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="flex items-center justify-start gap-2 p-2">
                    <div className="flex flex-col space-y-0.5">
                      <p className="text-sm font-medium">{session.user.name}</p>
                      <p className="text-xs text-muted-foreground">{session.user.email}</p>
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => { goToDashboard(); setIsOpen(false); }} disabled={!session?.user?.id}>
                    <User className="mr-2 h-4 w-4" />
                    <span>Dashboard</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { router.push("/settings"); setIsOpen(false); }}>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => { handleSignOut(); setIsOpen(false); }}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            {/* Hamburger Menu */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-foreground/70 hover:text-foreground hover:bg-secondary focus:outline-none"
              aria-expanded="false"
            >
              <span className="sr-only">Open main menu</span>
              {isOpen ? (
                <X className="block h-6 w-6" aria-hidden="true" />
              ) : (
                <Menu className="block h-6 w-6" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu, show/hide based on menu state */}
      {isOpen && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 border-t border-border/40">
            {/* Mobile Navigation Links */}
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center px-3 py-2 rounded-md text-base font-medium ${ // Added flex items-center
                  pathname.startsWith(item.href)
                    ? "bg-muted text-foreground font-semibold" // Adjusted active style
                    : "text-foreground/70 hover:bg-muted hover:text-foreground"
                }`}
                onClick={() => setIsOpen(false)}
              >
                <item.icon className="mr-2 h-5 w-5" /> {/* Added icon */}
                {item.name}
              </Link>
            ))}

            {/* Separator if user is not logged in and navigation exists */}
            {!session && !isPending && navigation.length > 0 && (
              <div className="pt-2 pb-1 border-t border-border/40"></div>
            )}

            {/* Mobile Auth Buttons (if not logged in) */}
            {!session && !isPending && (
              <div className="flex items-center justify-around pt-2">
                <Dialog open={showSignIn} onOpenChange={setShowSignIn}>
                  <DialogTrigger asChild>
                    <button
                      className="flex-1 py-2 rounded-md text-base font-medium text-foreground/70 hover:bg-secondary hover:text-foreground"
                      onClick={() => setIsOpen(false)}
                    >
                      Login
                    </button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <SignIn />
                  </DialogContent>
                </Dialog>

                <Dialog open={showSignUp} onOpenChange={setShowSignUp}>
                  <DialogTrigger asChild>
                    <button
                      className="flex-1 py-2 rounded-full text-base font-medium bg-primary text-primary-foreground hover:bg-primary/90"
                      onClick={() => setIsOpen(false)}
                    >
                      Sign Up
                    </button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <SignUp />
                  </DialogContent>
                </Dialog>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}