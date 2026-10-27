CREATE TYPE public.app_role AS ENUM ('admin','user');
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role=_role)
$$;

-- First user to sign up becomes admin
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role='admin') THEN
    INSERT INTO public.user_roles(user_id, role) VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles(user_id, role) VALUES (NEW.id, 'user');
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER on_auth_user_created_role AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_role();

CREATE TABLE public.companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  logo_url text,
  website text,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.companies TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.companies TO authenticated;
GRANT ALL ON public.companies TO service_role;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read companies" ON public.companies FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admin write companies" ON public.companies FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.categories TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read categories" ON public.categories FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admin write categories" ON public.categories FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  location text NOT NULL DEFAULT '',
  employment_type text NOT NULL DEFAULT 'Full-Time',
  work_mode text NOT NULL DEFAULT 'On-Site',
  experience_level text NOT NULL DEFAULT 'Intermediate',
  salary_min integer,
  salary_max integer,
  deadline date,
  summary text NOT NULL DEFAULT '',
  responsibilities text NOT NULL DEFAULT '',
  qualifications text NOT NULL DEFAULT '',
  experience text NOT NULL DEFAULT '',
  external_url text,
  is_featured boolean NOT NULL DEFAULT false,
  is_urgent boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.jobs TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.jobs TO authenticated;
GRANT ALL ON public.jobs TO service_role;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read published jobs" ON public.jobs FOR SELECT TO anon, authenticated USING (status='published' OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin write jobs" ON public.jobs FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid REFERENCES public.jobs(id) ON DELETE CASCADE NOT NULL,
  full_name text NOT NULL CHECK (char_length(full_name) BETWEEN 1 AND 120),
  email text NOT NULL CHECK (char_length(email) BETWEEN 3 AND 255),
  phone text CHECK (phone IS NULL OR char_length(phone) <= 40),
  cover_letter text CHECK (cover_letter IS NULL OR char_length(cover_letter) <= 5000),
  cv_path text NOT NULL,
  document_paths text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'new',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.applications TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.applications TO authenticated;
GRANT ALL ON public.applications TO service_role;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone can apply" ON public.applications FOR INSERT TO anon, authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = job_id AND j.status='published' AND (j.deadline IS NULL OR j.deadline >= current_date)));
CREATE POLICY "admin read applications" ON public.applications FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin update applications" ON public.applications FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin delete applications" ON public.applications FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- Storage policies for private 'resumes' bucket
CREATE POLICY "anyone upload resumes" ON storage.objects FOR INSERT TO anon, authenticated WITH CHECK (bucket_id='resumes');
CREATE POLICY "admin read resumes" ON storage.objects FOR SELECT TO authenticated USING (bucket_id='resumes' AND public.has_role(auth.uid(),'admin'));

-- Seed
INSERT INTO public.categories (id, name) VALUES
 ('11111111-0000-0000-0000-000000000001','Design'),
 ('11111111-0000-0000-0000-000000000002','Engineering'),
 ('11111111-0000-0000-0000-000000000003','Marketing'),
 ('11111111-0000-0000-0000-000000000004','Finance'),
 ('11111111-0000-0000-0000-000000000005','Sales'),
 ('11111111-0000-0000-0000-000000000006','Operations');

INSERT INTO public.companies (id, name, website, description) VALUES
 ('22222222-0000-0000-0000-000000000001','Northwind Labs','https://example.com','Product studio building tools for modern teams.'),
 ('22222222-0000-0000-0000-000000000002','Bluepeak Bank','https://example.com','Digital-first retail bank.'),
 ('22222222-0000-0000-0000-000000000003','Greenline Health','https://example.com','Healthcare technology provider.'),
 ('22222222-0000-0000-0000-000000000004','Orbit Logistics','https://example.com','Regional freight and delivery network.'),
 ('22222222-0000-0000-0000-000000000005','Kite Media','https://example.com','Creative marketing agency.');

