const genderLabels: Record<string, string> = {
  Woman: "Жінка",
  Men: "Чоловік",
  "Non-binary": "Небінарна людина",
};

const lookingForLabels: Record<string, string> = {
  Women: "Жінок",
  Men: "Чоловіків",
  "Non-binary": "Небінарних людей",
};

const countryLabels: Record<string, string> = {
  Germany: "Німеччина",
  "United States": "США",
  "United Kingdom": "Велика Британія",
  Ukraine: "Україна",
  Poland: "Польща",
  France: "Франція",
  Spain: "Іспанія",
  Italy: "Італія",
  Netherlands: "Нідерланди",
  Austria: "Австрія",
  Switzerland: "Швейцарія",
  Canada: "Канада",
  Australia: "Австралія",
  Other: "Інше",
};

const interestLabels: Record<string, string> = {
  Coffee: "Кава",
  Travel: "Подорожі",
  Music: "Музика",
  Art: "Мистецтво",
  Books: "Книги",
  Fitness: "Фітнес",
  Cooking: "Кулінарія",
  Movies: "Фільми",
  Development: "Розробка",
  Anime: "Аніме",
  Gaming: "Ігри",
  Photography: "Фотографія",
  Fashion: "Мода",
  Sports: "Спорт",
  Dancing: "Танці",
  Yoga: "Йога",
  Club: "Клуби",
  Bloging: "Блогінг",
  "Board Games": "Настільні ігри",
  Pets: "Домашні улюбленці",
  Reading: "Читання",
  Writing: "Письмо",
  Hiking: "Походи",
};

export function getGenderLabel(value?: string) {
  return value ? genderLabels[value] ?? value : "";
}

export function getLookingForLabel(value?: string) {
  return value ? lookingForLabels[value] ?? value : "";
}

export function getCountryLabel(value?: string) {
  return value ? countryLabels[value] ?? value : "";
}

export function getInterestLabel(value: string) {
  return interestLabels[value] ?? value;
}
