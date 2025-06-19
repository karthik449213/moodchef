const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/moodchef';

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('Connected to MongoDB');
})
.catch((error) => {
  console.error('MongoDB connection error:', error);
});

// Recipe Schema
const recipeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  moodTags: [{
    type: String,
    required: true,
  }],
  ingredients: [{
    type: String,
    required: true,
  }],
  description: {
    type: String,
    required: true,
  },
  cookingTime: {
    type: String,
    required: true,
  },
  instructions: {
    type: String,
    required: true,
  },
  moodDescription: {
    type: String,
    required: true,
  },
}, {
  timestamps: true,
});

const Recipe = mongoose.model('Recipe', recipeSchema);

// Mood mapping for better recipe matching
const moodFlavorMap = {
  sad: ['comfort', 'warm', 'hearty', 'creamy'],
  happy: ['fresh', 'colorful', 'light', 'vibrant'],
  stressed: ['calming', 'simple', 'soothing', 'herbal'],
  lazy: ['easy', 'quick', 'simple', 'minimal'],
  love: ['romantic', 'special', 'indulgent', 'elegant'],
  sick: ['healing', 'gentle', 'nourishing', 'warm'],
  bored: ['exciting', 'flavorful', 'creative', 'spicy'],
};

// Available ingredients list
const availableIngredients = [
  'tomato', 'potato', 'onion', 'garlic', 'ginger', 'spinach', 'broccoli',
  'carrot', 'bell pepper', 'mushroom', 'cucumber', 'lettuce', 'rice',
  'pasta', 'bread', 'tofu', 'paneer', 'cheese', 'milk', 'yogurt',
  'beans', 'lentils', 'chickpeas', 'quinoa', 'oats', 'olive oil',
  'coconut oil', 'butter', 'flour', 'eggs', 'herbs', 'spices'
];

// Routes

// Get all available ingredients
app.get('/api/ingredients', (req, res) => {
  res.json(availableIngredients);
});

// Get all mood types
app.get('/api/moods', (req, res) => {
  const moods = [
    { name: 'sad', label: 'Sad', emoji: '😔' },
    { name: 'happy', label: 'Happy', emoji: '😄' },
    { name: 'stressed', label: 'Stressed', emoji: '😤' },
    { name: 'lazy', label: 'Lazy', emoji: '🥱' },
    { name: 'love', label: 'In Love', emoji: '😍' },
    { name: 'sick', label: 'Sick', emoji: '🤢' },
    { name: 'bored', label: 'Bored', emoji: '😩' },
  ];
  res.json(moods);
});

// Get all recipes
app.get('/api/recipes', async (req, res) => {
  try {
    const recipes = await Recipe.find();
    res.json(recipes);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch recipes' });
  }
});

// Get recipes based on mood and ingredients
app.post('/api/get-recipes', async (req, res) => {
  try {
    const { mood, ingredients } = req.body;

    if (!mood || !ingredients || ingredients.length === 0) {
      return res.status(400).json({ error: 'Mood and ingredients are required' });
    }

    console.log('Received request:', { mood, ingredients });

    // Find recipes that match the mood and have at least one ingredient
    const query = {
      $and: [
        { moodTags: { $in: [mood.toLowerCase()] } },
        { ingredients: { $in: ingredients } }
      ]
    };

    let recipes = await Recipe.find(query).limit(10);

    // If no exact mood match, try broader search
    if (recipes.length === 0) {
      const broadQuery = {
        ingredients: { $in: ingredients }
      };
      recipes = await Recipe.find(broadQuery).limit(10);
    }

    // Score and sort recipes based on ingredient matches
    const scoredRecipes = recipes.map(recipe => {
      const matchingIngredients = recipe.ingredients.filter(ingredient => 
        ingredients.includes(ingredient)
      );
      
      return {
        ...recipe.toObject(),
        matchScore: matchingIngredients.length,
        matchingIngredients: matchingIngredients
      };
    });

    // Sort by match score and take top 3
    const topRecipes = scoredRecipes
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 3);

    console.log(`Found ${topRecipes.length} recipes`);
    res.json(topRecipes);

  } catch (error) {
    console.error('Error fetching recipes:', error);
    res.status(500).json({ error: 'Failed to fetch recipes' });
  }
});

