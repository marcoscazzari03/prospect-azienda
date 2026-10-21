-- Portali e piattaforme (migrazione 062, punto 54e).
\set ON_ERROR_STOP on

create or replace function pg_temp.check(p_cond boolean, p_msg text) returns void language plpgsql as $$
begin
  if not coalesce(p_cond, false) then raise exception 'TEST FALLITO: %', p_msg; end if;
  raise notice 'ok  %', p_msg;
end $$;

select pg_temp.check(is_platform_domain('pizzeria.business.site') and is_platform_domain('autoscout24.it')
                     and is_platform_domain('www.treatwell.it') and is_platform_domain('lnk.bio') and is_platform_domain('camping.it'),
                     'portali e siti business.site riconosciuti');
select pg_temp.check(not is_platform_domain('bentosushi.it') and not is_platform_domain('campingrossi.it')
                     and not is_platform_domain('hotelrossi.it') and not is_platform_domain('mybusiness.site.it'),
                     'siti aziendali con nomi simili restano validi');
