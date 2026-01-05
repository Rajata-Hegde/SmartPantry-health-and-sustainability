export const getRankedFoods = async (elderId) => {
  const res = await fetch(`/api/rank-foods/${elderId}`);
  return res.json();
};
