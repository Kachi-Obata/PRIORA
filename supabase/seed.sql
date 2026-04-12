-- Priora v1 — seed courses
-- Run after migrations. Adjust the course list with the actual 200-level CS
-- course codes/names provided by the master admin.
-- Shared courses (GEDS / general studies) apply to all groups.

insert into public.courses (code, name, groups) values
  ('BU-GST 022', 'Citizenship Orientation',                              array['A','B','C','D']),
  ('MTH 202',    'Elementary Differential Equations',                     array['A','B','C','D']),
  ('CYB 206',    'Intro to Cybersecurity and Strategy',                   array['A','B','C','D']),
  ('COS 202',    'Computer Programming II',                               array['A','B','C','D']),
  ('BU-CSC 214', 'Operations Research',                                   array['A','B','C','D']),
  ('BU-GST 200', 'Communication in French',                               array['A','B','C','D']),
  ('BU-GST 220', 'Origins and Science',                                   array['A','B','C','D']),
  ('BU-SEN 212', 'Internet Technology Web Application Development',       array['A','B','C','D']),
  ('GST 212',    'Philosophy Logic and Human Existence',                  array['A','B','C','D']),
  ('IFT 212',    'Computer Architecture and Organization',                array['A','B','C','D']),
  ('INS 204',    'System Analysis and Design',                            array['A','B','C','D'])
on conflict (code) do nothing;
