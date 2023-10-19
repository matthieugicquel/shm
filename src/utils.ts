export const partition = <T>(array: Iterable<T>, predicate: (item: T) => boolean): [T[], T[]] => {
  const truthy: T[] = [];
  const falsy: T[] = [];

  for (const item of array) {
    if (predicate(item)) {
      truthy.push(item);
    } else {
      falsy.push(item);
    }
  }

  return [truthy, falsy];
};
