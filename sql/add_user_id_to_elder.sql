-- Add user_id column to Elder table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'Elder' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE "Elder" ADD COLUMN user_id INTEGER;
    
    -- Add foreign key constraint if User table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='User') THEN
      ALTER TABLE "Elder" ADD CONSTRAINT fk_elder_user 
        FOREIGN KEY (user_id) REFERENCES "User"(user_id);
    END IF;
  END IF;
END$$;
