-- Priora v1 — seed courses
-- Run after migrations. Adjust the course list with the actual 200-level CS
-- course codes/names provided by the master admin.
-- Shared courses (GEDS / general studies) apply to all groups.

insert into public.courses (code, name, groups) values
  ('CSC 211', 'Data Structures',             array['A','B','C','D']),
  ('CSC 213', 'Computer Architecture',       array['A','B','C','D']),
  ('CSC 215', 'Operating Systems I',         array['A','B','C','D']),
  ('CSC 217', 'Computer Programming II',     array['A','B','C','D']),
  ('CSC 219', 'Discrete Structures',         array['A','B','C','D']),
  ('MTH 201', 'Mathematical Methods I',      array['A','B','C','D']),
  ('STA 201', 'Statistics for Sciences',     array['A','B','C','D']),
  ('GEDS 201', 'Nigerian Peoples and Culture', array['A','B','C','D']),
  ('GEDS 202', 'Philosophy and Logic',       array['A','B','C','D'])
on conflict (code) do nothing;
