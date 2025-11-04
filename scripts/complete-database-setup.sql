-- Create all required tables with proper structure and RLS policies

-- Enable RLS
ALTER TABLE IF EXISTS poster_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS generated_posters ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS feedback ENABLE ROW LEVEL SECURITY;

-- Create hero_texts table
CREATE TABLE IF NOT EXISTS hero_texts (
  id SERIAL PRIMARY KEY,
  text TEXT NOT NULL,
  active BOOLEAN DEFAULT true,
  order_position INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create testimonials table
CREATE TABLE IF NOT EXISTS testimonials (
  id SERIAL PRIMARY KEY,
  text TEXT NOT NULL,
  author VARCHAR(255) NOT NULL,
  role VARCHAR(255) NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5) DEFAULT 5,
  avatar VARCHAR(50) DEFAULT '👤',
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create site_settings table
CREATE TABLE IF NOT EXISTS site_settings (
  id SERIAL PRIMARY KEY,
  setting_key VARCHAR(255) UNIQUE NOT NULL,
  setting_value JSONB,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  type VARCHAR(50) CHECK (type IN ('info', 'warning', 'error', 'success')) DEFAULT 'info',
  title VARCHAR(255) NOT NULL,
  description TEXT,
  details TEXT,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on new tables
ALTER TABLE hero_texts ENABLE ROW LEVEL SECURITY;
ALTER TABLE testimonials ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for public read access
CREATE POLICY "Public read access" ON poster_templates FOR SELECT USING (true);
CREATE POLICY "Public read access" ON hero_texts FOR SELECT USING (true);
CREATE POLICY "Public read access" ON testimonials FOR SELECT USING (true);
CREATE POLICY "Public read access" ON site_settings FOR SELECT USING (true);

-- RLS Policies for generated_posters (allow public insert and update)
CREATE POLICY "Public insert" ON generated_posters FOR INSERT USING (true) WITH CHECK (true);
CREATE POLICY "Public update" ON generated_posters FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public read" ON generated_posters FOR SELECT USING (true);

-- RLS Policies for payments and feedback
CREATE POLICY "Public insert" ON payments FOR INSERT USING (true) WITH CHECK (true);
CREATE POLICY "Public read" ON payments FOR SELECT USING (true);
CREATE POLICY "Public insert" ON feedback FOR INSERT USING (true) WITH CHECK (true);
CREATE POLICY "Public read" ON feedback FOR SELECT USING (true);

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
('Safaricom offers changes frequently any time it does, this is the place i make may posters', 'Grace, Mombasa', 'Mpesa Agent', 5, '👩🏾‍🎨', true)
ON CONFLICT DO NOTHING;

-- Insert default contact settings
INSERT INTO site_settings (setting_key, setting_value) VALUES
('phone', '"+254 748 776 354"'),
('whatsapp', '"+254 748 776 354"'),
('email', '"tricreta@gmail.com"'),
('tiktok', '"@Tricre8"'),
('youtube', '"Tricre8-KE"')
ON CONFLICT (setting_key) DO NOTHING;

-- Create indexes for performance (without unique constraints)
CREATE INDEX IF NOT EXISTS idx_generated_posters_time ON generated_posters(time);
CREATE INDEX IF NOT EXISTS idx_generated_posters_template_id ON generated_posters(template_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_time ON payments(time);
CREATE INDEX IF NOT EXISTS idx_feedback_rating ON feedback(rating);
CREATE INDEX IF NOT EXISTS idx_hero_texts_active_order ON hero_texts(active, order_position);
CREATE INDEX IF NOT EXISTS idx_testimonials_active ON testimonials(active);

-- Additional updates can be inserted here if needed
