/*
# Add custom background and theme color columns to user_settings

1. Add custom_background_url for user-uploaded background images
2. Add custom_theme_color for user-selected theme accent color
3. Add background_type to distinguish between animated and custom image
*/

ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS custom_background_url text;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS custom_theme_color text;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS background_type text DEFAULT 'animated';
