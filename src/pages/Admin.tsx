import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/hooks/use-toast"
import { useState } from "react"

const Admin = () => {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!imageFile) {
      toast({
        title: "Error",
        description: "Please select an image to upload",
        variant: "destructive",
      })
      return
    }

    setIsUploading(true)
    
    try {
      // TODO: Implement actual upload logic when backend is connected
      console.log("Uploading:", { title, description, imageFile })
      
      toast({
        title: "Success",
        description: "Wallpaper uploaded successfully!",
      })
      
      // Reset form
      setTitle("")
      setDescription("")
      setImageFile(null)
      
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to upload wallpaper",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Upload Wallpaper</h1>
      
      <form onSubmit={handleSubmit} className="max-w-xl space-y-6">
        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter wallpaper title"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Enter wallpaper description"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="image">Image</Label>
          <Input
            id="image"
            type="file"
            accept="image/*"
            onChange={(e) => setImageFile(e.target.files?.[0] || null)}
            required
          />
        </div>

        <Button type="submit" disabled={isUploading}>
          {isUploading ? "Uploading..." : "Upload Wallpaper"}
        </Button>
      </form>
    </div>
  )
}

export default Admin