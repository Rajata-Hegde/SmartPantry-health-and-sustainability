import { useState } from "react";
import { addFood } from "../api/nutritionApi";

const FoodForm = ({ onSuccess }) => {
  const [foodName, setFoodName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!foodName) return;

    try {
      setLoading(true);
      const data = await addFood(foodName);
      onSuccess(data); // send result to dashboard
      setFoodName("");
    } catch (err) {
      alert("Failed to add food");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="food-form">
      <input
        type="text"
        placeholder="Enter food (e.g. pizza)"
        value={foodName}
        onChange={(e) => setFoodName(e.target.value)}
      />
      <button type="submit" disabled={loading}>
        {loading ? "Analyzing..." : "Add Food"}
      </button>
    </form>
  );
};

export default FoodForm;
