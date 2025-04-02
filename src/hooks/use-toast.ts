
import { toast as sonnerToast } from "sonner"

type ToastProps = {
  title?: string
  description?: string
  variant?: "default" | "destructive"
  [key: string]: any
}

export function toast({ title, description, variant = "default", ...props }: ToastProps) {
  return sonnerToast(title, {
    description,
    ...props,
    className: variant === "destructive" ? "destructive" : "",
  })
}

export const useToast = () => {
  return {
    toast,
    // For compatibility with existing code that expects this structure
    toasts: [] as any[],
    dismiss: () => {},
  }
}
