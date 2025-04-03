import { Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTheme } from "@/components/ThemeProvider"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={() => setTheme(theme === "light" ? "dark" : "light")}
      className="border-purple-300/50 hover:bg-purple-50/50 dark:border-white/20 dark:hover:bg-white/10 backdrop-blur-sm"
      aria-label="Toggle theme"
    >
      {theme === "light" ? (
        <Moon className="h-[1.2rem] w-[1.2rem] text-purple-800 dark:text-white/90" />
      ) : (
        <Sun className="h-[1.2rem] w-[1.2rem] text-purple-800 dark:text-white/90" />
      )}
    </Button>
  )
}
