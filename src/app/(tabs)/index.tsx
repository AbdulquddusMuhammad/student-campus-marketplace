import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const categories = [
  "Furniture",
  "Electronics",
  "Kitchen",
  "Books",
  "Clothing",
  "Others",
];

const API_URL = "https://student-campus-marketplace-api.onrender.com";

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

export default function HomeScreen() {
  const [listings, setListings] = useState<Listing[]>([]);
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

      setListings(data.listings);
    } catch (error) {
      console.error("Fetch listings error:", error);
      setError("Could not load listings. Make sure the server is running.");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchListings();
    }, [fetchListings]),
  );

  return (
    <View className="flex-1 bg-gray-50">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        {/* Header */}
        <View className="bg-blue-600 px-5 pb-7 pt-14">
          <Text className="text-2xl font-bold text-white">Campus Market</Text>

          <Text className="mt-1 text-sm text-blue-100">
            Buy and sell things around your campus.
          </Text>

          {/* Search */}
          <TextInput
            placeholder="Search for items..."
            placeholderTextColor="#6b7280"
            className="mt-5 rounded-xl bg-white px-4 py-4 text-base text-gray-900"
          />
        </View>

        {/* Categories */}
        <View className="px-5 pt-6">
          <Text className="text-xl font-bold text-gray-900">Categories</Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="mt-4"
          >
            {categories.map((category) => (
              <TouchableOpacity
                key={category}
                className="mr-3 rounded-full bg-white px-5 py-3"
              >
                <Text className="font-medium text-gray-700">{category}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Recent Listings */}
        <View className="px-5 pt-7">
          <View className="flex-row items-center justify-between">
            <Text className="text-xl font-bold text-gray-900">
              Recent Listings
            </Text>

            <TouchableOpacity>
              <Text className="font-semibold text-blue-600">See all</Text>
            </TouchableOpacity>
          </View>

          {/* Loading */}
          {loading && (
            <View className="mt-6 items-center py-8">
              <ActivityIndicator size="large" />

              <Text className="mt-3 text-gray-500">Loading listings...</Text>
            </View>
          )}

          {/* Error */}
          {!loading && error !== "" && (
            <View className="mt-4 rounded-2xl bg-white p-5">
              <Text className="text-center text-red-500">{error}</Text>

              <TouchableOpacity
                onPress={fetchListings}
                className="mt-4 self-center rounded-xl bg-blue-600 px-5 py-3"
              >
                <Text className="font-semibold text-white">Try Again</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Listings */}
          {!loading &&
            error === "" &&
            listings.map((listing) => (
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

                <Text className="mt-4 text-lg font-bold text-gray-900">
                  {listing.title}
                </Text>

                <Text className="mt-1 text-base font-semibold text-blue-600">
                  ?{Number(listing.price).toLocaleString()}
                </Text>

                <Text className="mt-2 text-sm text-gray-500">
                  {listing.university_name}
                </Text>

                <Text className="mt-1 text-sm text-gray-500">
                  {listing.condition} · {listing.category}
                </Text>

                <Text className="mt-1 text-sm text-gray-500">
                  Pickup: {listing.pickup_location}
                </Text>
              </View>
            ))}

          {/* No listings */}
          {!loading && error === "" && listings.length === 0 && (
            <View className="mt-4 rounded-2xl bg-white p-6">
              <Text className="text-center text-gray-500">
                No listings yet.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Sell button */}
      <TouchableOpacity className="absolute bottom-6 right-5 rounded-full bg-blue-600 px-6 py-4 shadow-lg">
        <Text className="font-bold text-white">+ Sell Item</Text>
      </TouchableOpacity>
    </View>
  );
}
