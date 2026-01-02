const gradeColors = {
  A: "green",
  B: "limegreen",
  C: "orange",
  D: "orangered",
  F: "red"
};

const GradeBadge = ({ grade }) => {
  if (!grade) return null;

  return (
    <div
      style={{
        background: gradeColors[grade],
        color: "#fff",
        padding: "10px 16px",
        borderRadius: "8px",
        fontSize: "20px",
        fontWeight: "bold",
        width: "fit-content"
      }}
    >
      Grade: {grade}
    </div>
  );
};

export default GradeBadge;
