// Place un ticket dans une colonne du tableau GitHub Projects « coMunity » (projet n° 2 de fakossa-c).
//
// Pourquoi : la prise d'un ticket par un agent le passe en « In Progress » et sa clôture en « Done »
// (règle de lancement d'un implement, étape 3). L'assignation seule ne change pas la colonne.
//
// Usage : node scripts/statut-ticket.mjs <numéro> <Todo|"In Progress"|Done>
// Jeton : GH_TOKEN, sinon `gh auth token -u fakossa-c`.
import { execFileSync } from "node:child_process";

const [numero, statut] = process.argv.slice(2);
if (!/^\d+$/.test(numero ?? "") || !["Todo", "In Progress", "Done"].includes(statut ?? "")) {
  console.error('Usage : node scripts/statut-ticket.mjs <numéro> <Todo|"In Progress"|Done>');
  process.exit(1);
}

const env = { ...process.env };
if (!env.GH_TOKEN) env.GH_TOKEN = execFileSync("gh", ["auth", "token", "-u", "fakossa-c"]).toString().trim();

const graphql = (query) =>
  JSON.parse(execFileSync("gh", ["api", "graphql", "-f", `query=${query}`], { env }).toString()).data;

const projet = graphql(
  '{ user(login:"fakossa-c"){ projectV2(number:2){ id field(name:"Status"){ ... on ProjectV2SingleSelectField { id options{ id name } } } } } }',
).user.projectV2;
const option = projet.field.options.find((o) => o.name === statut);

const item = graphql(
  `{ repository(owner:"fakossa-c", name:"coMunity"){ issue(number:${numero}){ projectItems(first:10){ nodes{ id project{ number } } } } } }`,
).repository.issue.projectItems.nodes.find((n) => n.project.number === 2);
if (!item) {
  console.error(`Le ticket #${numero} n'est pas sur le tableau coMunity : l'y ajouter d'abord.`);
  process.exit(1);
}

graphql(
  `mutation { updateProjectV2ItemFieldValue(input:{ projectId:"${projet.id}", itemId:"${item.id}", fieldId:"${projet.field.id}", value:{ singleSelectOptionId:"${option.id}" } }){ projectV2Item{ id } } }`,
);
console.log(`#${numero} -> ${statut}`);
