"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Search, Loader2, X, ArrowRight } from "lucide-react"
import { Input } from "@/components/ui/input"
import Image from "next/image"
import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface SearchBarProps {
  placeholder?: string
  fullWidth?: boolean
  className?: string
}

// Define the model search result type
interface ModelResult {
  id: string
  name: string
  modelType: string
  baseModel: string
  downloads: number
  user: {
    id: string
    name: string
    image: string | null
  }
  images: {
    url: string
    isNsfw: boolean
  }[]
}

export function SearchBar({ 
  placeholder = "Search models...", 
  fullWidth = false,
  className = ""
}: SearchBarProps) {
  const [query, setQuery] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const [searchResults, setSearchResults] = useState<ModelResult[]>([])
  const [showResults, setShowResults] = useState(false)
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const resultsRef = useRef<HTMLDivElement>(null)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [])

  // Handle click outside to close results
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        resultsRef.current && 
        !resultsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowResults(false)
      }
    }
    
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Fetch search results from API
  const fetchSearchResults = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setSearchResults([])
      setIsLoading(false)
      return
    }
    
    try {
      setIsLoading(true)
      const response = await fetch(`/api/searchmodel?query=${encodeURIComponent(searchQuery.trim())}`)
      const data = await response.json()
      setSearchResults(data.models || [])
    } catch (error) {
      console.error("Error fetching search results:", error)
      setSearchResults([])
    } finally {
      setIsLoading(false)
    }
  }

  // Handle search input changes
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setQuery(value)
    
    // Clear any existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }
    
    // Set a new timeout to fetch results
    if (value.trim()) {
      setIsLoading(true)
      searchTimeoutRef.current = setTimeout(() => {
        fetchSearchResults(value)
        setShowResults(true)
      }, 300)
    } else {
      setSearchResults([])
      setIsLoading(false)
      setShowResults(false)
    }
  }

  const handleSearch = () => {
    if (query.trim()) {
      setShowResults(false)
      router.push(`/model?search=${encodeURIComponent(query.trim())}`)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch()
    }
  }
  const clearSearch = () => {
    setQuery("")
    setSearchResults([])
    setShowResults(false)
    inputRef.current?.focus()
  };
  
  return (
    <div 
      className={`relative ${fullWidth ? 'w-full' : 'w-60 md:w-72'} ${className}`}
    >
      <div 
        className={`relative flex items-center rounded-md ${isFocused ? 'ring-1 ring-primary shadow-sm' : 'ring-1 ring-border hover:ring-border'} transition-all duration-200`}
      >
        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
          <Search className="h-4 w-4 text-muted-foreground" />
        </div>
          <Input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleSearchChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="pl-10 pr-10 h-10 bg-background border-0 ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none"
          style={{boxShadow: 'none'}}
          onFocus={() => { setIsFocused(true); if (query && searchResults.length) setShowResults(true); }}
          onBlur={() => setIsFocused(false)}
        />
        
        <div className="absolute inset-y-0 right-0 flex items-center pr-3">
          {isLoading ? (
            <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />
          ) : query ? (
            <button onClick={clearSearch} className="focus:outline-none">
              <X className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
            </button>
          ) : null}
        </div>
      </div>

      {/* Search Results Dropdown */}
      {showResults && (query || isLoading) && (
        <div 
          ref={resultsRef}
          className="absolute z-50 mt-2 w-full bg-background rounded-md shadow-lg border border-border/50 overflow-hidden max-h-[60vh] overflow-y-auto"
        >
          {isLoading ? (
            // Loading Skeletons
            <div className="p-2 space-y-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-2 rounded-md animate-pulse">
                  <div className="w-12 h-12 rounded-md bg-muted shrink-0"></div>
                  <div className="space-y-2 w-full">
                    <div className="h-4 bg-muted rounded w-3/4"></div>
                    <div className="h-3 bg-muted rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : searchResults.length ? (
            <div>
              <div className="p-3">
                <h4 className="text-sm font-medium text-foreground">Search Results</h4>
              </div>
              {searchResults.map((model) => (
                <Link 
                  href={`/model/${model.id}`} 
                  key={model.id}
                  className="flex items-center gap-3 p-2 hover:bg-muted transition-colors cursor-pointer"
                  onClick={() => setShowResults(false)}
                >
                  <div className="relative w-12 h-12 rounded-md overflow-hidden bg-muted shrink-0">
                    {model.images && model.images.length > 0 ? (
                      <Image
                        src={model.images[0].url}
                        alt={model.name}
                        fill
                        sizes="48px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 flex items-center justify-center bg-muted text-muted-foreground">
                        <Search className="h-5 w-5" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{model.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {model.baseModel} • {model.modelType}
                    </p>
                  </div>
                </Link>
              ))}
              
              {/* View All Results Button */}
              <div className="border-t border-border/50 p-2">
                <button
                  onClick={handleSearch}
                  className="flex items-center justify-between w-full p-2 rounded-md hover:bg-muted transition-colors text-sm font-medium"
                >
                  <span>View all results</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="p-4 text-center">
              <p className="text-sm text-muted-foreground">No models found</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}