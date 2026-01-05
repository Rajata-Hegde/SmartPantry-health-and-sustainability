require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const elderFoodsRouter = require('./routes/elderFoods'); // PUBLIC
const elderRoutes = require('./routes/elders');           // PROTECTED
const receiptRoutes = require('./routes/receipts');
const pantryRoutes = require('./routes/pantry');
const nutritionRoutes = require('./routes/nutrition');
const recipeRoutes = require('./routes/recipes');
const foodSafetyRoutes = require('./routes/foodSafety');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(express.json());
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// 🔓 PUBLIC
app.use('/api', authRoutes);
app.use('/api/elders', elderFoodsRouter); // MUST be before protected

// 🔐 PROTECTED
app.use('/api/elders', elderRoutes);
app.use('/api/receipts', receiptRoutes);
app.use('/api/pantry', pantryRoutes);
app.use('/api/nutrition', nutritionRoutes);
app.use('/api/recipes', recipeRoutes);
app.use('/api/food-safety', foodSafetyRoutes);

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