INSERT INTO public.jobs (title, company_id, category_id, location, employment_type, work_mode, experience_level, salary_min, salary_max, deadline, summary, responsibilities, qualifications, experience, is_featured, is_urgent, status, created_at) VALUES
 ('Senior Product Designer','22222222-0000-0000-0000-000000000001','11111111-0000-0000-0000-000000000001','Remote','Full-Time','Remote','Expert',90000,120000,current_date+30,'Lead end-to-end design for our flagship collaboration product.','Own design from discovery to launch
Run user research sessions
Maintain the design system','Strong portfolio of shipped products
Fluency in Figma','5+ years in product design',true,false,'published',now()-interval '2 days'),
 ('Frontend Engineer','22222222-0000-0000-0000-000000000001','11111111-0000-0000-0000-000000000002','Berlin','Full-Time','Hybrid','Intermediate',70000,95000,current_date+21,'Build fast, accessible interfaces with React and TypeScript.','Ship product features
Review code
Improve performance','React and TypeScript
Accessibility knowledge','3+ years building web apps',true,false,'published',now()-interval '1 day'),
 ('Financial Analyst','22222222-0000-0000-0000-000000000002','11111111-0000-0000-0000-000000000004','London','Full-Time','On-Site','Intermediate',60000,80000,current_date+7,'Support planning and forecasting across business units.','Build financial models
Prepare monthly reports','Degree in Finance or Economics
Advanced Excel','2+ years in FP&A',false,true,'published',now()-interval '5 days'),
 ('Nurse Informatics Specialist','22222222-0000-0000-0000-000000000003','11111111-0000-0000-0000-000000000006','Toronto','Contractual','Hybrid','Expert',75000,100000,current_date+14,'Bridge clinical staff and our software teams.','Gather clinical requirements
Train hospital staff','Registered nurse license
Comfort with software tools','4+ years clinical experience',true,true,'published',now()-interval '3 days'),
 ('Logistics Coordinator','22222222-0000-0000-0000-000000000004','11111111-0000-0000-0000-000000000006','Dubai','Full-Time','On-Site','Beginner',30000,42000,current_date+20,'Coordinate daily shipments across the region.','Schedule deliveries
Liaise with drivers and clients','Strong organisation skills
Good spoken English','1+ year in logistics',false,false,'published',now()-interval '6 days'),
 ('Social Media Intern','22222222-0000-0000-0000-000000000005','11111111-0000-0000-0000-000000000003','Remote','Internship','Remote','Fresher',12000,18000,current_date+10,'Help plan and publish content for client brands.','Draft posts
Track engagement','Interest in social media
Good writing','No experience required',false,true,'published',now()-interval '12 hours'),
 ('Account Executive','22222222-0000-0000-0000-000000000005','11111111-0000-0000-0000-000000000005','New York','Full-Time','Hybrid','Intermediate',65000,110000,current_date+25,'Win and grow agency client accounts.','Run sales pipeline
Close new deals','Proven sales record
Great communication','3+ years B2B sales',false,false,'published',now()-interval '8 days'),
 ('Freelance Illustrator','22222222-0000-0000-0000-000000000005','11111111-0000-0000-0000-000000000001','Remote','Freelance','Remote','Intermediate',20000,40000,current_date+40,'Create illustrations for campaigns and editorial.','Produce original artwork
Collaborate with art directors','Strong illustration portfolio','2+ years freelance',false,false,'published',now()-interval '4 days'),
 ('Backend Engineer (Payments)','22222222-0000-0000-0000-000000000002','11111111-0000-0000-0000-000000000002','Remote','Full-Time','Remote','Expert',100000,140000,current_date+30,'Design reliable payment services at scale.','Build payment APIs
Ensure reliability and security','Experience with distributed systems
Postgres','5+ years backend',true,false,'published',now()-interval '1 day'),
 ('Part-Time Bookkeeper','22222222-0000-0000-0000-000000000004','11111111-0000-0000-0000-000000000004','Dubai','Part-Time','On-Site','Beginner',15000,22000,current_date+15,'Keep our accounts tidy and up to date.','Record transactions
Reconcile accounts','Basic accounting knowledge','1+ year bookkeeping',false,false,'published',now()-interval '9 days');