/**
 * Contextual help text for form fields across the app.
 * Used to clarify complex concepts and guide users through workflows.
 */

export const FORM_HELP_TEXT = {
  children: {
    name: "Le prénom ou surnom de l'enfant. Visible par tous.",
    dateOfBirth: "Optionnel: date de naissance de l'enfant.",
    isChild: "Cochez si c'est un enfant. Les parents/tuteurs doivent être décochés.",
    color: "Couleur unique pour identifier cette personne dans le calendrier.",
  },
  rules: {
    personId: "Qui a les enfants selon cette règle?",
    label: "Un nom simple pour cette règle (ex: 'Rotation initiale', 'Schéma d'été')",
    type: {
      weekly_alternating: "Les enfants alternent chaque semaine (ex: lun-mer avec parent A, jeu-dim avec parent B)",
      custom_cycle: "Les enfants restent plusieurs semaines avec chaque parent (ex: 2 semaines chacun)",
      manual: "Périodes ponctuelles sans récurrence. Utile pour arrangements irréguliers.",
    },
    startDate: "La date à laquelle ce schéma commence.",
    endDate: "Optionnel: date de fin de ce schéma. Laissez vide s'il continue indéfiniment.",
    custodyStartTime: "Heure habituelle de début de garde (ex: 18:00).",
    custodyEndTime: "Heure habituelle de fin de garde (ex: 18:00).",
    handoffDay: "Le jour de la semaine où la garde change de personne.",
    weekParity: "Semaines ISO impaires ou paires. Important pour les garde alternées.",
    cycleLengthDays: "Durée totale du cycle en jours (ex: 14 pour 2 semaines chacun).",
    handoffLocation: "Optionnel: lieu de changement (ex: 'École', 'Gare').",
  },
  exceptions: {
    ruleId: "Choisissez la règle à laquelle cette exception s'applique.",
    personId: "Qui aura les enfants selon cette exception?",
    type: {
      cancel: "Supprime un jour/période de garde. Les enfants restent avec le parent actuel.",
      move: "Déplace une période de garde à une autre date.",
      extend: "Prolonge une période de garde (ex: quelques jours supplémentaires).",
      shorten: "Raccourcit une période de garde.",
      add: "Ajoute une nouvelle période de garde en dehors des règles normales.",
    },
    originalStartAt: "La date originale de la période à modifier (selon la règle normale).",
    overrideStartAt: "Nouvelle date/heure de début pour cette exception.",
    overrideEndAt: "Nouvelle date/heure de fin pour cette exception.",
    reason: "Optionnel: notez pourquoi cette exception (ex: 'Urgence', 'Vacances').",
    notes: "Optionnel: notes supplémentaires.",
  },
  custody: {
    personId: "Qui a les enfants pendant cette période?",
    startAt: "Quand cette période commence-t-elle? Incluez l'heure si possible.",
    endAt: "Quand cette période se termine-t-elle? Incluez l'heure si possible.",
    notes: "Optionnel: notes ou informations supplémentaires.",
    location: "Optionnel: lieu de changement (ex: 'École', 'Maison de maman').",
  },
  transitions: {
    personId: "Qui fait le changement (récupération ou dépôt)?",
    transitionAt: "À quelle heure exactement se fait le changement?",
    direction: "Récupération = le parent récupère. Dépôt = le parent dépose.",
    location: "Où se fait le changement? (ex: 'École', 'Gare', 'Maison')",
  },
  events: {
    title: "Titre court et clair de l'événement.",
    isAllDay: "Cochez si l'événement n'a pas d'heure précise (ex: anniversaire, sortie scolaire).",
    startDate: "Date de l'événement sur une journée entière.",
    startAt: "Heure exacte du début de l'événement.",
    endAt: "Heure exacte de la fin de l'événement.",
    location: "Optionnel: lieu de l'événement (ex: 'École', 'Maison de Damien').",
    description: "Détails supplémentaires si nécessaire.",
    isBlocking: "Marquez comme bloquant pour empêcher les changements de garde ce jour-là.",
    participants: "Qui participe? Sélectionnez les personnes concernées.",
    attachments: "Partagez des photos, documents ou reçus. Optionnel.",
  },
} as const

export const SECTION_HELP_TEXT = {
  children: "Ajoutez chaque enfant et chaque parent/tuteur. Chacun reçoit une couleur unique pour être facile à identifier.",
  rules: "Vos schémas de garde récurrents. C'est la base de votre calendrier. Vous pouvez avoir plusieurs règles pour différentes périodes (été, hiver, école, etc.).",
  exceptions: "Des changements ponctuels à vos règles normales. Par exemple, un échange de semaine, une urgence, ou des vacances scolaires.",
  custody: "Périodes de garde manuelles qui ne suivent pas une règle récurrente. Vous pouvez aussi définir les lieux et heures de changement ici.",
  events: "Événements partagés avec votre co-parent (anniversaires, sorties scolaires) ou événements individuels. Vous pouvez partager des fichiers (photos, documents).",
  activity: "Historique de tous les changements apportés à votre planning. Utile pour revoir qui a modifié quoi et quand.",
  integrations: "Synchronisez automatiquement votre planning Famille Sync avec Google Agenda. Tout le monde voit toujours l'agenda à jour.",
} as const

export const EMPTY_STATE_HELP_TEXT = {
  noChildren: "Aucun enfant. Commencez par ajouter vos enfants et co-parents.",
  noRules: "Aucune règle de garde. Créez votre première règle pour voir votre calendrier.",
  noExceptions: "Aucune exception. Cela signifie que votre schéma normal s'applique.",
  noEvents: "Aucun événement. Créez le premier en cliquant le bouton ci-dessous.",
  noCustodyPeriods: "Aucune période de garde manuelle. Elles seront générées depuis vos règles.",
} as const
