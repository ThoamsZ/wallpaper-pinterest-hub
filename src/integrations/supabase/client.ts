
// This file is automatically generated. Do not edit it directly.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://begjbzrzxmbwsrniirao.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJlZ2pienJ6eG1id3NybmlpcmFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzg1OTUzODgsImV4cCI6MjA1NDE3MTM4OH0.M12TudEZqwnImyu1EvQ0Ha-s3fsHafx9ZxWsD8FCc98";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

// Helper function for checking if a table exists
export const checkTableExists = async (tableName: string): Promise<boolean> => {
  try {
    console.log(`Checking if table ${tableName} exists...`);
    
    // Try a direct approach first - checking the information_schema
    const { data: schemaData, error: schemaError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', tableName)
      .maybeSingle();
    
    if (schemaError) {
      console.error(`Error checking schema for table ${tableName}:`, schemaError);
      
      // Fallback method: Try to select from the table directly
      try {
        const { error: queryError } = await supabase
          .from(tableName)
          .select('*')
          .limit(1);
        
        if (queryError) {
          if (queryError.code === '42P01' || 
              queryError.message.includes('relation') || 
              queryError.message.includes('does not exist')) {
            console.log(`Table ${tableName} does not exist (determined by query)`);
            return false;
          }
          console.error(`Query error checking if table ${tableName} exists:`, queryError);
        }
        
        // If we got here with no error, the table exists
        console.log(`Table ${tableName} exists (determined by query)`);
        return true;
      } catch (fallbackError) {
        console.error(`Exception when querying table ${tableName}:`, fallbackError);
        return false;
      }
    }
    
    const tableExists = !!schemaData;
    console.log(`Table ${tableName} ${tableExists ? 'exists' : 'does not exist'} (determined by schema check)`);
    return tableExists;
  } catch (error) {
    console.error(`General exception checking if table ${tableName} exists:`, error);
    return false;
  }
};
