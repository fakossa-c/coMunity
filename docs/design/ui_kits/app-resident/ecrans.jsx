/* Écrans de l'app résident, composés uniquement des composants du système. */
const MOMENTS = { nom: "Moments partagés", icone: "celebration" };
const ETIQUETTES = [{ ton: "vert", icone: "accessible", libelle: "Accès plain-pied" }, { ton: "abricot", icone: "child_care", libelle: "Enfants bienvenus" }];
const avec = (k) => k ? "Inscrite, avec " + k + (k > 1 ? " personnes" : " personne") : "Inscrite";
const RESIDENCE = "Les Reflets de l’Ourcq";
const PasMaquette = ({ children = "Cet état n’est pas encore maquetté." }) => (
  <p style={{ margin: "8px var(--spacing-margin)", fontSize: "var(--text-body-lg)", color: "var(--color-on-surface-variant)" }}>{children}</p>
);

function EcranAccueil({ aller, inscrit, ouvrirMenu }) {
  const { Ecran, BarreNavigation, EnTeteResidence, Salutation, BarreFiltres, PuceFiltre, CarteActivite, TitreSection } = window.DS;
  const [filtre, setFiltre] = React.useState("toutes");
  const P = (id, icone, t) => <PuceFiltre categorie icone={icone} selectionnee={filtre === id} onClick={() => setFiltre(id)}>{t}</PuceFiltre>;
  // Aujourd'hui = samedi 24 octobre dans la maquette ; activités triées par ordre chronologique
  const activites = [
    { quand: "2026-10-24T16:00", jour: "Samedi 24 octobre", aujourdhui: true, filtre: "moments", carte: (
      <CarteActivite key="gouter" photo="photo · goûter au jardin" categorie={MOMENTS} horaire="De 16h00 à 18h30" detailsDepliables
        titre="Le Grand Goûter Crêpes & Jeux" lieu="Jardin partagé" inscrits={8} places={12} etiquettes={ETIQUETTES}
        statut={inscrit ? avec(inscrit) : undefined} actions={inscrit ? "aucune" : "participer"}
        onDetails={() => aller("fiche")} onParticiper={() => aller("fiche")} />) },
    { quand: "2026-10-27T18:00", jour: "Mardi 27 octobre", filtre: "jardin", carte: (
      <CarteActivite key="bouturage" syndic detailsDepliables horaire="À partir de 18h00" titre="Atelier bouturage et plantes d'automne" lieu="Hall principal & Verrière, RDC" />) },
  ].filter((x) => filtre === "toutes" || x.filtre === filtre).sort((x, y) => x.quand.localeCompare(y.quand));
  const jours = [];
  activites.forEach((x) => { const d = jours.find((j) => j.jour === x.jour); d ? d.activites.push(x) : jours.push({ jour: x.jour, aujourdhui: x.aujourdhui, activites: [x] }); });
  return (
    <Ecran barreEtat="9:41" barreBas={<BarreNavigation actif="accueil" onChange={aller} />}>
      <EnTeteResidence residence={RESIDENCE} initiale="D" onProfil={ouvrirMenu} />
      <Salutation prenom="Danielle" adresse="Bât. B, 2e étage." resume="4 activités prévues cette semaine" />
      <BarreFiltres>{P("toutes", null, "Toutes")}{P("moments", "celebration", "Moments partagés")}{P("jardin", "potted_plant", "Jardin & Nature")}</BarreFiltres>
      <div style={{ display: "flex", flexDirection: "column", gap: 28, padding: "0 var(--spacing-margin)" }}>
        {jours.map((j) => (
          <section key={j.jour} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <TitreSection accent={j.aujourdhui}>{j.aujourdhui ? "Aujourd’hui" : j.jour}</TitreSection>
            {j.activites.map((x) => x.carte)}
          </section>
        ))}
      </div>
    </Ecran>
  );
}

