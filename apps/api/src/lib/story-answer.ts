export function sameIdSet(selected: number[], correct: number[]) {
  if (selected.length !== correct.length) return false;
  const left = [...selected].sort((a, b) => a - b);
  const right = [...correct].sort((a, b) => a - b);
  return left.every((id, index) => id === right[index]);
}
