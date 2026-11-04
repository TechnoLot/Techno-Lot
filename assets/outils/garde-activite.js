/*
 * Garde d'inactivité de l'admin : après 1 h sans activité RÉELLE (souris,
 * clavier, molette, tactile), déconnexion et retour à la page de connexion.
 * Les sondages automatiques (notifications toutes les 30 s) ne comptent pas :
 * ils gardaient la session ouverte indéfiniment.
 *
 * Une seule implémentation pour toutes les pages : components/admin/GardeInactivite.tsx
 * l'importe dans la coque React de l'admin, et lib/admin/outils.ts l'insère dans
 * les outils en iframe (marqueur data-inclure), dont les événements ne remontent
 * pas à la page parente. Script classique, sans dépendance ; aucun accès au DOM
 * au chargement (le module est aussi évalué au rendu serveur), tout se passe dans
 * demarrer(). Expose globalThis.GardeActivite ; testé dans
 * tests/securite/inactivite.test.ts.
 *
 * L'heure de la dernière activité est partagée par localStorage entre onglets et
 * iframes. Côté serveur, le signal (POST /api/admin/activite, au plus toutes les
 * 5 min) alimente la tâche securite-sessions-inactives, qui ferme la session même
 * si cette page ne tourne plus (migration 20261104120000_sessions_activite_reelle.sql).
 */
(function (racine) {
  "use strict";

  var DELAI_INACTIVITE_MS = 60 * 60 * 1000;
  var INTERVALLE_SIGNAL_MS = 5 * 60 * 1000;
  var TICK_MS = 15 * 1000;
  /** Écriture dans le stockage partagé au plus toutes les 5 s (la mémoire suit chaque événement). */
  var ECRITURE_MS = 5 * 1000;
  /** Un serveur qui ne répond pas ne doit pas retenir la redirection. */
  var ATTENTE_DECONNEXION_MS = 5 * 1000;

  var CLE_ACTIVITE = "tl_admin_activite";
  var CLE_SIGNAL = "tl_admin_activite_signal";

  /** Pas de « scroll » : il peut venir du code de la page. */
  var EVENEMENTS = ["pointerdown", "pointermove", "keydown", "wheel", "touchstart", "touchmove", "input"];
  var OPTIONS = { capture: true, passive: true };

  /** Heure lue dans le stockage, 0 si absente, illisible ou dans le futur (horloge reculée). */
  function lire(cle) {
    try {
      var v = Number(window.localStorage.getItem(cle));
      return Number.isFinite(v) && v > 0 && v <= Date.now() ? v : 0;
    } catch (e) {
      return 0;
    }
  }

  function ecrire(cle, t) {
    try {
      window.localStorage.setItem(cle, String(t));
    } catch (e) {
      // Stockage indisponible : la mémoire de la page sert de repli.
    }
  }

  function dansIframe() {
    try {
      return window.top !== window.self;
    } catch (e) {
      return true;
    }
  }

  /** Démarre la garde sur cette page ; renvoie la fonction d'arrêt. */
  function demarrer() {
    var memoire = 0;
    var memoireSignal = 0;
    var dernierEcrit = 0;
    var expire = false;
    var dernierX = null;
    var dernierY = null;

    /** La mémoire d'abord : le stockage n'est lu que si elle dit le délai dépassé. */
    function delaiDepasse(t) {
      return t - memoire >= DELAI_INACTIVITE_MS && t - lire(CLE_ACTIVITE) >= DELAI_INACTIVITE_MS;
    }

    /** Réponse ignorée, erreurs avalées : une panne passagère ne déconnecte jamais. */
    function signaler(t) {
      if (t - memoireSignal < INTERVALLE_SIGNAL_MS) return;
      memoireSignal = Math.max(memoireSignal, lire(CLE_SIGNAL));
      if (t - memoireSignal < INTERVALLE_SIGNAL_MS) return;
      memoireSignal = t;
      ecrire(CLE_SIGNAL, t);
      try {
        fetch("/api/admin/activite", { method: "POST", credentials: "same-origin", keepalive: true }).catch(function () {});
      } catch (e) {
        // Rien : prochain essai à la prochaine activité, dans 5 min.
      }
    }

    function noter(t, immediat) {
      memoire = t;
      if (immediat || t - dernierEcrit >= ECRITURE_MS) {
        dernierEcrit = t;
        ecrire(CLE_ACTIVITE, t);
      }
      signaler(t);
    }

    function rediriger() {
      window.location.replace(
        "/admin/login?error=inactivite&next=" + encodeURIComponent(window.location.pathname + window.location.search),
      );
    }

    /** Une seule fois par page ; dans une iframe, c'est la page parente qui s'en charge. */
    function expirer() {
      if (expire || dansIframe()) return;
      expire = true;
      var fini = false;
      function fin() {
        if (fini) return;
        fini = true;
        rediriger();
      }
      setTimeout(fin, ATTENTE_DECONNEXION_MS);
      try {
        fetch("/admin/auth/signout?raison=inactivite", {
          method: "POST",
          credentials: "same-origin",
          redirect: "manual",
        }).then(fin, fin);
      } catch (e) {
        fin();
      }
    }

    /** Vrai si le délai est dépassé (déconnexion lancée) : rien à noter alors. */
    function verifier() {
      if (expire) return true;
      if (!delaiDepasse(Date.now())) return false;
      expirer();
      return true;
    }

    function surActivite(e) {
      if (!e.isTrusted) return;
      if (e.type === "pointermove") {
        // Chrome envoie de faux déplacements quand le contenu change sous une
        // souris immobile, et les notifications changent la page toutes les 30 s.
        // Le premier déplacement ne sert que de point de départ.
        var immobile = dernierX === null || (e.screenX === dernierX && e.screenY === dernierY);
        dernierX = e.screenX;
        dernierY = e.screenY;
        if (immobile) return;
      }
      // D'abord le délai : au retour d'une veille de 3 h, le premier mouvement
      // de souris déconnecte au lieu d'effacer l'inactivité (dans une iframe, il
      // est ignoré : la page parente déconnecte à sa prochaine vérification).
      if (verifier()) return;
      noter(Date.now(), false);
    }

    function surRetour() {
      // Revenue du cache après expiration : la page ne doit pas rester affichée.
      if (expire) rediriger();
      else verifier();
    }

    // Un chargement de page compte comme une activité : un horodatage périmé
    // d'une session précédente ne peut donc pas créer de boucle de déconnexion.
    noter(Date.now(), true);

    EVENEMENTS.forEach(function (nom) {
      window.addEventListener(nom, surActivite, OPTIONS);
    });
    var minuterie = setInterval(verifier, TICK_MS);
    document.addEventListener("visibilitychange", verifier);
    window.addEventListener("focus", verifier);
    window.addEventListener("pageshow", surRetour);

    return function arreter() {
      EVENEMENTS.forEach(function (nom) {
        window.removeEventListener(nom, surActivite, OPTIONS);
      });
      clearInterval(minuterie);
      document.removeEventListener("visibilitychange", verifier);
      window.removeEventListener("focus", verifier);
      window.removeEventListener("pageshow", surRetour);
    };
  }

  racine.GardeActivite = Object.freeze({
    DELAI_INACTIVITE_MS: DELAI_INACTIVITE_MS,
    INTERVALLE_SIGNAL_MS: INTERVALLE_SIGNAL_MS,
    TICK_MS: TICK_MS,
    CLE_ACTIVITE: CLE_ACTIVITE,
    CLE_SIGNAL: CLE_SIGNAL,
    demarrer: demarrer,
  });
})(typeof globalThis !== "undefined" ? globalThis : this);
