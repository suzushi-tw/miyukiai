"use client"

import Link from "next/link"
import { useState, useEffect } from "react"
import Image from "next/image"
import { usePathname, useRouter } from "next/navigation"
import {
  Menu, X, User, LogOut, Settings, Plus, Eye, EyeOff,
  Upload, FileUp, FileCode, Shapes, Image as ImageIcon
} from "lucide-react"
import SignIn from "@/components/auth/sign-in"
import SignUp from "@/components/auth/sign-up"
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog"
import { authClient } from "@/lib/auth-client"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { SearchBar } from "@/components/SearchBar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useNsfwStore } from "@/utils/nsfwstate"

const navigation = [
  { name: "Models", href: "/model", icon: Shapes },
  { name: "Images", href: "/images", icon: ImageIcon },
]

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [showSignIn, setShowSignIn] = useState(false)
  const [showSignUp, setShowSignUp] = useState(false)
  const pathname = usePathname()
  const router = useRouter()

  const { showNsfwContent, toggleNsfwVisibility } = useNsfwStore()

  const { data: session, isPending } = authClient.useSession()

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10)
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const handleSignOut = async () => {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          router.push("/")
        }
      }
    })
  }

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

  const goToDashboard = () => {
    if (session?.user?.id) {
      router.push(`/dashboard`);
    }
  };

  return (
    <nav className={`sticky top-0 z-40 w-full ${scrolled
      ? "bg-background/95 backdrop-blur-sm shadow-sm"
      : "bg-background"
      } transition-all duration-200 border-b border-border/40`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-3 items-center h-16">
          
          <div className="flex items-center space-x-6">
            <Link href="/" className="flex items-center space-x-2 flex-shrink-0">
              <span className="text-xl font-bold text-primary">MiyukiAI</span>
            </Link>

            <div className="hidden lg:flex items-center space-x-1">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    pathname.startsWith(item.href)
                      ? "bg-muted text-foreground font-semibold"
                      : "text-foreground/70 hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <item.icon className="mr-1.5 h-4 w-4" />
                  {item.name}
                </Link>
              ))}
            </div>
          </div>

          <div className="hidden md:flex items-center justify-center">
            <SearchBar className="w-full max-w-lg" />
          </div>

          <div className="flex items-center justify-end space-x-2">
            <div className="hidden md:flex items-center space-x-2">
              <button
                onClick={toggleNsfwVisibility}
                className={`p-2 rounded-md text-sm font-medium transition-colors ${
                  showNsfwContent
                    ? "bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50"
                    : "text-foreground/70 hover:bg-secondary hover:text-foreground"
                }`}
                title={showNsfwContent ? "Hide NSFW content" : "Show NSFW content"}
              >
                {showNsfwContent ? (
                  <Eye className="h-4 w-4" />
                ) : (
                  <EyeOff className="h-4 w-4" />
                )}
              </button>

              {isPending ? (
                <div className="flex items-center space-x-2">
                  <div className="h-8 w-8 bg-muted animate-pulse rounded-md"></div>
                  <div className="h-8 w-8 bg-muted animate-pulse rounded-full"></div>
                </div>
              ) : session ? (
                <div className="flex items-center space-x-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="p-2 rounded-md text-foreground/70 hover:bg-secondary hover:text-foreground transition-colors">
                        <Plus className="h-4 w-4" />
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
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <Dialog open={showSignIn} onOpenChange={setShowSignIn}>
                    <DialogTrigger asChild>
                      <button className="px-3 py-1.5 rounded-md text-sm font-medium text-foreground/70 hover:text-foreground">
                        Login
                      </button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <SignIn />
                    </DialogContent>
                  </Dialog>

                  <Dialog open={showSignUp} onOpenChange={setShowSignUp}>
                    <DialogTrigger asChild>
                      <button className="px-3 py-1.5 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
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

            <div className="md:hidden flex items-center space-x-2">
              <button
                onClick={toggleNsfwVisibility}
                className={`p-2 rounded-md transition-colors ${
                  showNsfwContent
                    ? "bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400"
                    : "text-foreground/70 hover:text-foreground hover:bg-secondary"
                }`}
                title={showNsfwContent ? "Hide NSFW content" : "Show NSFW content"}
              >
                {showNsfwContent ? (
                  <Eye className="h-5 w-5" />
                ) : (
                  <EyeOff className="h-5 w-5" />
                )}
              </button>

              {session && !isPending && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="p-2 rounded-md text-foreground/70 hover:text-foreground hover:bg-secondary focus:outline-none">
                      <Plus className="h-5 w-5" />
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

              {session && !isPending && (
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

              <button
                onClick={() => setIsOpen(!isOpen)}
                className="p-2 rounded-md text-foreground/70 hover:text-foreground hover:bg-secondary focus:outline-none"
                aria-expanded="false"
              >
                <span className="sr-only">Open main menu</span>
                {isOpen ? (
                  <X className="h-5 w-5" />
                ) : (
                  <Menu className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {isOpen && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 border-t border-border/40">
            <div className="px-3 py-2">
              <SearchBar fullWidth={true} placeholder="Search models..." />
            </div>

            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center px-3 py-2 rounded-md text-base font-medium ${
                  pathname.startsWith(item.href)
                    ? "bg-muted text-foreground font-semibold"
                    : "text-foreground/70 hover:bg-muted hover:text-foreground"
                }`}
                onClick={() => setIsOpen(false)}
              >
                <item.icon className="mr-2 h-5 w-5" />
                {item.name}
              </Link>
            ))}

            <button
              onClick={() => {
                toggleNsfwVisibility();
                setIsOpen(false);
              }}
              className={`flex items-center w-full px-3 py-2 rounded-md text-base font-medium transition-colors ${
                showNsfwContent
                  ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                  : "text-foreground/70 hover:bg-muted hover:text-foreground"
              }`}
            >
              {showNsfwContent ? (
                <Eye className="mr-2 h-5 w-5" />
              ) : (
                <EyeOff className="mr-2 h-5 w-5" />
              )}
              {showNsfwContent ? "Hide NSFW Content" : "Show NSFW Content"}
            </button>

            {!session && !isPending && (
              <>
                <div className="pt-2 pb-1 border-t border-border/40"></div>
                <div className="flex items-center justify-around pt-2 space-x-3">
                  <Dialog open={showSignIn} onOpenChange={setShowSignIn}>
                    <DialogTrigger asChild>
                      <button
                        className="flex-1 py-2 px-4 rounded-md text-base font-medium text-foreground/70 hover:bg-secondary hover:text-foreground border border-border"
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
                        className="flex-1 py-2 px-4 rounded-md text-base font-medium bg-primary text-primary-foreground hover:bg-primary/90"
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
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}