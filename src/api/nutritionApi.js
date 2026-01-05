import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:5000", // backend URL
  withCredentials: true
});

// Add food entry
export const addFood = async (foodName) => {
  const res = await API.post("/nutrition", { foodName });
  return res.data;
};

// Fetch history (optional – for table)
export const getHistory = async () => {
  const res = await API.get("/nutrition/history");
  return res.data;
};