-- User-selectable theme (issue #15), stored on the profile so it follows the
-- user across devices. Ids match THEME_IDS in src/lib/themes.ts.
alter table public.profiles
  add column theme text not null default 'default'
  constraint profiles_theme_known check (theme in ('default', 'peach', 'mint', 'lavender', 'dark'));
