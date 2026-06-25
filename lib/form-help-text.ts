/**
 * Contextual help text for form fields across the app.
 * Used to clarify complex concepts and guide users through workflows.
 */

export const FORM_HELP_TEXT = {
  children: {
    name: "Le prénom ou surnom de l'enfant. Visible par tous.",
    isChild: "Cochez si c'est un enfant. Les parents/tuteurs doivent être décochés.",
    color: "Couleur unique pour identifier cette personne dans le calendrier.",
  },
  rules: {
    type: {
      weekly_alternating: "Les enfants alternent chaque semaine (ex: lun-mer avec parent A, jeu-dim avec parent B)",
      custom_cycle: "Les enfants restent plusieurs semaines avec chaque parent (ex: 2 semaines chacun)",
      manual: "Périodes ponctuelles sans récurrence. Utile pour arrangements irréguliers.",
    },
    startDate: "La date à laquelle ce schéma commence.",
    endDate: "Optionnel: date de fin de ce schéma. Laissez vide s'il continue indéfiniment.",
    label: "Un nom simple pour cette règle (ex: 'Rotation initiale', 'Schéma d'été')",
  },
  exceptions: {
    type: {
      cancel: "Supprime un jour/période de garde. Les enfants restent avec le parent actuel.",
      move: "Déplace une période de garde à une autre date.",
      extend: "Prolonge une période de garde (ex: quelques jours supplémentaires).",
      shorten: "Raccourcit une période de garde.",
      add: "Ajoute une nouvelle période de garde en dehors des règles normales.",
    },
    reason: "Optionnel: notez pourquoi cette exception (ex: 'Urgence', 'Vacances').",
    date: "La date concernée par cette exception.",
  },
  custody: {
    personId: "Qui a les enfants pendant cette période?",
    startAt: "Quand cette période commence-t-elle? Incluez l'heure si possible.",
    endAt: "Quand cette période se termine-t-elle? Incluez l'heure si possible.",
    location: "Optionnel: lieu de changement (ex: 'École', 'Maison de maman').",
  },
  transitions: {
    direction: "pickup = le parent récupère les enfants. dropoff = le parent dépose les enfants.",
    location: "Où se fait le changement? (ex: 'Porte de l'école', 'Maison')",
    time: "À quelle heure exactement se fait le changement?",
  },
  events: {
    title: "Titre court et clair de l'événement.",
    description: "Détails supplémentaires si nécessaire.",
    isAllDay: "Cochez si l'événement n'a pas d'heure précise (ex: anniversaire, sortie scolaire).",
    owner: "Optionnel: si laissé vide, l'événement est partagé avec tout le monde.",
    participants: "Qui participe? Sélectionnez les personnes concernées.",
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
