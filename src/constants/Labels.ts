const genderLabels: Record<string, string> = {
  Woman: "Frau",
  Men: "Mann",
  "Non-binary": "Nichtbinär",
};

const lookingForLabels: Record<string, string> = {
  Women: "Weibliche",
  Men: "Männliche",
  Divers: "Divers",
};

const countryLabels: Record<string, string> = {
  Germany: "Deutschland",
  "United States": "USA",
  "United Kingdom": "Vereinigtes Königreich",
  Ukraine: "Ukraine",
  Poland: "Polen",
  France: "Frankreich",
  Spain: "Spanien",
  Italy: "Italien",
  Netherlands: "Niederlande",
  Austria: "Österreich",
  Switzerland: "Schweiz",
  Canada: "Kanada",
  Australia: "Australien",
  Other: "Andere",
};

const interestLabels: Record<string, string> = {
  Coffee: "Kaffee",
  Travel: "Reisen",
  Music: "Musik",
  Art: "Kunst",
  Books: "Bücher",
  Fitness: "Fitness",
  Cooking: "Kochen",
  Movies: "Filme",
  Development: "Softwareentwicklung",
  Anime: "Anime",
  Gaming: "Gaming",
  Photography: "Fotografie",
  Fashion: "Mode",
  Sports: "Sport",
  Dancing: "Tanzen",
  Yoga: "Yoga",
  Club: "Clubs",
  Bloging: "Blogging",
  "Board Games": "Brettspiele",
  Pets: "Haustiere",
  Reading: "Lesen",
  Writing: "Schreiben",
  Hiking: "Wandern",
};

export function getGenderLabel(value?: string) {
  return value ? (genderLabels[value] ?? value) : "";
}

export function getLookingForLabel(value?: string) {
  return value ? (lookingForLabels[value] ?? value) : "";
}

export function getCountryLabel(value?: string) {
  return value ? (countryLabels[value] ?? value) : "";
}

export function getInterestLabel(value: string) {
  return interestLabels[value] ?? value;
}
