/* eslint-disable */
/* ============================================================
   data.js — everyday B2 French sentences built around numbers.
   Fields: { id, en, fr, context }
   Templated items add: template:true, slot:{type}, with {n} in en/fr.
   Slot types (see numbers.js randomOfType): year, price, tricky,
   big, small, percent.
   Stable integer ids (gaps OK). TEMPLATES start at id 500.
   ============================================================ */
var SENTENCES = [

  // ── Dates & years ───────────────────────────────────────
  { id: 1, en: "The cathedral was built in 1163.", fr: "La cathédrale a été construite en mille cent soixante-trois.", context: "History" },
  { id: 2, en: "She was born on the 3rd of October, 1985.", fr: "Elle est née le trois octobre mille neuf cent quatre-vingt-cinq.", context: "Dates" },
  { id: 3, en: "We met back in 1998.", fr: "On s'est rencontrés en mille neuf cent quatre-vingt-dix-huit.", context: "Dates" },
  { id: 4, en: "The store closes on December 24th.", fr: "Le magasin ferme le vingt-quatre décembre.", context: "Dates" },
  { id: 5, en: "It happened in the seventies.", fr: "Ça s'est passé dans les années soixante-dix.", context: "Decades" },
  { id: 6, en: "From 1998 until 2012, he lived in Lyon.", fr: "De mille neuf cent quatre-vingt-dix-huit à deux mille douze, il a vécu à Lyon.", context: "Time spans" },
  { id: 7, en: "The lease runs until 2027.", fr: "Le bail court jusqu'en deux mille vingt-sept.", context: "Dates" },
  { id: 8, en: "My appointment is on the 1st of April.", fr: "Mon rendez-vous est le premier avril.", context: "Dates" },
  { id: 9, en: "The 14th of July is a national holiday.", fr: "Le quatorze juillet est un jour férié.", context: "Dates" },
  { id: 10, en: "The shop has been around since 1947.", fr: "La boutique existe depuis mille neuf cent quarante-sept.", context: "History" },
  { id: 11, en: "I'll be on holiday from the 8th to the 22nd.", fr: "Je serai en vacances du huit au vingt-deux.", context: "Dates" },
  { id: 12, en: "Let's meet on Monday the 15th.", fr: "On se retrouve lundi quinze.", context: "Dates" },

  // ── Prices & shopping ───────────────────────────────────
  { id: 20, en: "That'll be 34.60, please.", fr: "Ça fera trente-quatre euros soixante, s'il vous plaît.", context: "At the till" },
  { id: 21, en: "It costs 458 euros.", fr: "Ça coûte quatre cent cinquante-huit euros.", context: "Shopping" },
  { id: 22, en: "The rent is 890 euros a month.", fr: "Le loyer est de huit cent quatre-vingt-dix euros par mois.", context: "Housing" },
  { id: 23, en: "I paid 19.99 for it.", fr: "Je l'ai payé dix-neuf euros quatre-vingt-dix-neuf.", context: "Shopping" },
  { id: 24, en: "Can you break a 50?", fr: "Vous avez la monnaie sur cinquante euros ?", context: "Paying" },
  { id: 25, en: "There's a 20% discount on everything.", fr: "Il y a vingt pour cent de réduction sur tout.", context: "Sales" },
  { id: 26, en: "The bill came to 76 euros.", fr: "L'addition s'est élevée à soixante-seize euros.", context: "Restaurant" },
  { id: 27, en: "Two coffees, that's 5.40.", fr: "Deux cafés, ça fait cinq euros quarante.", context: "Café" },
  { id: 28, en: "It's three for five euros.", fr: "C'est trois pour cinq euros.", context: "Shopping" },
  { id: 29, en: "Shipping costs an extra 4.90.", fr: "Les frais de port coûtent quatre euros quatre-vingt-dix en plus.", context: "Online shopping" },
  { id: 30, en: "I got it half price, 29 euros.", fr: "Je l'ai eu à moitié prix, vingt-neuf euros.", context: "Sales" },

  // ── Time & schedules ────────────────────────────────────
  { id: 40, en: "The train leaves at 8:45.", fr: "Le train part à huit heures quarante-cinq.", context: "Travel" },
  { id: 41, en: "It's a quarter to seven.", fr: "Il est sept heures moins le quart.", context: "Telling time" },
  { id: 42, en: "The meeting is at half past two.", fr: "La réunion est à deux heures et demie.", context: "Schedule" },
  { id: 43, en: "The film lasts two hours and ten minutes.", fr: "Le film dure deux heures dix.", context: "Duration" },
  { id: 44, en: "I'll be there in about 15 minutes.", fr: "J'y serai dans un quart d'heure environ.", context: "Time" },
  { id: 45, en: "We open at 9 and close at 7.", fr: "On ouvre à neuf heures et on ferme à dix-neuf heures.", context: "Opening hours" },
  { id: 46, en: "The next train is in 12 minutes.", fr: "Le prochain train est dans douze minutes.", context: "Travel" },
  { id: 47, en: "Call me back around 6.", fr: "Rappelle-moi vers dix-huit heures.", context: "Phone" },

  // ── Quantities & measures ───────────────────────────────
  { id: 60, en: "Dozens of people come every month.", fr: "Des dizaines de personnes viennent chaque mois.", context: "Quantities" },
  { id: 61, en: "I'd like half a kilo of tomatoes.", fr: "Je voudrais une livre de tomates.", context: "Market" },
  { id: 62, en: "The bottle holds 75 centilitres.", fr: "La bouteille contient soixante-quinze centilitres.", context: "Measures" },
  { id: 63, en: "It's about 80 kilometres from here.", fr: "C'est à environ quatre-vingts kilomètres d'ici.", context: "Distance" },
  { id: 64, en: "There were hundreds of them.", fr: "Il y en avait des centaines.", context: "Quantities" },
  { id: 65, en: "The room is 18 square metres.", fr: "La pièce fait dix-huit mètres carrés.", context: "Housing" },
  { id: 66, en: "Add 250 grams of flour.", fr: "Ajoutez deux cent cinquante grammes de farine.", context: "Cooking" },
  { id: 67, en: "It weighs about three kilos.", fr: "Ça pèse environ trois kilos.", context: "Measures" },
  { id: 68, en: "I'll take a dozen, please.", fr: "Je vais en prendre une douzaine, s'il vous plaît.", context: "Market" },

  // ── Ages & people ───────────────────────────────────────
  { id: 80, en: "She just turned 91.", fr: "Elle vient d'avoir quatre-vingt-onze ans.", context: "Age" },
  { id: 81, en: "My grandfather is 78.", fr: "Mon grand-père a soixante-dix-huit ans.", context: "Age" },
  { id: 82, en: "You're the 7th person to ask me that.", fr: "Tu es la septième personne à me demander ça.", context: "Ordinals" },
  { id: 83, en: "He finished in 3rd place.", fr: "Il a fini à la troisième place.", context: "Ranking" },
  { id: 84, en: "It's on the 21st floor.", fr: "C'est au vingt et unième étage.", context: "Buildings" },
  { id: 85, en: "She's in her early sixties.", fr: "Elle a une petite soixantaine d'années.", context: "Age" },
  { id: 86, en: "It's her 40th birthday today.", fr: "C'est son quarantième anniversaire aujourd'hui.", context: "Celebrations" },
  { id: 87, en: "We're celebrating ten years of marriage.", fr: "On fête nos dix ans de mariage.", context: "Celebrations" },

  // ── Phone, addresses, codes ─────────────────────────────
  { id: 100, en: "My number is 06 72 84 99 15.", fr: "Mon numéro, c'est le zéro six, soixante-douze, quatre-vingt-quatre, quatre-vingt-dix-neuf, quinze.", context: "Phone" },
  { id: 101, en: "I live at number 18.", fr: "J'habite au numéro dix-huit.", context: "Address" },
  { id: 102, en: "The postal code is 75019.", fr: "Le code postal, c'est soixante-quinze mille dix-neuf.", context: "Address" },
  { id: 103, en: "The door code is 4471.", fr: "Le code de la porte, c'est quarante-quatre, soixante et onze.", context: "Access codes" },

  // ── Statistics & percentages ────────────────────────────
  { id: 120, en: "Almost 90% of students passed.", fr: "Près de quatre-vingt-dix pour cent des élèves ont réussi.", context: "Statistics" },
  { id: 121, en: "Prices went up by 7% this year.", fr: "Les prix ont augmenté de sept pour cent cette année.", context: "Economy" },
  { id: 122, en: "Three out of four agreed.", fr: "Trois personnes sur quatre étaient d'accord.", context: "Statistics" },
  { id: 123, en: "The population is around 67 million.", fr: "La population est d'environ soixante-sept millions d'habitants.", context: "Demographics" },
  { id: 124, en: "Turnout was barely 50%.", fr: "Le taux de participation atteignait à peine cinquante pour cent.", context: "Politics" },

  // ── Misc everyday ───────────────────────────────────────
  { id: 140, en: "It was invented in 1884.", fr: "Ça a été inventé en mille huit cent quatre-vingt-quatre.", context: "History" },
  { id: 141, en: "Take the second street on the right.", fr: "Prenez la deuxième rue à droite.", context: "Directions" },
  { id: 142, en: "We've been waiting for 40 minutes.", fr: "Ça fait quarante minutes qu'on attend.", context: "Frustration" },
  { id: 143, en: "There are 80 of us at the company.", fr: "On est quatre-vingts dans l'entreprise.", context: "Work" },
  { id: 144, en: "The temperature dropped to minus 5.", fr: "La température est descendue à moins cinq.", context: "Weather" },
  { id: 145, en: "He scored 16 out of 20.", fr: "Il a eu seize sur vingt.", context: "School grades" },
  { id: 146, en: "Page 92, please.", fr: "Page quatre-vingt-douze, s'il vous plaît.", context: "Classroom" },
  { id: 147, en: "The recipe serves 6 to 8 people.", fr: "La recette est pour six à huit personnes.", context: "Cooking" },
  { id: 148, en: "Take exit number 14.", fr: "Prenez la sortie numéro quatorze.", context: "Driving" },
  { id: 149, en: "There's a two-year warranty.", fr: "Il y a une garantie de deux ans.", context: "Shopping" },
  { id: 150, en: "The final score was 2 to 1.", fr: "Le score final était de deux à un.", context: "Sports" },
  { id: 151, en: "It's about a twenty-minute walk.", fr: "C'est à environ vingt minutes à pied.", context: "Directions" },

  // ── Templated (number changes each showing) ─────────────
  { id: 500, template: true, slot: { type: 'price' }, en: "That'll be {n}, please.", fr: "Ça fera {n}, s'il vous plaît.", context: "At the till" },
  { id: 501, template: true, slot: { type: 'price' }, en: "It costs {n}.", fr: "Ça coûte {n}.", context: "Shopping" },
  { id: 502, template: true, slot: { type: 'year' }, en: "It was built in {n}.", fr: "Ça a été construit en {n}.", context: "History" },
  { id: 503, template: true, slot: { type: 'year' }, en: "I was born in {n}.", fr: "Je suis né en {n}.", context: "Dates" },
  { id: 504, template: true, slot: { type: 'tricky' }, en: "My uncle is {n} years old.", fr: "Mon oncle a {n} ans.", context: "Age" },
  { id: 505, template: true, slot: { type: 'tricky' }, en: "There are {n} of them left.", fr: "Il en reste {n}.", context: "Quantities" },
  { id: 506, template: true, slot: { type: 'big' }, en: "The city has {n} inhabitants.", fr: "La ville compte {n} habitants.", context: "Demographics" },
  { id: 507, template: true, slot: { type: 'big' }, en: "The car costs {n} euros.", fr: "La voiture coûte {n} euros.", context: "Big purchases" },
  { id: 508, template: true, slot: { type: 'percent' }, en: "About {n} of people agree.", fr: "Environ {n} des gens sont d'accord.", context: "Statistics" },
  { id: 509, template: true, slot: { type: 'small' }, en: "There were {n} guests at the party.", fr: "Il y avait {n} invités à la fête.", context: "Quantities" },
  { id: 510, template: true, slot: { type: 'price' }, en: "The rent went up to {n} a month.", fr: "Le loyer est monté à {n} par mois.", context: "Housing" },
  { id: 511, template: true, slot: { type: 'year' }, en: "They got married in {n}.", fr: "Ils se sont mariés en {n}.", context: "Dates" }

];
