-- ==========================================
-- SyncTeam Data Isolation & RLS Migration
-- ==========================================

-- 1. Add user_id column to tables that need it
-- Projects already has created_by, we can use that or alias it. Let's standardize on user_id for RLS simplicity or map it.
-- Projects: uses 'created_by'. We will treat 'created_by' as the owner.
-- Clients: Needs user_id
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);

-- Tasks: Needs user_id (tasks belong to a project, but for direct RLS it's faster to have user_id too, or check via project)
-- For simplicity and performance, we'll add user_id to tasks to denote "ownership" or "creation". 
-- However, tasks should probably be viewable if you are part of the project. 
-- For this "SaaS" model where every user is isolated, yes, add user_id.
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);

-- Subtasks: usually inherit access from tasks, but we can just rely on the task ownership. 
-- RLS for subtasks will check the parent task's owner.
-- Or just add user_id for simplicity. Let's add it for consistency.
ALTER TABLE public.subtasks ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);


-- 2. Update RLS Policies to be strictly per-user

-- --- CLIENTS ---
DROP POLICY IF EXISTS "Authenticated users can view clients" ON public.clients;
DROP POLICY IF EXISTS "Admins/Members can create clients" ON public.clients;
DROP POLICY IF EXISTS "Admins/Members can update clients" ON public.clients;
DROP POLICY IF EXISTS "Admins can delete clients" ON public.clients;

CREATE POLICY "Users can only view their own clients" ON public.clients
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own clients" ON public.clients
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own clients" ON public.clients
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own clients" ON public.clients
  FOR DELETE USING (auth.uid() = user_id);


-- --- PROJECTS ---
-- Using 'created_by' field as the user identifier
DROP POLICY IF EXISTS "Authenticated users can view projects" ON public.projects;
DROP POLICY IF EXISTS "Authenticated users can insert projects" ON public.projects;
DROP POLICY IF EXISTS "Authenticated users can update projects" ON public.projects;
DROP POLICY IF EXISTS "Authenticated users can delete projects" ON public.projects;

CREATE POLICY "Users can only view their own projects" ON public.projects
  FOR SELECT USING (auth.uid() = created_by);

CREATE POLICY "Users can insert their own projects" ON public.projects
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own projects" ON public.projects
  FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own projects" ON public.projects
  FOR DELETE USING (auth.uid() = created_by);


-- --- TASKS ---
DROP POLICY IF EXISTS "Authenticated users can view tasks" ON public.tasks;
DROP POLICY IF EXISTS "Authenticated users can insert tasks" ON public.tasks;
DROP POLICY IF EXISTS "Authenticated users can update tasks" ON public.tasks;
DROP POLICY IF EXISTS "Authenticated users can delete tasks" ON public.tasks;

CREATE POLICY "Users can only view their own tasks" ON public.tasks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tasks" ON public.tasks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tasks" ON public.tasks
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tasks" ON public.tasks
  FOR DELETE USING (auth.uid() = user_id);


-- --- SUBTASKS ---
DROP POLICY IF EXISTS "Authenticated users can view subtasks" ON public.subtasks;
DROP POLICY IF EXISTS "Authenticated users can modify subtasks" ON public.subtasks;

CREATE POLICY "Users can view their own subtasks" ON public.subtasks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own subtasks" ON public.subtasks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subtasks" ON public.subtasks
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own subtasks" ON public.subtasks
  FOR DELETE USING (auth.uid() = user_id);

