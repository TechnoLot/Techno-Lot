-- Effacement d'un compteur de limite de débit (securite.limites).
--
-- Après un mot de passe juste ou un bon code de double authentification, le
-- serveur remet à zéro les compteurs du visiteur, sinon quelques connexions
-- réussies finiraient par bloquer le vrai admin. Les compteurs globaux ne sont
-- jamais effacés par le code.
--
-- Mêmes protections que public.limite_debit : secret serveur exigé, paramètres
-- vérifiés, clé déjà hachée en HMAC par le serveur (jamais d'IP en clair).
create or replace function public.limite_effacer(
  p_secret text,
  p_cle text
)
returns void
language plpgsql
security definer
set search_path = ''
as $fn$
begin
  if not securite.secret_valide(p_secret) then
    raise exception 'accès refusé' using errcode = '42501';
  end if;
  if p_cle is null or char_length(p_cle) not between 1 and 128 then
    raise exception 'paramètres invalides' using errcode = '22023';
  end if;

  delete from securite.limites where cle = p_cle;
end;
$fn$;

revoke all on function public.limite_effacer(text, text) from public;
grant execute on function public.limite_effacer(text, text) to anon, authenticated;
comment on function public.limite_effacer(text, text) is
  'Efface un compteur de limite de débit (securite.limites). Exige le secret serveur.';
