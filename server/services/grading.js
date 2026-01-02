exports.calculate = ({ calories, protein, fat }) => {
  if (protein > 20 && calories < 400) return "A";
  if (calories < 600) return "B";
  if (calories < 800) return "C";
  return "D";
};
