import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { toast } from "@/hooks/use-toast"
import { useState } from "react"
import { ImageIcon } from "lucide-react"

const IMAGE_TYPES = [
  "Mobile",
  "PFP",
  "Sticker",
  "Background",
  "Live Wallpaper"
] as const

type ImageType = typeof IMAGE_TYPES[number]

const Admin = () => {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imageType, setImageType] = useState<ImageType>("Mobile")
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState("")
  const [isUploading, setIsUploading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

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

    if (tags.length === 0) {
      toast({
        title: "Error",
        description: "Please add at least one tag",
        variant: "destructive",
      })
      return
    }

    setIsUploading(true)
    
    try {
      // TODO: Implement actual upload logic when backend is connected
      console.log("Uploading:", { title, description, imageFile, imageType, tags })
      
      toast({
        title: "Success",
        description: "Wallpaper uploaded successfully!",
      })
      
      // Reset form
      setTitle("")
      setDescription("")
      setImageFile(null)
      setTags([])
      setTagInput("")
      
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

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith('image/')) {
      setImageFile(file)
    } else {
      toast({
        title: "Error",
        description: "Please drop an image file",
        variant: "destructive",
      })
    }
  }

  const handleTagAdd = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault()
      if (!tags.includes(tagInput.trim())) {
        setTags([...tags, tagInput.trim()])
        setTagInput("")
      }
    }
  }

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove))
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Upload Wallpaper</h1>
      
      <form onSubmit={handleSubmit} className="max-w-xl space-y-6">
        <div 
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
            ${isDragging ? 'border-primary bg-primary/10' : 'border-gray-300 hover:border-primary'}
          `}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => document.getElementById('image-upload')?.click()}
        >
          <input
            id="image-upload"
            type="file"
            className="hidden"
            accept="image/*"
            onChange={(e) => setImageFile(e.target.files?.[0] || null)}
          />
          <div className="flex flex-col items-center gap-2">
            <ImageIcon className="w-12 h-12 text-gray-400" />
            <p className="text-sm text-gray-600">
              {imageFile ? imageFile.name : "Drag and drop your image here, or click to select"}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Image Type</Label>
          <RadioGroup
            value={imageType}
            onValueChange={(value) => setImageType(value as ImageType)}
            className="grid grid-cols-2 gap-4 sm:grid-cols-3"
          >
            {IMAGE_TYPES.map((type) => (
              <div key={type} className="flex items-center space-x-2">
                <RadioGroupItem value={type} id={type} />
                <Label htmlFor={type}>{type}</Label>
              </div>
            ))}
          </RadioGroup>
        </div>

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
          <Label htmlFor="tags">Tags</Label>
          <div className="flex flex-wrap gap-2 mb-2">
            {tags.map((tag) => (
              <span
                key={tag}
                className="bg-primary/10 text-primary px-2 py-1 rounded-md text-sm flex items-center gap-1"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="hover:text-primary/80"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <Input
            id="tags"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={handleTagAdd}
            placeholder="Type a tag and press Enter"
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