function EcranFiche({ retour, inscrire, ouvrirMenu }) {
  const { Ecran, BarreRetour, EmplacementPhoto, Icone, PanneauInfos, ProposePar, EncartPastel, BlocTexte, Bouton, BarreActionFixe, Compteur } = window.DS;
  const [n, setN] = React.useState(2);
  return (
    <Ecran barreEtat="9:41" paddingBas={170} barreBas={
      <BarreActionFixe>
        <Compteur valeur={n} onChange={setN} />
        <Bouton pleineLargeur style={{ fontSize: "var(--text-body-lg)" }} onClick={() => inscrire(n)}>{n ? "Je participe, avec " + n + (n > 1 ? " personnes" : " personne") : "Je participe"}</Bouton>
      </BarreActionFixe>}>
      <BarreRetour onRetour={retour} onPartager={() => {}} initiale="D" onProfil={ouvrirMenu} />
      <div style={{ margin: "0 var(--spacing-margin)" }}><EmplacementPhoto legende="photo · goûter" hauteur={150} arrondi compteur="1 sur 4" /></div>
      <div style={{ padding: "16px var(--spacing-margin) 0", display: "flex", flexDirection: "column", gap: 14 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: "var(--font-headline)", fontSize: "var(--text-label-md)", fontWeight: 700, color: "var(--color-on-surface-variant)" }}>
          <Icone nom="celebration" taille={22} couleur="var(--color-primary)" />Moments partagés · Initiative de résident
        </span>
        <h1 style={{ margin: 0, fontFamily: "var(--font-headline)", fontSize: "var(--text-headline-xl-mobile)", lineHeight: "var(--text-headline-xl-mobile--line-height)", fontWeight: 800, letterSpacing: "-0.01em" }}>Le Grand Goûter Crêpes &amp; Jeux</h1>
        <PanneauInfos lignes={[{ icone: "event", titre: "Samedi 24 octobre", detail: "de 16h00 à 18h30" }, { icone: "location_on", titre: "Jardin partagé", detail: "Entrée par la cour, derrière le bât. B" }]} inscrits={8} places={12} />
        <ProposePar initiale="M" nom="Martine, Bât. A, 1er étage" />
        <EncartPastel>Venez comme vous êtes, seul ou en famille : on fait les crêpes ensemble et les jeux sont pour tous les âges.</EncartPastel>
        <BlocTexte titre="Ce que vous pouvez apporter">Une garniture (confiture, pâte à tartiner, citron), un jeu de société.</BlocTexte>
        <Bouton variante="contour" icone="forum">Relayer sur le groupe WhatsApp</Bouton>
      </div>
    </Ecran>
  );
}

function EcranActivites({ aller, inscrit, annuler, ouvrirMenu }) {
  const { Ecran, BarreNavigation, EnTeteResidence, TitrePage, Onglets, BarreFiltres, PuceFiltre, CarteActivite, BoutonFlottant } = window.DS;
  const [onglet, setOnglet] = React.useState("vais");
  const [periode, setPeriode] = React.useState("avenir");
  return (
    <Ecran barreEtat="9:41" barreBas={<BarreNavigation actif="activites" onChange={aller} />} flottant={<BoutonFlottant />}>
      <EnTeteResidence residence={RESIDENCE} initiale="D" onProfil={ouvrirMenu} />
      <div style={{ padding: "0 var(--spacing-margin)" }}><TitrePage titre="Activités" sousTitre="Vos inscriptions et vos propositions" /></div>
      <BarreFiltres variante="liste" avant={<Onglets onglets={[{ id: "vais", libelle: "J’y vais" }, { id: "organise", libelle: "J’organise" }]} actif={onglet} onChange={setOnglet} />}>
        <PuceFiltre selectionnee={periode === "avenir"} icone="event" onClick={() => setPeriode("avenir")}>À venir</PuceFiltre>
        <PuceFiltre selectionnee={periode === "passees"} icone="history" onClick={() => setPeriode("passees")}>Passées</PuceFiltre>
      </BarreFiltres>
      {onglet === "vais" && periode === "avenir" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 20, padding: "0 var(--spacing-margin)" }}>
          {inscrit !== 0 && <CarteActivite date="Samedi 24 oct. à 16h00" titre="Le Grand Goûter Crêpes & Jeux" lieu="Jardin partagé" statut={avec(inscrit == null ? 2 : inscrit)} onDetails={() => aller("fiche")} onAnnuler={annuler} />}
          <CarteActivite date="Mardi 27 oct. à 18h00" titre="Atelier bouturage et plantes d'automne" lieu="Hall principal & Verrière, RDC" statut="Inscrite" />
        </div>
      ) : <PasMaquette />}
    </Ecran>
  );
}

