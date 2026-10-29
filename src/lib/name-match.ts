export type NamedPlayer = { id: string; name: string };

// Shared nickname groups so "Mike" can suggest "Michael Lee" and vice versa.
const NICKNAME_GROUPS = [
  ["michael", "mike", "mikey", "mick", "mickey"],
  ["john", "jon", "johnny", "jonathan", "jonny", "jack"],
  ["robert", "rob", "robbie", "bob", "bobby", "bert"],
  ["william", "will", "bill", "billy", "liam"],
  ["james", "jim", "jimmy", "jamie"],
  ["thomas", "tom", "tommy"],
  ["david", "dave", "davey"],
  ["christopher", "chris", "kit"],
  ["christine", "christina", "chris", "tina"],
  ["katherine", "catherine", "kathryn", "kate", "katie", "kat", "cat", "kathy", "cathy"],
  ["elizabeth", "liz", "lizzie", "beth", "betty", "eliza", "libby"],
  ["alexander", "alexandra", "alex", "alexa", "sasha", "xander", "lexi"],
  ["samuel", "samantha", "sam", "sammy"],
  ["benjamin", "ben", "benny"],
  ["daniel", "danielle", "dan", "danny", "dani"],
  ["matthew", "matt", "matty"],
  ["nicholas", "nicola", "nicole", "nick", "nicky", "nikki"],
  ["anthony", "antony", "tony"],
  ["stephen", "steven", "steve", "stevie"],
  ["andrew", "andy", "drew"],
  ["joseph", "joe", "joey"],
  ["edward", "ed", "eddie", "ted", "teddy", "ned"],
  ["richard", "rich", "richie", "rick", "ricky", "dick"],
  ["charles", "charlie", "chas", "chuck"],
  ["charlotte", "charlie", "lottie"],
  ["margaret", "maggie", "meg", "peggy"],
  ["rebecca", "becky", "becca"],
  ["jennifer", "jen", "jenny"],
  ["jessica", "jess", "jessie"],
  ["victoria", "vicky", "tori"],
  ["patrick", "pat", "paddy"],
  ["patricia", "pat", "patty", "trish"],
  ["timothy", "tim", "timmy"],
  ["gregory", "greg"],
  ["peter", "pete"],
  ["philip", "phillip", "phil"],
  ["oliver", "olly", "ollie"],
  ["olivia", "liv", "livvy"],
  ["harry", "henry", "hal"],
  ["frederick", "fred", "freddie"],
  ["susan", "sue", "suzy"],
  ["deborah", "debbie", "deb"],
  ["abigail", "abby", "abi"],
  ["josh", "joshua"],
  ["zach", "zachary", "zack"],
];

const nicknameIndex = new Map<string, Set<number>>();
NICKNAME_GROUPS.forEach((group, index) => {
  for (const name of group) {
    const groups = nicknameIndex.get(name) ?? new Set<number>();
    groups.add(index);
    nicknameIndex.set(name, groups);
  }
});

// Case, accents, punctuation, and spacing never distinguish two players.
export function nameKey(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("en-GB")
    .replace(/['\u2019.]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function editDistance(left: string, right: string): number {
  if (left === right) return 0;
  let previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let row = 1; row <= left.length; row += 1) {
    const current = [row];
    for (let column = 1; column <= right.length; column += 1) {
      current[column] = Math.min(
        previous[column] + 1,
        current[column - 1] + 1,
        previous[column - 1] + (left[row - 1] === right[column - 1] ? 0 : 1)
      );
    }
    previous = current;
  }
  return previous[right.length];
}

function typoTolerance(value: string): number {
  return value.length >= 6 ? 2 : value.length >= 4 ? 1 : 0;
}

function firstNamesMatch(left: string, right: string): boolean {
  if (left === right) return true;
  const leftGroups = nicknameIndex.get(left);
  const rightGroups = nicknameIndex.get(right);
  if (leftGroups && rightGroups && [...leftGroups].some((group) => rightGroups.has(group))) return true;
  const shorter = left.length <= right.length ? left : right;
  const longer = shorter === left ? right : left;
  if (shorter.length >= 3 && longer.startsWith(shorter)) return true;
  return editDistance(left, right) <= typoTolerance(shorter);
}

export function findExactName(name: string, players: NamedPlayer[]): NamedPlayer | null {
  const key = nameKey(name);
  return players.find((player) => nameKey(player.name) === key) ?? null;
}

export function findSimilarNames(name: string, players: NamedPlayer[], limit = 3): NamedPlayer[] {
  const key = nameKey(name);
  const tokens = key.split(" ");
  const first = tokens[0];
  const last = tokens[tokens.length - 1];
  if (!first || tokens.length < 2) return [];

  const scored: { player: NamedPlayer; score: number }[] = [];
  for (const player of players) {
    const candidateKey = nameKey(player.name);
    if (!candidateKey || candidateKey === key) continue;
    const candidateTokens = candidateKey.split(" ");
    const candidateFirst = candidateTokens[0];
    const candidateLast = candidateTokens[candidateTokens.length - 1];
    const lastDistance = editDistance(last, candidateLast);

    let score: number | null = null;
    if (first === candidateFirst && lastDistance === 0) {
      score = 0;
    } else if (lastDistance <= typoTolerance(last) && firstNamesMatch(first, candidateFirst)) {
      score = 1 + lastDistance;
    } else if (editDistance(key, candidateKey) <= 2) {
      score = 3;
    }
    if (score !== null) scored.push({ player, score });
  }

  return scored
    .sort((left, right) => left.score - right.score || left.player.name.localeCompare(right.player.name))
    .slice(0, limit)
    .map(({ player }) => player);
}
