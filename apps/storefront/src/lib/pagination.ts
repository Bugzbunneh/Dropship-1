// Which page numbers to show in the pager: always the first and last, plus the current page and
// its neighbours, with a gap marker where numbers are skipped. [1, "gap", 4, 5, 6, "gap", 20].
export const pageWindow = (page: number, pageCount: number): (number | "gap")[] => {
  const wanted = new Set([1, pageCount, page - 1, page, page + 1]);
  const numbers = [...wanted].filter((n) => n >= 1 && n <= pageCount).sort((a, b) => a - b);

  const result: (number | "gap")[] = [];
  numbers.forEach((n, index) => {
    const previous = numbers[index - 1];
    if (previous !== undefined && n - previous > 1) {
      result.push("gap");
    }
    result.push(n);
  });
  return result;
};