function EcranAnnonces({ aller, ouvrirMenu }) {
  const { Ecran, BarreNavigation, EnTeteResidence, TitrePage, BarreFiltres, PuceFiltre, CarteAnnonce, Sondage, Bouton } = window.DS;
  const [filtre, setFiltre] = React.useState("toutes");
  const P = (id, icone, t) => <PuceFiltre categorie icone={icone} selectionnee={filtre === id} onClick={() => setFiltre(id)}>{t}</PuceFiltre>;
  const voir = (t) => filtre === "toutes" || filtre === t;
  return (
    <Ecran barreEtat="9:41" barreBas={<BarreNavigation actif="annonces" onChange={aller} />}>
      <EnTeteResidence residence={RESIDENCE} initiale="D" onProfil={ouvrirMenu} />
      <div style={{ padding: "0 var(--spacing-margin)" }}><TitrePage titre="Annonces" sousTitre="Les informations du syndic" /></div>
      <BarreFiltres>{P("toutes", null, "Toutes")}{P("ag", "groups", "Assemblées")}{P("sondage", "how_to_vote", "Sondages")}{P("travaux", "construction", "Travaux & infos")}</BarreFiltres>
      <div style={{ display: "flex", flexDirection: "column", gap: 20, padding: "0 var(--spacing-margin)" }}>
        {voir("ag") && <CarteAnnonce type="ag" nouvelle publiee="Publiée le 20 oct. par le syndic" titre="Assemblée générale annuelle"
          texte="L’ordre du jour et les documents sont disponibles. Si vous ne pouvez pas venir, vous pouvez donner pouvoir à un voisin."
          infos={[{ icone: "event", titre: "Jeudi 12 novembre à 18h30" }, { icone: "location_on", titre: "Salle commune", detail: "Rez-de-chaussée, bât. A" }]}
          actions={<Bouton variante="contour" icone="description">Lire la convocation</Bouton>} />}
        {voir("sondage") && <CarteAnnonce type="sondage" nouvelle publiee="Publiée le 18 oct. par le syndic" titre="Horaires du local vélos"
          texte="Le conseil syndical souhaite revoir les horaires d’accès au local vélos. Donnez votre avis.">
          <Sondage question="Quel créneau vous convient le mieux ?" options={[{ libelle: "7h à 21h", votes: 9 }, { libelle: "6h à 23h", votes: 11 }, { libelle: "Accès 24h/24", votes: 3 }]} echeance="30 octobre" />
        </CarteAnnonce>}
        {voir("travaux") && <CarteAnnonce type="travaux" publiee="Publiée le 15 oct. par le syndic" titre="Rénovation du hall d’entrée"
          texte="Pendant les travaux, l’entrée se fait par la porte de la cour. L’ascenseur reste en service."
          infos={[{ icone: "date_range", titre: "Du 2 au 20 novembre", detail: "En semaine, de 8h à 17h" }]}
          actions={<Bouton variante="contour" icone="forum">Relayer sur le groupe WhatsApp</Bouton>} />}
        {voir("travaux") && <CarteAnnonce type="info" publiee="Publiée le 8 oct. par le syndic" titre="Relevé des compteurs d’eau"
          texte="Le technicien passera dans les appartements le mardi 3 novembre entre 9h et 12h. Merci de laisser l’accès aux compteurs." />}
      </div>
    </Ecran>
  );
}

/* Rubriques du MenuProfil (hors Profil) : pas encore maquettées */
const RUBRIQUES_MENU = { syndic: { titre: "Mon syndic", detail: "Contacts et demandes" }, copro: { titre: "Ma copro", detail: "Résidence, conseil syndical, documents" } };
function EcranRubrique({ ecran, retour, ouvrirMenu }) {
  const { Ecran, BarreRetour, TitrePage } = window.DS;
  const m = RUBRIQUES_MENU[ecran] || { titre: ecran };
  return (
    <Ecran barreEtat="9:41">
      <BarreRetour onRetour={retour} onPartager={null} initiale="D" onProfil={ouvrirMenu} />
      <div style={{ padding: "0 var(--spacing-margin)" }}><TitrePage titre={m.titre} sousTitre={m.detail} /></div>
      <PasMaquette>Cette page n’est pas encore maquettée.</PasMaquette>
    </Ecran>
  );
}

const RUBRIQUES_PROFIL = [
  { id: "identifiants", icone: "key", titre: "Mes identifiants" },
  { id: "informations", icone: "badge", titre: "Mes informations", detail: "Contrôlez les informations partagées" },
  { id: "interets", icone: "interests", titre: "Mes intérêts", detail: "Partagez vos intérêts avec les résidents" },
  { id: "reglages", icone: "tune", titre: "Mes réglages", detail: "Adaptez l’application à votre usage" },
];

function CadreRubrique({ id, retour, ouvrirMenu, children }) {
  const { Ecran, BarreRetour, TitrePage } = window.DS;
  const r = RUBRIQUES_PROFIL.find((x) => x.id === id);
  return (
    <Ecran barreEtat="9:41" paddingBas={40}>
      <BarreRetour libelleRetour="Profil" onRetour={retour} onPartager={null} initiale="D" onProfil={ouvrirMenu} />
      <div style={{ padding: "0 var(--spacing-margin)", display: "flex", flexDirection: "column", gap: 20 }}>
        <TitrePage titre={r.titre} sousTitre={r.detail} />
        {children}
      </div>
    </Ecran>
  );
}