// Seed database with sample recipes
app.post('/api/seed-recipes', async (req, res) => {
  try {
    // Clear existing recipes
    await Recipe.deleteMany({});

    const sampleRecipes = [
      {
        name: "Comfort Mac and Cheese",
        moodTags: ["sad", "stressed"],
        ingredients: ["pasta", "cheese", "milk", "butter", "flour"],
        description: "Creamy, comforting mac and cheese that warms your heart and soul.",
        cookingTime: "25 minutes",
        instructions: "1. Cook pasta according to package directions. 2. Make cheese sauce with butter, flour, milk, and cheese. 3. Mix pasta with sauce. 4. Bake until golden and bubbly.",
        moodDescription: "Perfect comfort food to lift your spirits"
      },
      {
        name: "Rainbow Veggie Stir-Fry",
        moodTags: ["happy", "bored"],
        ingredients: ["bell pepper", "broccoli", "carrot", "garlic", "ginger", "rice"],
        description: "Colorful and vibrant stir-fry packed with fresh vegetables and bold flavors.",
        cookingTime: "15 minutes",
        instructions: "1. Heat oil in wok. 2. Add garlic and ginger. 3. Stir-fry vegetables until crisp-tender. 4. Season with soy sauce and serve over rice.",
        moodDescription: "Bright colors and fresh flavors to match your happy mood"
      },
      {
        name: "Soothing Tomato Basil Soup",
        moodTags: ["stressed", "sick"],
        ingredients: ["tomato", "onion", "garlic", "herbs", "milk"],
        description: "Warm and soothing soup that calms your nerves and nourishes your body.",
        cookingTime: "30 minutes",
        instructions: "1. Sauté onion and garlic. 2. Add tomatoes and herbs. 3. Simmer and blend until smooth. 4. Stir in milk and season to taste.",
        moodDescription: "Gentle and calming, perfect for stress relief"
      },
      {
        name: "Quick Avocado Toast",
        moodTags: ["lazy", "happy"],
        ingredients: ["bread", "cheese", "tomato", "herbs"],
        description: "Simple and satisfying toast that requires minimal effort but maximum flavor.",
        cookingTime: "5 minutes",
        instructions: "1. Toast bread. 2. Mash avocado with seasonings. 3. Spread on toast. 4. Top with tomato and herbs.",
        moodDescription: "Easy and quick when you don't feel like cooking"
      },
      {
        name: "Romantic Mushroom Risotto",
        moodTags: ["love", "happy"],
        ingredients: ["rice", "mushroom", "onion", "garlic", "cheese"],
        description: "Creamy, elegant risotto perfect for a romantic dinner at home.",
        cookingTime: "45 minutes",
        instructions: "1. Sauté mushrooms and set aside. 2. Cook onion and garlic. 3. Add rice and cook until creamy. 4. Stir in mushrooms and cheese.",
        moodDescription: "Elegant and romantic, perfect for date night"
      },
      {
        name: "Healing Ginger Lentil Soup",
        moodTags: ["sick", "stressed"],
        ingredients: ["lentils", "ginger", "garlic", "onion", "carrot"],
        description: "Nourishing soup packed with healing spices and protein-rich lentils.",
        cookingTime: "35 minutes",
        instructions: "1. Sauté aromatics. 2. Add lentils and water. 3. Simmer until tender. 4. Season with healing spices.",
        moodDescription: "Healing and nourishing for when you're under the weather"
      },
      {
        name: "Spicy Chickpea Curry",
        moodTags: ["bored", "happy"],
        ingredients: ["chickpeas", "tomato", "onion", "garlic", "ginger", "spices"],
        description: "Bold and flavorful curry that awakens your taste buds and fights boredom.",
        cookingTime: "40 minutes",
        instructions: "1. Build spice base with onion, garlic, ginger. 2. Add tomatoes and spices. 3. Add chickpeas and simmer. 4. Garnish with fresh herbs.",
        moodDescription: "Exciting flavors to spice up your day"
      },
      {
        name: "Lazy Day Pasta Primavera",
        moodTags: ["lazy", "happy"],
        ingredients: ["pasta", "broccoli", "bell pepper", "garlic", "olive oil"],
        description: "Simple pasta dish with fresh vegetables that's easy to make but delicious.",
        cookingTime: "20 minutes",
        instructions: "1. Cook pasta and vegetables together. 2. Toss with olive oil and garlic. 3. Season simply. 4. Serve immediately.",
        moodDescription: "Minimal effort, maximum satisfaction"
      },
      {
        name: "Mood-Boosting Smoothie Bowl",
        moodTags: ["sad", "happy"],
        ingredients: ["oats", "milk", "yogurt"],
        description: "Creamy and nutritious bowl topped with mood-boosting ingredients.",
        cookingTime: "10 minutes",
        instructions: "1. Blend frozen fruits with yogurt. 2. Pour into bowl. 3. Top with granola and fresh fruits. 4. Drizzle with honey.",
        moodDescription: "Nutritious and colorful to brighten your mood"
      },
      {
        name: "Comforting Potato Soup",
        moodTags: ["sad", "stressed", "sick"],
        ingredients: ["potato", "onion", "garlic", "milk", "butter"],
        description: "Creamy, hearty soup that provides ultimate comfort and warmth.",
        cookingTime: "30 minutes",
        instructions: "1. Sauté onion and garlic. 2. Add potatoes and broth. 3. Simmer until tender. 4. Blend partially and add cream.",
        moodDescription: "Warm and comforting, like a hug in a bowl"
      },
      {
        name: "Energizing Quinoa Salad",
        moodTags: ["happy", "bored"],
        ingredients: ["quinoa", "cucumber", "tomato", "herbs", "olive oil"],
        description: "Fresh and energizing salad packed with protein and vibrant vegetables.",
        cookingTime: "25 minutes",
        instructions: "1. Cook quinoa and let cool. 2. Chop fresh vegetables. 3. Mix with herbs and dressing. 4. Let flavors meld before serving.",
        moodDescription: "Fresh and energizing to boost your vitality"
      },
      {
        name: "Love-Filled Stuffed Bell Peppers",
        moodTags: ["love", "happy"],
        ingredients: ["bell pepper", "rice", "mushroom", "cheese", "herbs"],
        description: "Beautiful stuffed peppers that show love through every colorful bite.",
        cookingTime: "50 minutes",
        instructions: "1. Hollow out bell peppers. 2. Prepare rice and mushroom filling. 3. Stuff peppers and top with cheese. 4. Bake until tender.",
        moodDescription: "Made with love, perfect for sharing with someone special"
      },
      {
        name: "Simple Herb Omelette",
        moodTags: ["lazy", "happy"],
        ingredients: ["eggs", "herbs", "cheese", "butter"],
        description: "Fluffy omelette with fresh herbs that's quick and satisfying.",
        cookingTime: "8 minutes",
        instructions: "1. Beat eggs with herbs. 2. Heat butter in pan. 3. Cook omelette until set. 4. Add cheese and fold.",
        moodDescription: "Quick and easy comfort food"
      },
      {
        name: "Warming Golden Turmeric Rice",
        moodTags: ["sick", "stressed"],
        ingredients: ["rice", "turmeric", "ginger", "garlic", "coconut oil"],
        description: "Anti-inflammatory golden rice that soothes and heals from within.",
        cookingTime: "25 minutes",
        instructions: "1. Heat coconut oil and add spices. 2. Add rice and toast briefly. 3. Add water and simmer. 4. Let steam and fluff.",
        moodDescription: "Healing golden goodness to restore your energy"
      },
      {
        name: "Adventure Spice Mix Roasted Vegetables",
        moodTags: ["bored", "happy"],
        ingredients: ["potato", "carrot", "broccoli", "spices", "olive oil"],
        description: "Exciting roasted vegetables with bold spice combinations to cure boredom.",
        cookingTime: "35 minutes",
        instructions: "1. Cut vegetables uniformly. 2. Toss with oil and spice mix. 3. Roast until caramelized. 4. Garnish with fresh herbs.",
        moodDescription: "Bold flavors and textures to excite your palate"
      }
    ];

    await Recipe.insertMany(sampleRecipes);
    console.log('Sample recipes seeded successfully');
    res.json({ message: 'Database seeded successfully', count: sampleRecipes.length });

  } catch (error) {
    console.error('Error seeding database:', error);
    res.status(500).json({ error: 'Failed to seed database' });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'MoodChef API is running',
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`MoodChef server is running on http://localhost:${PORT}`);
  console.log('Available endpoints:');
  console.log('- GET /api/health');
  console.log('- GET /api/ingredients');
  console.log('- GET /api/moods');
  console.log('- GET /api/recipes');
  console.log('- POST /api/get-recipes');
  console.log('- POST /api/seed-recipes');
});