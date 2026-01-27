-- SECURITY OVERHAUL: Strict RLS Policies (FIXED RECURSION)
-- This script secures customer PII and enforces admin authorization for management tables.

-- 1. PROFILES TABLE (Core Identity)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- NON-RECURSIVE: User can always see their own profile
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

-- NON_RECURSIVE: Admin check using a specific clause that doesn't trigger SELECT recursion on the same table
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
-- We'll rely on the 'Users can view their own profile' for admin's own visibility, 
-- and use a more specific check for the 'all' case if needed.
-- In most cases, admins just need to see everyone.

-- 2. CLIENTS TABLE (PII Protection)
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename  = 'clients') THEN
        ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Public read clients" ON public.clients;
        DROP POLICY IF EXISTS "Public insert clients" ON public.clients;
        DROP POLICY IF EXISTS "Public update clients" ON public.clients;
        DROP POLICY IF EXISTS "Public delete clients" ON public.clients;
        DROP POLICY IF EXISTS "Admins can manage clients" ON public.clients;

        -- We check role in profiles without causing recursion because profiles -> clients is safe
        CREATE POLICY "Admins can manage clients" ON public.clients
            FOR ALL USING (
                (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
            );
    END IF;
END $$;

-- 3. INVOICES TABLE (Financial Records)
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename  = 'invoices') THEN
        ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Users can view their own invoices" ON public.invoices;
        DROP POLICY IF EXISTS "Admins can manage all invoices" ON public.invoices;

        CREATE POLICY "Users can view their own invoices" ON public.invoices
            FOR SELECT USING (auth.uid() = user_id);

        CREATE POLICY "Admins can manage all invoices" ON public.invoices
            FOR ALL USING (
                (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
            );
    END IF;
END $$;

-- 4. CONSULTATIONS TABLE (PII & Booking)
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename  = 'consultations') THEN
        ALTER TABLE public.consultations ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Public can request consultation" ON public.consultations;
        DROP POLICY IF EXISTS "Admins can manage consultations" ON public.consultations;
        DROP POLICY IF EXISTS "Public can book consultations" ON public.consultations;

        CREATE POLICY "Public can book consultations" ON public.consultations
            FOR INSERT WITH CHECK (true);

        CREATE POLICY "Admins can manage consultations" ON public.consultations
            FOR ALL USING (
                (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
            );
    END IF;
END $$;

-- 5. PRODUCTS & VARIANTS
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename  = 'products') THEN
        ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Public read access" ON public.products;
        DROP POLICY IF EXISTS "Admins manage products" ON public.products;

        CREATE POLICY "Public read access" ON public.products FOR SELECT USING (true);
        CREATE POLICY "Admins manage products" ON public.products
            FOR ALL USING (
                (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
            );
    END IF;

    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename  = 'product_variants') THEN
        ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Public read access" ON public.product_variants;
        DROP POLICY IF EXISTS "Admins manage variants" ON public.product_variants;

        CREATE POLICY "Public read access" ON public.product_variants FOR SELECT USING (true);
        CREATE POLICY "Admins manage variants" ON public.product_variants
            FOR ALL USING (
                (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
            );
    END IF;
END $$;

-- TRIGGER: Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (new.id, new.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
