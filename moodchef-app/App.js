import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Share,
  StatusBar,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'http://localhost:5000'; // Change this to your backend IP

const App = () => {
  const [currentScreen, setCurrentScreen] = useState('mood');
  const [selectedMood, setSelectedMood] = useState('');
  const [customMood, setCustomMood] = useState('');
  const [selectedIngredients, setSelectedIngredients] = useState([]);
  const [availableIngredients, setAvailableIngredients] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(false);

  const moods = [
    { emoji: '😔', name: 'sad', label: 'Sad' },
    { emoji: '😄', name: 'happy', label: 'Happy' },
    { emoji: '😤', name: 'stressed', label: 'Stressed' },
    { emoji: '🥱', name: 'lazy', label: 'Lazy' },
    { emoji: '😍', name: 'love', label: 'In Love' },
    { emoji: '🤢', name: 'sick', label: 'Sick' },
    { emoji: '😩', name: 'bored', label: 'Bored' },
  ];

  useEffect(() => {
    fetchIngredients();
    loadSavedData();
  }, []);

  const fetchIngredients = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/ingredients`);
      const data = await response.json();
      setAvailableIngredients(data);
    } catch (error) {
      console.error('Error fetching ingredients:', error);
      Alert.alert('Error', 'Failed to load ingredients. Please check your connection.');
    }
  };

  const loadSavedData = async () => {
    try {
      const savedMood = await AsyncStorage.getItem('selectedMood');
      const savedIngredients = await AsyncStorage.getItem('selectedIngredients');
      
      if (savedMood) setSelectedMood(savedMood);
      if (savedIngredients) setSelectedIngredients(JSON.parse(savedIngredients));
    } catch (error) {
      console.error('Error loading saved data:', error);
    }
  };

  const saveData = async () => {
    try {
      await AsyncStorage.setItem('selectedMood', selectedMood);
      await AsyncStorage.setItem('selectedIngredients', JSON.stringify(selectedIngredients));
    } catch (error) {
      console.error('Error saving data:', error);
    }
  };

  const handleMoodSelect = (mood) => {
    setSelectedMood(mood);
    setCustomMood('');
  };

  const handleIngredientToggle = (ingredient) => {
    if (selectedIngredients.includes(ingredient)) {
      setSelectedIngredients(selectedIngredients.filter(item => item !== ingredient));
    } else {
      setSelectedIngredients([...selectedIngredients, ingredient]);
    }
  };

  const submitRequest = async () => {
    if (!selectedMood && !customMood) {
      Alert.alert('Error', 'Please select a mood or enter a custom mood.');
      return;
    }

    if (selectedIngredients.length === 0) {
      Alert.alert('Error', 'Please select at least one ingredient.');
      return;
    }

    setLoading(true);
    const finalMood = customMood || selectedMood;

    try {
      const response = await fetch(`${API_BASE_URL}/api/get-recipes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mood: finalMood,
          ingredients: selectedIngredients,
        }),
      });

      const data = await response.json();
      setRecipes(data);
      setCurrentScreen('results');
      await saveData();
    } catch (error) {
      console.error('Error fetching recipes:', error);
      Alert.alert('Error', 'Failed to get recipes. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const shareRecipe = async (recipe) => {
    try {
      const message = `🍽️ ${recipe.name}\n\n${recipe.description}\n\n⏰ Cooking time: ${recipe.cookingTime}\n\nTry this mood-boosting recipe from MoodChef!`;
      await Share.share({
        message: message,
        title: `${recipe.name} - MoodChef Recipe`,
      });
    } catch (error) {
      console.error('Error sharing recipe:', error);
    }
  };

  const MoodScreen = () => (
    <View style={styles.screen}>
      <Text style={styles.title}>How are you feeling today?</Text>
      
      <View style={styles.moodGrid}>
        {moods.map((mood) => (
          <TouchableOpacity
            key={mood.name}
            style={[
              styles.moodButton,
              selectedMood === mood.name && styles.selectedMood
            ]}
            onPress={() => handleMoodSelect(mood.name)}
          >
            <Text style={styles.moodEmoji}>{mood.emoji}</Text>
            <Text style={styles.moodLabel}>{mood.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.subtitle}>Or describe your mood:</Text>
      <TextInput
        style={styles.textInput}
        placeholder="e.g., excited, tired, hungry..."
        value={customMood}
        onChangeText={setCustomMood}
        onFocus={() => setSelectedMood('')}
      />

      <TouchableOpacity
        style={styles.nextButton}
        onPress={() => setCurrentScreen('ingredients')}
      >
        <Text style={styles.buttonText}>Next</Text>
      </TouchableOpacity>
    </View>
  );

  const IngredientsScreen = () => (
    <View style={styles.screen}>
      <Text style={styles.title}>What ingredients do you have?</Text>
      
      <ScrollView style={styles.ingredientsContainer}>
        <View style={styles.ingredientsGrid}>
          {availableIngredients.map((ingredient) => (
            <TouchableOpacity
              key={ingredient}
              style={[
                styles.ingredientButton,
                selectedIngredients.includes(ingredient) && styles.selectedIngredient
              ]}
              onPress={() => handleIngredientToggle(ingredient)}
            >
              <Text style={[
                styles.ingredientText,
                selectedIngredients.includes(ingredient) && styles.selectedIngredientText
              ]}>
                {ingredient}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => setCurrentScreen('mood')}
        >
          <Text style={styles.buttonText}>Back</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.submitButton, loading && styles.disabledButton]}
          onPress={submitRequest}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Get Recipes!</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  const ResultsScreen = () => (
    <View style={styles.screen}>
      <Text style={styles.title}>Perfect recipes for you!</Text>
      
      <ScrollView style={styles.recipesContainer}>
        {recipes.length === 0 ? (
          <View style={styles.noRecipesContainer}>
            <Text style={styles.noRecipesText}>No recipes found for your mood and ingredients.</Text>
            <Text style={styles.noRecipesSubtext}>Try selecting different ingredients!</Text>
          </View>
        ) : (
          recipes.map((recipe, index) => (
            <View key={index} style={styles.recipeCard}>
              <Text style={styles.recipeName}>{recipe.name}</Text>
              <Text style={styles.recipeDescription}>{recipe.description}</Text>
              <Text style={styles.recipeTime}>⏰ {recipe.cookingTime}</Text>
              <Text style={styles.moodMatch}>💚 {recipe.moodDescription}</Text>
              
              <Text style={styles.ingredientsTitle}>Ingredients:</Text>
              <Text style={styles.ingredientsList}>
                {recipe.ingredients.join(', ')}
              </Text>
              
              <Text style={styles.instructionsTitle}>Instructions:</Text>
              <Text style={styles.instructions}>{recipe.instructions}</Text>
              
              <TouchableOpacity
                style={styles.shareButton}
                onPress={() => shareRecipe(recipe)}
              >
                <Text style={styles.shareButtonText}>Share Recipe 📤</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>

      <TouchableOpacity
        style={styles.newSearchButton}
        onPress={() => {
          setCurrentScreen('mood');
          setRecipes([]);
          setSelectedMood('');
          setCustomMood('');
          setSelectedIngredients([]);
        }}
      >
        <Text style={styles.buttonText}>New Search</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#4CAF50" barStyle="light-content" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🍽️ MoodChef</Text>
        <Text style={styles.headerSubtitle}>Recipes that match your mood</Text>
      </View>
      
      {currentScreen === 'mood' && <MoodScreen />}
      {currentScreen === 'ingredients' && <IngredientsScreen />}
      {currentScreen === 'results' && <ResultsScreen />}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: '#4CAF50',
    padding: 20,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#fff',
    marginTop: 5,
    opacity: 0.9,
  },
  screen: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 30,
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 15,
  },
  moodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  moodButton: {
    width: '30%',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 15,
    alignItems: 'center',
    marginBottom: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  selectedMood: {
    backgroundColor: '#4CAF50',
  },
  moodEmoji: {
    fontSize: 30,
    marginBottom: 5,
  },
  moodLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  textInput: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 20,
  },
  nextButton: {
    backgroundColor: '#FF9800',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  ingredientsContainer: {
    flex: 1,
  },
  ingredientsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  ingredientButton: {
    width: '48%',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 2,
    borderColor: '#ddd',
  },
  selectedIngredient: {
    backgroundColor: '#E8F5E8',
    borderColor: '#4CAF50',
  },
  ingredientText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
  },
  selectedIngredientText: {
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  backButton: {
    backgroundColor: '#666',
    padding: 15,
    borderRadius: 10,
    flex: 0.45,
    alignItems: 'center',
  },
  submitButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 10,
    flex: 0.45,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  recipesContainer: {
    flex: 1,
  },
  noRecipesContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  noRecipesText: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
    marginBottom: 10,
  },
  noRecipesSubtext: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
  },
  recipeCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 15,
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  recipeName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  recipeDescription: {
    fontSize: 16,
    color: '#666',
    marginBottom: 10,
    lineHeight: 22,
  },
  recipeTime: {
    fontSize: 16,
    color: '#FF9800',
    fontWeight: '600',
    marginBottom: 5,
  },
  moodMatch: {
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: '600',
    marginBottom: 15,
  },
  ingredientsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  ingredientsList: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  instructions: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 15,
  },
  shareButton: {
    backgroundColor: '#2196F3',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  shareButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  newSearchButton: {
    backgroundColor: '#FF9800',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
  },
});

export default App;