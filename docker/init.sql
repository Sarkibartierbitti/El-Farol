-- El farol 
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE EXTENSION IF NOT EXISTS pg_trgm;

GRANT ALL PRIVILEGES ON DATABASE elfarol TO elfarol;

CREATE SCHEMA IF NOT EXISTS public;

DO $$
BEGIN
  RAISE NOTICE 'El farol database initialized successfully!';
END $$;
