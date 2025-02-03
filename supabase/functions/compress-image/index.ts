import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import Sharp from 'https://esm.sh/sharp@0.32.6'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      throw new Error('No file uploaded')
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = new Uint8Array(arrayBuffer)

    // Compress the image
    const compressedBuffer = await Sharp(buffer)
      .resize(800) // Resize to max width of 800px while maintaining aspect ratio
      .jpeg({ quality: 80 }) // Convert to JPEG with 80% quality
      .toBuffer()

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const fileExt = file.name.split('.').pop()
    const fileName = `${crypto.randomUUID()}`
    const filePath = `${fileName}.${fileExt}`
    const compressedFilePath = `compressed/${fileName}.jpg`

    // Upload original file
    const { data: originalData, error: originalError } = await supabase.storage
      .from('wallpapers')
      .upload(filePath, file, {
        contentType: file.type,
        upsert: false
      })

    if (originalError) throw originalError

    // Upload compressed version
    const { data: compressedData, error: compressedError } = await supabase.storage
      .from('wallpapers')
      .upload(compressedFilePath, compressedBuffer, {
        contentType: 'image/jpeg',
        upsert: false
      })

    if (compressedError) throw compressedError

    // Get public URLs
    const { data: { publicUrl: originalUrl } } = supabase.storage
      .from('wallpapers')
      .getPublicUrl(filePath)

    const { data: { publicUrl: compressedUrl } } = supabase.storage
      .from('wallpapers')
      .getPublicUrl(compressedFilePath)

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
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})