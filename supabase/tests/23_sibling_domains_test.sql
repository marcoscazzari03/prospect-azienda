-- Domini «fratelli» delle email aziendali (migrazione 041).
\set ON_ERROR_STOP on

create or replace function pg_temp.check(p_cond boolean, p_msg text) returns void language plpgsql as $$
begin
  if not coalesce(p_cond, false) then raise exception 'TEST FALLITO: %', p_msg; end if;
  raise notice 'ok  %', p_msg;
end $$;

select pg_temp.check(domain_label('www.zoello.it') = 'zoello' and domain_label('albergo.mo.it') = 'albergo'
                     and domain_label('magnagallo-hotel.com') = 'magnagallohotel' and domain_label('sub.example.co.uk') = 'example', 'nome del dominio');
select pg_temp.check(email_on_domain('info@acme.it', 'acme.it') and email_on_domain('a@mail.acme.it', 'acme.it'), 'stesso dominio e sottodominio');
select pg_temp.check(email_on_domain('info@zoello.com', 'zoello.it'), 'stesso nome, altra estensione');
select pg_temp.check(email_on_domain('info@magnagallo.it', 'magnagallo-hotel.com'), 'nome contenuto (6+ lettere)');
select pg_temp.check(not email_on_domain('info@rossicatering.it', 'rossi.it'), 'nome troppo corto: no');
select pg_temp.check(not email_on_domain('info@abc.com', 'abc.it'), 'nome di 3 lettere: no');
select pg_temp.check(not email_on_domain('info@altrasocieta.it', 'acme.it') and not email_on_domain('acme@gmail.com', 'acme.it'), 'domini di terzi e gratuiti: no');

select 'superati tutti i test domini fratelli';
