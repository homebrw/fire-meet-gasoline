import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export const metadata = {
  title: "Aide - Famille Sync",
}

export default function HelpPage() {
  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      <div className="max-w-3xl mx-auto p-4 md:p-6">
        <Link href="/today">
          <Button variant="ghost" size="sm" className="gap-2 mb-6">
            <ArrowLeft className="h-4 w-4" />
            Retour
          </Button>
        </Link>

        <article className="prose prose-sm dark:prose-invert max-w-none">
          <h1>Guide d'Aide - Famille Sync</h1>

          <section>
            <h2>Bienvenue dans Famille Sync</h2>
            <p>
              Famille Sync aide les familles recomposées à gérer les planning de garde et les événements partagés.
              Cette application rend la coordination simple, claire et sans stress.
            </p>
          </section>

          <section>
            <h2>Première Utilisation (3 Minutes)</h2>

            <h3>Étape 1: Créez votre famille</h3>
            <ol>
              <li>Allez dans <strong>Paramètres</strong> → <strong>Enfants</strong></li>
              <li>Cliquez <strong>+ Ajouter</strong></li>
              <li>Entrez le nom de chaque enfant et chaque parent/tuteur</li>
              <li>Chacun reçoit une <strong>couleur unique</strong> (important pour le calendrier)</li>
            </ol>

            <h3>Étape 2: Configurez votre schéma de garde</h3>
            <ol>
              <li>Allez dans <strong>Paramètres</strong> → <strong>Règles de garde</strong></li>
              <li>Cliquez <strong>+ Nouvelle règle</strong></li>
              <li>Choisissez votre type:
                <ul>
                  <li><strong>Alternance hebdomadaire</strong>: par ex., lun-mer avec Damien, jeu-dim avec Ma</li>
                  <li><strong>Cycle personnalisé</strong>: par ex., 2 semaines avec Damien, 2 semaines avec Ma</li>
                  <li><strong>Manuel</strong>: périodes ponctuelles sans récurrence</li>
                </ul>
              </li>
              <li>Sauvegardez</li>
            </ol>

            <h3>Étape 3: Consultez votre calendrier</h3>
            <ol>
              <li>Allez dans <strong>Aujourd'hui</strong> ou <strong>Semaine</strong></li>
              <li>Vous verrez qui a les enfants à chaque moment</li>
              <li>Les couleurs correspondent aux parents (bleu = Damien, rose = Ma, cyan = ensemble)</li>
            </ol>

            <p>✓ Terminé! Vous pouvez maintenant commencer à utiliser Famille Sync.</p>
          </section>

          <section>
            <h2>Les 5 Concepts Clés</h2>

            <h3>1. Enfants &amp; Personnes</h3>
            <p>Chaque enfant et chaque parent/tuteur dans votre famille.</p>
            <ul>
              <li><strong>Où</strong>: Paramètres → Enfants</li>
              <li><strong>À faire</strong>: Donnez à chacun un nom et une couleur unique</li>
              <li><strong>Pourquoi</strong>: Les couleurs aident à identifier qui a les enfants dans le calendrier</li>
            </ul>

            <h3>2. Règles de Garde</h3>
            <p>Vos schémas récurrents: qui a les enfants, quand et pendant combien de temps.</p>
            <ul>
              <li><strong>Où</strong>: Paramètres → Règles de garde</li>
              <li><strong>Types</strong>:
                <ul>
                  <li><strong>Hebdomadaire</strong>: rotation chaque semaine (ex: lun-mer / jeu-dim)</li>
                  <li><strong>Cycle</strong>: périodes plus longues (ex: 2 sem. / 2 sem.)</li>
                  <li><strong>Manuel</strong>: périodes ponctuelles</li>
                </ul>
              </li>
            </ul>
            <p><strong>Exemple</strong>: "Damien a les enfants lundi, mardi, mercredi. Ma a jeudi, vendredi, samedi, dimanche."</p>

            <h3>3. Exceptions</h3>
            <p>Changements ponctuels à vos règles normales.</p>
            <ul>
              <li><strong>Où</strong>: Paramètres → Exceptions</li>
              <li><strong>Types</strong>:
                <ul>
                  <li><strong>Annuler</strong>: supprimer un jour de garde (les enfants restent avec le parent actuel)</li>
                  <li><strong>Reporter</strong>: déplacer une période à une autre date</li>
                  <li><strong>Prolonger</strong>: ajouter des jours (ex: "Garde supplémentaire jeudi-vendredi")</li>
                  <li><strong>Raccourcir</strong>: retirer des jours</li>
                  <li><strong>Ajouter</strong>: créer une période en dehors des règles normales</li>
                </ul>
              </li>
            </ul>

            <h3>4. Périodes de Garde</h3>
            <p>Les périodes générées à partir de vos règles, ou ajoutées manuellement. Incluent les heures et lieux de changement.</p>
            <ul>
              <li><strong>Où</strong>: Paramètres → Gardes manuelles (pour les périodes non-récurrentes)</li>
              <li><strong>À inclure</strong>:
                <ul>
                  <li>Qui a les enfants</li>
                  <li>Quand (date et heure)</li>
                  <li>Où (lieu de changement)</li>
                </ul>
              </li>
            </ul>

            <h3>5. Événements</h3>
            <p>Événements partagés (anniversaires, sorties scolaires) ou individuels avec pièces jointes.</p>
            <ul>
              <li><strong>Où</strong>: Paramètres → Événements</li>
              <li><strong>Types</strong>:
                <ul>
                  <li><strong>Événement partagé</strong>: tout le monde le voit</li>
                  <li><strong>Événement personnel</strong>: seulement le propriétaire</li>
                </ul>
              </li>
              <li><strong>Bonus</strong>: Partagez des photos, documents, reçus en attachant des fichiers</li>
            </ul>
          </section>

          <section>
            <h2>Conseils pour Bien Utiliser Famille Sync</h2>

            <h3>✓ À Faire</h3>
            <ul>
              <li><strong>Soyez précis sur les heures</strong>: "Lundi 8h-mercredi 18h" est clair. Pas de confusion.</li>
              <li><strong>Définissez les lieux de changement</strong>: Cela évite les questions de dernière minute.</li>
              <li><strong>Ajoutez des événements partagés</strong>: Anniversaires, sorties scolaires, jours fériés.</li>
              <li><strong>Mettez à jour les exceptions rapidement</strong>: Un échange dès que décidé, pas au dernier moment.</li>
              <li><strong>Synchronisez avec Google Agenda</strong>: Tout le monde est à jour, pas de doublons oubliés.</li>
            </ul>

            <h3>✗ À Éviter</h3>
            <ul>
              <li><strong>Ne changez pas votre schéma sans exception</strong>: Utilisez Exceptions pour les changements ponctuels, pas Règles.</li>
              <li><strong>Ne créez pas deux périodes chevauchantes</strong>: Famille Sync n'aime pas l'ambiguïté ("Qui a l'enfant à 15h?")</li>
              <li><strong>Ne laissez pas les détails flous</strong>: "Lundi avec Damien" est vague. "Lundi 8h école à mercredi 18h maison" est clair.</li>
            </ul>
          </section>

          <section>
            <h2>Questions Fréquentes</h2>

            <h3>Puis-je voir le planning du mois prochain?</h3>
            <p>Oui! Allez dans <strong>Calendrier</strong> ou <strong>Semaine</strong> et naviguez avec les flèches.</p>

            <h3>Que se passe-t-il si je supprime une règle?</h3>
            <p>Elle disparaît. Tous les jours basés sur cette règle disparaissent. Si c'était important, créez une Exception à la place.</p>

            <h3>Comment ajouter un troisième parent?</h3>
            <p>Allez dans <strong>Paramètres</strong> → <strong>Enfants</strong> et cliquez <strong>+ Ajouter personne</strong>.</p>

            <h3>Puis-je avoir des enfants avec des schémas différents?</h3>
            <p>Non pour l'instant. Tout le monde partage le même schéma. Une feature à venir!</p>

            <h3>Qu'est-ce qu'un "Événement bloquant"?</h3>
            <p>C'est un événement qui empêche quelqu'un d'avoir les enfants ce jour-là. Par exemple, un médecin importante ou une absence. Famille Sync le note avec une pastille.</p>

            <h3>Comment supprimer mon compte?</h3>
            <p>Allez dans <strong>Paramètres</strong> → <strong>Sécurité</strong> (feature à venir). Pour l'instant, contactez le support.</p>
          </section>

          <section>
            <h2>Besoin d'Aide?</h2>

            <p><strong>Cherchez le <code>?</code> sur chaque page.</strong> Cliquez pour voir l'aide contextuelle spécifique à cette page.</p>

            <p>Ou relisez ce guide!</p>
          </section>
        </article>
      </div>

      <style>{`
        .prose {
          color: var(--color-foreground);
        }
        .prose a {
          color: var(--color-accent);
        }
        .prose strong {
          color: var(--color-foreground);
          font-weight: 600;
        }
        .prose h1, .prose h2, .prose h3 {
          color: var(--color-foreground);
          margin-top: 1.5em;
          margin-bottom: 0.5em;
        }
        .prose h1 {
          font-size: 2em;
          font-weight: 700;
        }
        .prose h2 {
          font-size: 1.5em;
          font-weight: 600;
          border-bottom: 1px solid var(--color-border);
          padding-bottom: 0.3em;
        }
        .prose h3 {
          font-size: 1.25em;
          font-weight: 600;
        }
        .prose ol, .prose ul {
          margin: 0.5em 0;
          padding-left: 1.5em;
        }
        .prose li {
          margin: 0.25em 0;
        }
        .prose section {
          margin: 2em 0;
        }
      `}</style>
    </div>
  )
}