function EcranProfil({ aller, retour, ouvrirMenu }) {
  const { Ecran, BarreRetour, EnTeteProfil, LigneMenu } = window.DS;
  return (
    <Ecran barreEtat="9:41" paddingBas={40}>
      <BarreRetour onRetour={retour} onPartager={null} initiale="D" onProfil={ouvrirMenu} />
      <div style={{ padding: "8px var(--spacing-margin) 0", display: "flex", flexDirection: "column", gap: 24 }}>
        <EnTeteProfil initiale="D" nom="Danielle" adresse="Bât. B, 2e étage" />
        <nav style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {RUBRIQUES_PROFIL.map((m) => <LigneMenu key={m.id} icone={m.icone} titre={m.titre} detail={m.detail} onClick={() => aller(m.id)} />)}
        </nav>
      </div>
    </Ecran>
  );
}

function EcranIdentifiants(props) {
  const { Bouton, CarteLignes } = window.DS;
  const [confirmer, setConfirmer] = React.useState(false);
  const modifier = (id, quoi) => <Bouton variante="fantome" style={{ padding: "0 12px" }} onClick={() => props.aller(id)} aria-label={"Modifier " + quoi}>Modifier</Bouton>;
  return (
    <CadreRubrique id="identifiants" {...props}>
      <CarteLignes lignes={[
        { cle: "mail", icone: "mail", titre: "E-mail", detail: "danielle.m@exemple.fr", fin: modifier("modifier-email", "l’e-mail") },
        { cle: "mdp", icone: "lock", titre: "Mot de passe", detail: "••••••••", fin: modifier("modifier-mdp", "le mot de passe") },
      ]} />
      <Bouton variante="contour" icone="logout" pleineLargeur>Se déconnecter</Bouton>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12, paddingTop: 20, borderTop: "var(--bordure-carte)" }}>
        {confirmer ? (
          <>
            <p style={{ margin: 0, fontSize: "var(--text-body-lg)" }}>Supprimer votre compte efface vos informations, vos inscriptions et vos propositions d’activités. Cette action est définitive.</p>
            <Bouton variante="danger" icone="delete" pleineLargeur>Oui, supprimer mon compte</Bouton>
            <Bouton variante="contour" pleineLargeur onClick={() => setConfirmer(false)}>Garder mon compte</Bouton>
          </>
        ) : (
          <Bouton variante="fantome" icone="delete" pleineLargeur onClick={() => setConfirmer(true)} style={{ color: "var(--color-error)" }}>Supprimer mon compte</Bouton>
        )}
      </div>
    </CadreRubrique>
  );
}

const CHAMPS = [
  { k: "pseudo", icone: "alternate_email", titre: "Pseudo", valeur: "Dany", toujours: true },
  { k: "prenom", icone: "person", titre: "Prénom", valeur: "Danielle" },
  { k: "nom", icone: "badge", titre: "Nom", valeur: "Martin" },
  { k: "telephone", icone: "call", titre: "Téléphone", valeur: "06 12 34 56 78" },
  { k: "batiment", icone: "apartment", titre: "Bâtiment", valeur: "Bât. B, 2e étage" },
];

function EcranInformations(props) {
  const { EncartPastel, Bouton, CarteLignes, BoutonVisibilite } = window.DS;
  const [vis, setVis] = React.useState({ pseudo: true, prenom: true, nom: false, telephone: false, batiment: true });
  const estVisible = (c) => c.toujours || vis[c.k];
  const resume = CHAMPS.filter(estVisible).map((c) => c.titre.toLowerCase()).join(", ").replace(/, ([^,]*)$/, " et $1");
  return (
    <CadreRubrique id="informations" {...props}>
      <EncartPastel>Les voisins voient votre {resume}.</EncartPastel>
      <CarteLignes lignes={CHAMPS.map((c) => ({ cle: c.k, icone: c.icone, titre: c.titre, detail: c.valeur,
        fin: <BoutonVisibilite visible={estVisible(c)} verrou={c.toujours} libelle={c.titre} onClick={() => setVis({ ...vis, [c.k]: !vis[c.k] })} /> }))} />
      <p style={{ margin: 0, fontSize: "var(--text-body-md)", color: "var(--color-on-surface-variant)" }}>Votre pseudo est toujours visible : c’est ainsi que les voisins vous reconnaissent. Le syndic voit toutes vos informations.</p>
      <Bouton variante="contour" icone="edit" pleineLargeur onClick={() => props.aller("modifier-infos")}>Modifier mes informations</Bouton>
    </CadreRubrique>
  );
}

