-- Remove upload request system and cleanup
DROP TABLE IF EXISTS upload_requests CASCADE;
DROP TABLE IF EXISTS delete_requests CASCADE;

-- Remove related functions
DROP FUNCTION IF EXISTS valid_upload_request_status(text) CASCADE;
DROP FUNCTION IF EXISTS ensure_valid_upload_request_status() CASCADE;
DROP FUNCTION IF EXISTS valid_delete_request_status(text) CASCADE;
DROP FUNCTION IF EXISTS ensure_valid_delete_request_status() CASCADE;