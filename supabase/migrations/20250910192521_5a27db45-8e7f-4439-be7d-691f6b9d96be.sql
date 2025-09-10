-- Update creators table to ensure unique creator_code constraint
ALTER TABLE creators ADD CONSTRAINT unique_creator_code UNIQUE (creator_code);

-- Create index for better performance
CREATE INDEX idx_creators_creator_code ON creators(creator_code) WHERE creator_code IS NOT NULL;