function EcranInterets(props) {
  return <CadreRubrique id="interets" {...props}><p style={{ margin: 0, fontSize: "var(--text-body-lg)", color: "var(--color-on-surface-variant)" }}>Cette rubrique n’est pas encore maquettée.</p></CadreRubrique>;
}

function EcranReglages({ grand, basculerTaille, theme, setTheme, ...props }) {
  const { ChoixSegmente, TitreSection } = window.DS;
  const A = (px) => <span aria-hidden="true" style={{ fontSize: px, lineHeight: 1, fontWeight: 800 }}>A</span>;
  return (
    <CadreRubrique id="reglages" {...props}>
      <section>
        <TitreSection style={{ marginBottom: 10 }}>Taille des caractères</TitreSection>
        <ChoixSegmente libelle="Taille des caractères" valeur={grand ? "grands" : "standard"} onChange={(v) => { if ((v === "grands") !== grand) basculerTaille(); }}
          options={[{ id: "standard", libelle: "Standard", visuel: A(20) }, { id: "grands", libelle: "Grands", visuel: A(28) }]} />
      </section>
      <section>
        <TitreSection style={{ marginBottom: 10 }}>Apparence</TitreSection>
        <ChoixSegmente libelle="Apparence" valeur={theme} onChange={setTheme}
          options={[{ id: "clair", libelle: "Clair", icone: "light_mode" }, { id: "sombre", libelle: "Sombre", icone: "dark_mode" }]} />
      </section>
    </CadreRubrique>
  );
}

function CadreModif({ titre, sousTitre, retour, ouvrirMenu, children }) {
  const { Ecran, BarreRetour, TitrePage, BarreActionFixe, Bouton } = window.DS;
  return (
    <Ecran barreEtat="9:41" paddingBas={170} barreBas={
      <BarreActionFixe><Bouton pleineLargeur style={{ fontSize: "var(--text-body-lg)" }} onClick={retour}>Enregistrer</Bouton></BarreActionFixe>}>
      <BarreRetour libelleRetour="Annuler" onRetour={retour} onPartager={null} initiale="D" onProfil={ouvrirMenu} />
      <div style={{ padding: "0 var(--spacing-margin)", display: "flex", flexDirection: "column", gap: 20 }}>
        <TitrePage titre={titre} sousTitre={sousTitre} />
        {children}
      </div>
    </Ecran>
  );
}

function EcranModifierEmail(props) {
  const { Champ } = window.DS;
  return (
    <CadreModif titre="Modifier l’e-mail" {...props}>
      <Champ libelle="E-mail actuel" valeur="danielle.m@exemple.fr" type="email" />
      <Champ libelle="Nouvel e-mail" type="email" autoComplete="email" aide="Vous recevrez un lien de confirmation à cette adresse." />
      <Champ libelle="Mot de passe" secret autoComplete="current-password" aide="Pour confirmer que c’est bien vous." />
    </CadreModif>
  );
}

function EcranModifierMotDePasse(props) {
  const { Champ } = window.DS;
  return (
    <CadreModif titre="Modifier le mot de passe" {...props}>
      <Champ libelle="Mot de passe actuel" secret autoComplete="current-password" />
      <Champ libelle="Nouveau mot de passe" secret autoComplete="new-password" aide="8 caractères minimum." />
      <Champ libelle="Confirmer le nouveau mot de passe" secret autoComplete="new-password" />
    </CadreModif>
  );
}

function EcranModifierInfos(props) {
  const { Champ } = window.DS;
  return (
    <CadreModif titre="Modifier mes informations" {...props}>
      <Champ libelle="Pseudo" valeur="Dany" aide="Toujours visible par les voisins." />
      <Champ libelle="Prénom" valeur="Danielle" autoComplete="given-name" />
      <Champ libelle="Nom" valeur="Martin" autoComplete="family-name" />
      <Champ libelle="Téléphone" valeur="06 12 34 56 78" type="tel" inputMode="tel" autoComplete="tel" />
      <Champ libelle="Bâtiment" valeur="Bât. B" options={["Bât. A", "Bât. B", "Bât. C"]} />
      <Champ libelle="Étage" valeur="2e étage" />
    </CadreModif>
  );
}

Object.assign(window, { EcranAccueil, EcranFiche, EcranActivites, EcranAnnonces, EcranRubrique, EcranProfil, EcranIdentifiants, EcranInformations, EcranInterets, EcranReglages, EcranModifierEmail, EcranModifierMotDePasse, EcranModifierInfos });
