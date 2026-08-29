-- Keep database verification reproducible in local and staging environments.
create extension if not exists pgtap with schema extensions;
