import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";

const WALLPAPER_TYPES = [
  { value: "mobile", label: "Mobile" },
  { value: "pfp", label: "PFP" },
  { value: "sticker", label: "Sticker" },
  { value: "background", label: "Background" },
  { value: "live", label: "Live Wallpaper" },
];

const MAX_FILES = 25;

const Upload = () => {
  const navigate = useNavigate();
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [imageType, setImageType] = useState<string>("mobile");
  const [tags, setTags] = useState<string>("");
  const [dragActive, setDragActive] = useState(false);
  const [progress, setProgress] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    checkAdmin();
  }, []);

  const checkAdmin = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/");
      return;
    }

    setUserId(session.user.id);

    const { data: adminData } = await supabase
      .from('admin_users')
      .select('admin_type')
      .eq('user_id', session.user.id)
      .maybeSingle();

    if (!adminData) {
      navigate("/");
      toast({
        title: "Access Denied",
        description: "You don't have permission to access this page",
        variant: "destructive",
      });
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const droppedFiles = Array.from(e.dataTransfer.files).slice(0, MAX_FILES);
    setFiles(droppedFiles);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files).slice(0, MAX_FILES);
      setFiles(selectedFiles);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (files.length === 0) {
      toast({
        title: "Error",
        description: "Please select files to upload",
        variant: "destructive",
      });
      return;
    }

    if (!imageType) {
      toast({
        title: "Error",
        description: "Please select an image type",
        variant: "destructive",
      });
      return;
    }

    if (!userId) {
      toast({
        title: "Error",
        description: "User session not found",
        variant: "destructive",
      });
      return;
    }

    try {
      setUploading(true);
      const tagArray = tags.split(',').map(tag => tag.trim()).filter(tag => tag);
      let completed = 0;

      for (const file of files) {
        const fileExt = file.name.split('.').pop();
        const timestamp = Date.now();
        const randomString = Math.random().toString(36).substring(2, 10);
        const safeFileName = `${timestamp}-${randomString}.${fileExt}`;
        const filePath = `${userId}/${safeFileName}`;

        console.log(`Uploading file: Original name ${file.name}, Safe name: ${safeFileName}`);

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('wallpapers')
          .upload(filePath, file);

        if (uploadError) {
          console.error("Upload error:", uploadError);
          throw uploadError;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('wallpapers')
          .getPublicUrl(filePath);
        
        const { error: dbError } = await supabase
          .from('wallpapers')
          .insert({
            url: publicUrl,
            compressed_url: publicUrl,
            file_path: filePath,
            type: imageType,
            tags: tagArray,
            uploaded_by: userId
          });

        if (dbError) {
          console.error("Database error:", dbError);
          throw dbError;
        }
        
        completed++;
        setProgress((completed / files.length) * 100);
      }

      toast({
        title: "Success",
        description: `${files.length} wallpapers uploaded successfully`,
      });

      setFiles([]);
      setTags("");
      setProgress(0);
      const fileInput = document.getElementById('file') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      
      navigate('/admin-panel');
    } catch (error: any) {
      console.error("Upload error details:", error);
      toast({
        title: "Error",
        description: error.message || 'Failed to upload files',
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">Upload Wallpapers</h1>
        <Button onClick={() => navigate("/admin-panel")}>Return to Admin Panel</Button>
      </div>
      
      <div className="max-w-md">
        <form onSubmit={handleUpload} className="space-y-6">
          <div 
            className={cn(
              "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
              dragActive ? "border-primary bg-primary/10" : "border-gray-300",
              "hover:border-primary hover:bg-primary/5"
            )}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => document.getElementById('file')?.click()}
          >
            <input
              id="file"
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
            {files.length > 0 ? (
              <p className="text-sm">Selected {files.length} file(s)</p>
            ) : (
              <div>
                <p className="text-lg font-medium">Drag and drop your images here</p>
                <p className="text-sm text-gray-500 mt-2">or click to select files (max {MAX_FILES})</p>
              </div>
            )}
          </div>

          {uploading && (
            <div className="space-y-2">
              <Progress value={progress} />
              <p className="text-sm text-gray-500 text-center">{Math.round(progress)}% complete</p>
            </div>
          )}

          <div className="space-y-3">
            <Label>Image Type</Label>
            <RadioGroup
              value={imageType}
              onValueChange={setImageType}
              className="grid grid-cols-2 gap-4"
            >
              {WALLPAPER_TYPES.map((type) => (
                <div key={type.value} className="flex items-center space-x-2">
                  <RadioGroupItem value={type.value} id={type.value} />
                  <Label htmlFor={type.value}>{type.label}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div>
            <Label htmlFor="tags">Tags (comma-separated)</Label>
            <Input
              id="tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="nature, landscape, dark"
            />
          </div>
          
          <Button type="submit" disabled={uploading || files.length === 0}>
            {uploading ? "Uploading..." : "Upload"}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default Upload;
