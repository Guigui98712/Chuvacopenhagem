# Contagem de Dias de Chuva

## 1) Estrutura no Supabase

Execute este SQL no editor do Supabase (SQL Editor):

```sql
create table if not exists rain_days (
  id uuid primary key default gen_random_uuid(),
  date date not null unique,
  morning boolean not null default false,
  afternoon boolean not null default false,
  created_at timestamp with time zone not null default now()
);

alter table rain_days enable row level security;

create policy "Public read" on rain_days
  for select
  using (true);

create policy "Public insert" on rain_days
  for insert
  with check (true);

create policy "Public update" on rain_days
  for update
  using (true)
  with check (true);

create policy "Public delete" on rain_days
  for delete
  using (true);
```

## 2) Configurar o frontend

Abra [index.html](index.html) e substitua:

```js
window.SUPABASE_CONFIG = {
  url: "https://SEU-PROJETO.supabase.co",
  anonKey: "SUA-ANON-KEY"
};
```

## 3) Rodar localmente

Abra [index.html](index.html) no navegador (duplo clique) ou use qualquer servidor estatico.
