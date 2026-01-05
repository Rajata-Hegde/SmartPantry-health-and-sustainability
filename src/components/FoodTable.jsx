export default function FoodTable({ foods }) {
  return (
    <table className="table">
      <thead>
        <tr>
          <th>Food</th>
          <th>Calories</th>
          <th>Sugar</th>
          <th>Sodium</th>
          <th>Fat</th>
          <th>Protein</th>
          <th>Fiber</th>
          <th>Potassium</th>
          <th>Vitamin K</th>
          <th>Source</th>
        </tr>
      </thead>
      <tbody>
        {foods.map(f => (
          <tr key={f.id}>
            <td>{f.food_name}</td>
            <td>{f.calories}</td>
            <td>{f.sugar_g}</td>
            <td>{f.sodium_mg}</td>
            <td>{f.fat_g}</td>
            <td>{f.protein_g}</td>
            <td>{f.fiber_g}</td>
            <td>{f.potassium_mg}</td>
            <td>{f.vitamin_k_mcg}</td>
            <td>{f.source}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
