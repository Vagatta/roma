const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();

export function validSpeedAnswers(answers: string[], confirmed: boolean, used: string[] = []): boolean {
  const normalized = answers.map(normalize);
  const previouslyUsed = new Set(used.map(normalize));
  return confirmed && normalized.length === 3 && normalized.every(Boolean)
    && new Set(normalized).size === 3 && normalized.every(word => !previouslyUsed.has(word));
}

export function countRecalled(input: string, words: string[]): number {
  const answers = new Set(input.split(/[,;\n]+/).map(normalize).filter(Boolean));
  return words.filter(word => answers.has(normalize(word))).length;
}

export function higherScore(first: number, second: number): 0 | 1 | null {
  return first === second ? null : first > second ? 0 : 1;
}

export function closestEstimate(first: number, second: number, answer: number): 0 | 1 | null {
  return higherScore(-Math.abs(first - answer), -Math.abs(second - answer));
}
