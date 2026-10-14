-- Suggerimenti del settore nel wizard: i settori delle aziende del database con il sito
-- controllato di recente (le stesse che possono entrare nella riserva delle ricerche in
-- target), con quante sono. Il cliente sceglie parole che il database riconosce.

create or replace function public.industry_suggestions(p_query text, p_limit integer default 8)
returns table (industry text, companies integer)
language sql stable security definer set search_path = public as $$
  with q as (select replace(replace(replace(btrim(coalesce(p_query, '')), '\', ''), '%', ''), '_', '') as t)
  select c.industry, count(*)::integer
    from q, companies c
   where length(q.t) >= 2
     and c.industry <> ''
     and c.industry ilike '%' || q.t || '%'
     and exists (select 1 from company_checks cc
                  where cc.company_id = c.id and cc.status in ('pass', 'fail')
                    and cc.checked_at > now() - interval '60 days')
   group by c.industry
   order by count(*) desc, c.industry
   limit least(greatest(coalesce(p_limit, 8), 1), 20)
$$;
revoke all on function public.industry_suggestions(text, integer) from public, anon, authenticated;
