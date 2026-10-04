import { useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const API_URL = "https://student-campus-marketplace-api.onrender.com";

const categories = [
  "All",
  "Furniture",
  "Electronics",
  "Kitchen",
  "Books",
  "Clothing",
  "Others",
];

const conditions = ["All", "New", "Like New", "Good", "Fair"];

type Listing = {
  id: number;
  title: string;
  description: string;
  price: string;
  category: string;
  condition: string;
  pickup_location: string;
  created_at: string;
  seller_name: string;
  university_name: string;
  images: string[];
};

export default function SearchScreen() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [searchText, setSearchText] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedCondition, setSelectedCondition] = useState("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchListings = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(`${API_URL}/api/listings`);

      if (!response.ok) {
        throw new Error("Failed to load listings");
      }

      const data = await response.json();

      setListings(data.listings || []);
    } catch (error) {
      console.error("Search listings error:", error);
      setError("Could not load listings. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchListings();
    }, [fetchListings]),
  );

  const filteredListings = useMemo(() => {
    const query = searchText.trim().toLowerCase();

    return listings.filter((listing) => {
      const matchesSearch =
        query === "" ||
        listing.title.toLowerCase().includes(query) ||
        listing.description.toLowerCase().includes(query) ||
        listing.category.toLowerCase().includes(query) ||
        listing.university_name.toLowerCase().includes(query);

      const matchesCategory =
        selectedCategory === "All" ||
        listing.category.toLowerCase() === selectedCategory.toLowerCase();

      const matchesCondition =
        selectedCondition === "All" ||
        listing.condition.toLowerCase() === selectedCondition.toLowerCase();

      return matchesSearch && matchesCategory && matchesCondition;
    });
  }, [listings, searchText, selectedCategory, selectedCondition]);

  const clearFilters = () => {
    setSearchText("");
    setSelectedCategory("All");
    setSelectedCondition("All");
  };

  const hasActiveFilters =
    searchText.trim() !== "" ||
    selectedCategory !== "All" ||
    selectedCondition !== "All";

  return (
    <View className="flex-1 bg-gray-50">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 32 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View className="bg-blue-600 px-5 pb-7 pt-14">
          <Text className="text-2xl font-bold text-white">Search</Text>

          <Text className="mt-1 text-sm text-blue-100">
            Find things being sold around your campus.
          </Text>

          {/* Search Input */}
          <View className="mt-5 rounded-xl bg-white">
            <TextInput
              value={searchText}
              onChangeText={setSearchText}
              placeholder="Search for items..."
              placeholderTextColor="#6b7280"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
              className="px-4 py-4 text-base text-gray-900"
            />
          </View>
        </View>

        {/* Category Filter */}
        <View className="px-5 pt-6">
          <View className="flex-row items-center justify-between">
            <Text className="text-lg font-bold text-gray-900">Category</Text>

            {hasActiveFilters && (
              <TouchableOpacity onPress={clearFilters}>
                <Text className="font-semibold text-blue-600">Clear all</Text>
              </TouchableOpacity>
            )}
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="mt-3"
          >
            {categories.map((category) => {
              const selected = selectedCategory === category;

              return (
                <TouchableOpacity
                  key={category}
                  onPress={() => setSelectedCategory(category)}
                  className={`mr-3 rounded-full px-5 py-3 ${
                    selected ? "bg-blue-600" : "bg-white"
                  }`}
                >
                  <Text
                    className={`font-medium ${
                      selected ? "text-white" : "text-gray-700"
                    }`}
                  >
                    {category}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Condition Filter */}
        <View className="px-5 pt-6">
          <Text className="text-lg font-bold text-gray-900">Condition</Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="mt-3"
          >
            {conditions.map((condition) => {
              const selected = selectedCondition === condition;

              return (
                <TouchableOpacity
                  key={condition}
                  onPress={() => setSelectedCondition(condition)}
                  className={`mr-3 rounded-full px-5 py-3 ${
                    selected ? "bg-blue-600" : "bg-white"
                  }`}
                >
                  <Text
                    className={`font-medium ${
                      selected ? "text-white" : "text-gray-700"
                    }`}
                  >
                    {condition}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Results */}
        <View className="px-5 pt-7">
          <View className="flex-row items-center justify-between">
            <Text className="text-xl font-bold text-gray-900">Results</Text>

            {!loading && error === "" && (
              <Text className="text-sm text-gray-500">
                {filteredListings.length}{" "}
                {filteredListings.length === 1 ? "item" : "items"}
              </Text>
            )}
          </View>

          {/* Loading */}
          {loading && (
            <View className="items-center py-10">
              <ActivityIndicator size="large" />

              <Text className="mt-3 text-gray-500">
                Loading listings...
              </Text>
            </View>
          )}

          {/* Error */}
          {!loading && error !== "" && (
            <View className="mt-4 rounded-2xl bg-white p-6">
              <Text className="text-center text-red-500">{error}</Text>

              <TouchableOpacity
                onPress={fetchListings}
                className="mt-4 self-center rounded-xl bg-blue-600 px-5 py-3"
              >
                <Text className="font-semibold text-white">Try Again</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Search Results */}
          {!loading &&
            error === "" &&
            filteredListings.map((listing) => (
              <View key={listing.id} className="mt-4 rounded-2xl bg-white p-4">
                {/* Image */}
                {listing.images && listing.images.length > 0 ? (
                  <Image
                    source={{ uri: listing.images[0] }}
                    className="h-40 w-full rounded-xl"
                    resizeMode="cover"
                  />
                ) : (
                  <View className="h-40 items-center justify-center rounded-xl bg-gray-200">
                    <Text className="text-gray-500">No image</Text>
                  </View>
                )}

                {/* Title */}
                <Text className="mt-4 text-lg font-bold text-gray-900">
                  {listing.title}
                </Text>

                {/* Price */}
                <Text className="mt-1 text-base font-semibold text-blue-600">
                  ?{Number(listing.price).toLocaleString()}
                </Text>

                {/* University */}
                <Text className="mt-2 text-sm text-gray-500">
                  {listing.university_name}
                </Text>

                {/* Condition + Category */}
                <Text className="mt-1 text-sm text-gray-500">
                  {listing.condition} · {listing.category}
                </Text>

                {/* Pickup */}
                <Text className="mt-1 text-sm text-gray-500">
                  Pickup: {listing.pickup_location}
                </Text>
              </View>
            ))}

          {/* No Results */}
          {!loading && error === "" && filteredListings.length === 0 && (
            <View className="mt-4 rounded-2xl bg-white p-6">
              <Text className="text-center text-lg font-semibold text-gray-900">
                No items found
              </Text>

              <Text className="mt-2 text-center text-gray-500">
                Try a different search or remove some filters.
              </Text>

              {hasActiveFilters && (
                <TouchableOpacity
                  onPress={clearFilters}
                  className="mt-4 self-center rounded-xl bg-blue-600 px-5 py-3"
                >
                  <Text className="font-semibold text-white">
                    Clear Filters
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
