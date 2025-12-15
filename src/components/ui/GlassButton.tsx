import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, forwardRef } from "react";

interface GlassButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'primary' | 'accent' | 'success' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
}

const GlassButton = forwardRef<HTMLButtonElement, GlassButtonProps>(
  ({ className, children, variant = 'default', size = 'md', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "relative inline-flex items-center justify-center gap-2 font-medium transition-all duration-200",
          "backdrop-blur-md rounded-lg border",
          "disabled:opacity-50 disabled:pointer-events-none",
          // Variants
          variant === 'default' && [
            "bg-white/[0.03] border-white/[0.08] text-foreground",
            "hover:bg-white/[0.06] hover:border-white/[0.12] hover:shadow-lg hover:shadow-primary/10",
            "hover:-translate-y-0.5",
          ],
          variant === 'primary' && [
            "bg-primary/20 border-primary/30 text-primary-foreground",
            "hover:bg-primary/30 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/20",
            "hover:-translate-y-0.5",
          ],
          variant === 'accent' && [
            "bg-accent/20 border-accent/30 text-accent",
            "hover:bg-accent/30 hover:border-accent/50 hover:shadow-lg hover:shadow-accent/20",
            "hover:-translate-y-0.5",
          ],
          variant === 'success' && [
            "bg-success/20 border-success/30 text-success",
            "hover:bg-success/30 hover:border-success/50 hover:shadow-lg hover:shadow-success/20",
            "hover:-translate-y-0.5",
          ],
          variant === 'ghost' && [
            "bg-transparent border-transparent text-muted-foreground",
            "hover:bg-white/[0.03] hover:text-foreground",
          ],
          variant === 'outline' && [
            "bg-transparent border-border text-muted-foreground",
            "hover:bg-white/[0.03] hover:text-foreground hover:border-white/[0.15]",
            "hover:-translate-y-0.5",
          ],
          // Sizes
          size === 'sm' && "text-sm px-3 py-1.5",
          size === 'md' && "text-sm px-4 py-2",
          size === 'lg' && "text-base px-6 py-3",
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

GlassButton.displayName = "GlassButton";

export { GlassButton };
