-- Create hero_texts table
CREATE TABLE IF NOT EXISTS hero_texts (
  id SERIAL PRIMARY KEY,
  text TEXT NOT NULL,
  active BOOLEAN DEFAULT true,
  order_position INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create testimonials table
CREATE TABLE IF NOT EXISTS testimonials (
  id SERIAL PRIMARY KEY,
  text TEXT NOT NULL,
  author VARCHAR(255) NOT NULL,
  role VARCHAR(255) NOT NULL,
  rating INTEGER DEFAULT 5 CHECK (rating >= 1 AND rating <= 5),
  avatar VARCHAR(10) DEFAULT '👤',
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create site_settings table
CREATE TABLE IF NOT EXISTS site_settings (
  id SERIAL PRIMARY KEY,
  setting_key VARCHAR(255) UNIQUE NOT NULL,
  setting_value JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  type VARCHAR(50) NOT NULL CHECK (type IN ('info', 'warning', 'error', 'success')),
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  details TEXT,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE hero_texts ENABLE ROW LEVEL SECURITY;
ALTER TABLE testimonials ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (you can restrict these later)
CREATE POLICY "Allow all operations on hero_texts" ON hero_texts FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on testimonials" ON testimonials FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on site_settings" ON site_settings FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on notifications" ON notifications FOR ALL TO public USING (true) WITH CHECK (true);

-- Insert default hero texts
INSERT INTO hero_texts (text, active, order_position) VALUES
('Huna time? Huna designer? Hakuna pressure. Tengeneza poster fasta hapa.', true, 1),
('Poster ya msee smart — bila stress, bila story mingi.', true, 2),
('Toka kwa struggle. Tengeza poster fiti kama pro — bila design skills.', true, 3),
('Poster iko sorted — wewe concentrate na biashara.', true, 4)
ON CONFLICT DO NOTHING;

-- Insert default testimonials
INSERT INTO testimonials (text, author, role, rating, avatar, active) VALUES
('I sell bundles. Now my posters sell them for me.', 'Mercy, Kisumu', 'Bingwa Sokoni Agent', 5, '👩🏾‍💼', true),
('Hii app imeniokoa sana. Posters ziko fire!', 'Kevin, Nairobi', 'Airtime Dealer', 5, '👨🏾‍💼', true),
('Safaricom offers change frequently any time it does, this is the place I make my posters', 'Grace, Mombasa', 'Mpesa Agent', 5, '👩🏾‍🎨', true)
ON CONFLICT DO NOTHING;

-- Insert default site settings
INSERT INTO site_settings (setting_key, setting_value) VALUES
('contact_info', '{"phoneNumbers": ["+254 748 776 354"], "supportEmail": "tricreta@gmail.com", "whatsappNumbers": ["+254 748 776 354"], "tiktokLink": "@Tricre8", "youtubeLink": "Tricre8-KE"}'),
('site_controls', '{"sitePaused": false, "pricingDisabled": false}'),
('hero_settings', '{"animationStyle": "fade", "duration": 4000, "autoPlay": true}')
ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value;

-- Additional updates can be inserted here if needed
