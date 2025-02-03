import { Button } from "@/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { toast } from "@/hooks/use-toast"
import { useState } from "react"
import { ImageIcon, X } from "lucide-react"

const IMAGE_TYPES = [
  "Mobile",
  "PFP",
  "Sticker",
  "Background",
  "Live Wallpaper"
] as const

type ImageType = typeof IMAGE_TYPES[number]

interface ImagePreview {
  file: File
  preview: string
}

const Admin = () => {
  const [imageFiles, setImageFiles] = useState<ImagePreview[]>([])
  const [imageType, setImageType] = useState<ImageType>("Mobile")
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState("")
  const [isUploading, setIsUploading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (imageFiles.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one image to upload",
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
      // Create wallpaper entries for each uploaded image
      const newWallpapers = imageFiles.map((image, index) => ({
        id: Date.now() + index,
        url: image.preview,
        type: imageType,
        tags: tags,
      }))

      // Get existing wallpapers from localStorage or initialize empty array
      const existingWallpapers = JSON.parse(localStorage.getItem('wallpapers') || '[]')
      
      // Combine existing and new wallpapers
      const updatedWallpapers = [...existingWallpapers, ...newWallpapers]
      
      // Store in localStorage
      localStorage.setItem('wallpapers', JSON.stringify(updatedWallpapers))
      
      toast({
        title: "Success",
        description: "Wallpapers uploaded successfully!",
      })
      
      // Reset form
      setImageFiles([])
      setTags([])
      setTagInput("")
      
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to upload wallpapers",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
    }
  }

  const handleFiles = (files: FileList) => {
    const validFiles = Array.from(files).filter(file => file.type.startsWith('image/'))
    
    if (validFiles.length === 0) {
      toast({
        title: "Error",
        description: "Please select only image files",
        variant: "destructive",
      })
      return
    }

    if (validFiles.length > 25) {
      toast({
        title: "Error",
        description: "Maximum 25 images allowed per upload",
        variant: "destructive",
      })
      return
    }

    const newPreviews = validFiles.map(file => ({
      file,
      preview: URL.createObjectURL(file)
    }))

    setImageFiles(prev => [...prev, ...newPreviews])
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
    handleFiles(e.dataTransfer.files)
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

  const removeImage = (index: number) => {
    setImageFiles(prev => {
      const newFiles = [...prev]
      URL.revokeObjectURL(newFiles[index].preview)
      newFiles.splice(index, 1)
      return newFiles
    })
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Upload Wallpapers</h1>
      
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
            multiple
            onChange={(e) => e.target.files && handleFiles(e.target.files)}
          />
          <div className="flex flex-col items-center gap-2">
            <ImageIcon className="w-12 h-12 text-gray-400" />
            <p className="text-sm text-gray-600">
              Drag and drop your images here, or click to select (max 25 images)
            </p>
          </div>
        </div>

        {imageFiles.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {imageFiles.map((image, index) => (
              <div key={index} className="relative group">
                <img
                  src={image.preview}
                  alt={`Preview ${index + 1}`}
                  className="w-full h-32 object-cover rounded-lg"
                />
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  className="absolute top-2 right-2 p-1 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>
            ))}
          </div>
        )}

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
          {isUploading ? "Uploading..." : "Upload Wallpapers"}
        </Button>
      </form>
    </div>
  )
}

export default Admin