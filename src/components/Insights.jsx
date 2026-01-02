const Insights = ({ insights }) => {
  if (!insights) return null;

  return (
    <div className="insights">
      <h3>🤖 AI Coaching</h3>
      <p>{insights}</p>
    </div>
  );
};

export default Insights;
