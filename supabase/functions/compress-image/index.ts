
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('Starting file upload process...')
    const formData = await req.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      throw new Error('No file uploaded')
    }

    console.log('File received:', file.name, 'Size:', file.size)

    const arrayBuffer = await file.arrayBuffer()
    const buffer = new Uint8Array(arrayBuffer)

    console.log('Starting ImageMagick compression...')
    
    // Create a new process to run ImageMagick with optimized settings
    const cmd = new Deno.Command("convert", {
      args: [
        "-", // Read from stdin
        "-strip", // Remove all metadata
        "-interlace", "Plane", // Progressive loading
        "-gaussian-blur", "0.05", // Slight blur to help compression
        "-quality", "60", // Lower quality for preview
        "-resize", "800x800>", // Resize to max 800x800 while maintaining aspect ratio
        "jpeg:-" // Output as JPEG to stdout
      ],
      stdin: "piped",
      stdout: "piped",
    });

    // Start the process
    const process = cmd.spawn();
    
    // Write the original buffer to stdin
    const writer = process.stdin.getWriter();
    await writer.write(buffer);
    await writer.close();

    // Get the compressed image data
    const { stdout } = await process.output();
    const compressedBuffer = stdout;

    console.log('Image compression completed')

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const fileExt = file.name.split('.').pop()
    const fileName = `${crypto.randomUUID()}`
    const filePath = `${fileName}.${fileExt}`
    const compressedFilePath = `compressed/${fileName}.jpg`

    console.log('Uploading original file...')
    
    // Upload original file
    const { data: originalData, error: originalError } = await supabase.storage
      .from('wallpapers')
      .upload(filePath, file, {
        contentType: file.type,
        upsert: false
      })

    if (originalError) {
      console.error('Original file upload error:', originalError)
      throw originalError
    }

    console.log('Original file uploaded successfully')
    console.log('Uploading compressed version...')

    // Upload compressed version
    const { data: compressedData, error: compressedError } = await supabase.storage
      .from('wallpapers')
      .upload(compressedFilePath, compressedBuffer, {
        contentType: 'image/jpeg',
        upsert: false
      })

    if (compressedError) {
      console.error('Compressed file upload error:', compressedError)
      throw compressedError
    }

    console.log('Compressed file uploaded successfully')

    // Get public URLs
    const { data: { publicUrl: originalUrl } } = supabase.storage
      .from('wallpapers')
      .getPublicUrl(filePath)

    const { data: { publicUrl: compressedUrl } } = supabase.storage
      .from('wallpapers')
      .getPublicUrl(compressedFilePath)

    console.log('Generated public URLs')

    return new Response(
      JSON.stringify({ 
        filePath,
        originalUrl,
        compressedUrl,
        compressedFilePath
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )
  } catch (error) {
    console.error('Error in upload process:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})
