import { Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTheme } from "@/components/ThemeProvider"
import React from "react"
import { cn } from "@/lib/utils"

export function ThemeToggle({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  const { setTheme, theme } = useTheme()
  const [isMobile, setIsMobile] = React.useState(false)
  
  // Check if on mobile
  React.useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    
    // Check on mount
    checkIsMobile()
    
    // Add resize listener
    window.addEventListener('resize', checkIsMobile)
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', checkIsMobile)
    }
  }, [])

  return (
    <div className={cn("flex items-center", className)} {...props}>
      <Button
        variant="ghost"
        size={isMobile ? "xs" : "icon"}
        className={`rounded-md ${isMobile ? 'w-7 h-7 p-0.5' : 'w-10 h-10'}`}
        onClick={() => setTheme(theme === "light" ? "dark" : "light")}
      >
        <Sun className={cn("h-[1.1rem] w-[1.1rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0", isMobile && "h-[0.9rem] w-[0.9rem]")} />
        <Moon className={cn("absolute h-[1.1rem] w-[1.1rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100", isMobile && "h-[0.9rem] w-[0.9rem]")} />
        <span className="sr-only">Toggle theme</span>
      </Button>
    </div>
  )
}
