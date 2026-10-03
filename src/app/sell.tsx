import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const categories = [
  'Furniture',
  'Electronics',
  'Kitchen',
  'Books',
  'Clothing',
  'Others',
];

const conditions = [
  'New',
  'Like New',
  'Good',
  'Fair',
];

const API_URL = 'http://10.0.2.2:5000';

export default function SellScreen() {
  const [images, setImages] = useState<string[]>([]);
  const [itemName, setItemName] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('');
  const [condition, setCondition] = useState('');
  const [description, setDescription] = useState('');
  const [pickupLocation, setPickupLocation] = useState('');
  const [publishing, setPublishing] = useState(false);

  async function pickImages() {
    const permission =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        'Permission needed',
        'Please allow access to your photos so you can add pictures to your listing.',
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: 5,
      quality: 0.8,
    });

    if (!result.canceled) {
      setImages(result.assets.map((asset) => asset.uri).slice(0, 5));
    }
  }

  async function publishListing() {
    if (images.length === 0) {
      Alert.alert('Add photos', 'Please add at least one photo.');
      return;
    }

    if (!itemName.trim()) {
      Alert.alert('Item name required', 'Please enter the name of the item.');
      return;
    }

    if (!price.trim()) {
      Alert.alert('Price required', 'Please enter a price.');
      return;
    }

    const numericPrice = Number(price.replace(/,/g, ''));

    if (Number.isNaN(numericPrice) || numericPrice < 0) {
      Alert.alert('Invalid price', 'Please enter a valid price.');
      return;
    }

    if (!category) {
      Alert.alert('Category required', 'Please select a category.');
      return;
    }

    if (!condition) {
      Alert.alert('Condition required', 'Please select the item condition.');
      return;
    }

    if (!description.trim()) {
      Alert.alert(
        'Description required',
        'Please describe the item before publishing.',
      );
      return;
    }

    if (!pickupLocation.trim()) {
      Alert.alert(
        'Pickup location required',
        'Please enter where buyers can collect the item.',
      );
      return;
    }

    try {
      setPublishing(true);

      // Step 1: Create the listing without the images.
      const response = await fetch(`${API_URL}/api/listings/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sellerId: '1',
          universityId: '1',
          title: itemName.trim(),
          description: description.trim(),
          price: numericPrice,
          category,
          condition,
          pickupLocation: pickupLocation.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || 'Failed to create listing',
        );
      }

      const listingId = data.listing.id;

      // Step 2: Upload each image separately.
      for (const uri of images) {
        const uploadResult = await FileSystem.uploadAsync(
          `${API_URL}/api/listings/${listingId}/images`,
          uri,
          {
            httpMethod: 'POST',
            uploadType: FileSystem.FileSystemUploadType.MULTIPART,
            fieldName: 'image',
            mimeType: 'image/jpeg',
          },
        );

        if (
          uploadResult.status < 200 ||
          uploadResult.status >= 300
        ) {
          throw new Error(
            'Failed to upload one of the images.',
          );
        }
      }

      Alert.alert(
        'Listing published',
        'Your item has been added to the marketplace.',
      );

      setImages([]);
      setItemName('');
      setPrice('');
      setCategory('');
      setCondition('');
      setDescription('');
      setPickupLocation('');
    } catch (error) {
      console.error('Publish listing error:', error);

      Alert.alert(
        'Could not publish',
        error instanceof Error
          ? error.message
          : 'We could not save your listing. Please try again.',
      );
    } finally {
      setPublishing(false);
    }
  }

  return (
    <View className="flex-1 bg-gray-50">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        <View className="px-5 pb-4 pt-14">
          <Text className="text-3xl font-bold text-gray-900">
            Sell an Item
          </Text>

          <Text className="mt-2 text-base text-gray-500">
            Give your item a new home on campus.
          </Text>
        </View>

        {/* Photos */}
        <View className="px-5 pt-4">
          <Text className="mb-3 text-base font-semibold text-gray-900">
            Photos
          </Text>

          <TouchableOpacity
            onPress={pickImages}
            className="min-h-40 items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 bg-white p-3"
          >
            {images.length === 0 ? (
              <>
                <Text className="text-3xl text-gray-400">+</Text>

                <Text className="mt-2 font-medium text-gray-500">
                  Add photos
                </Text>

                <Text className="mt-1 text-sm text-gray-400">
                  Add up to 5 photos
                </Text>
              </>
            ) : (
              <View className="w-full flex-row flex-wrap justify-center">
                {images.map((uri) => (
                  <Image
                    key={uri}
                    source={{ uri }}
                    className="m-1 h-24 w-24 rounded-xl"
                  />
                ))}
              </View>
            )}
          </TouchableOpacity>

          {images.length > 0 && (
            <TouchableOpacity
              onPress={pickImages}
              className="mt-3 items-center"
            >
              <Text className="font-semibold text-blue-600">
                Change photos
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Item name */}
        <View className="px-5 pt-6">
          <Text className="mb-2 text-base font-semibold text-gray-900">
            Item name
          </Text>

          <TextInput
            value={itemName}
            onChangeText={setItemName}
            placeholder="e.g. Study table"
            placeholderTextColor="#9ca3af"
            className="rounded-xl bg-white px-4 py-4 text-base text-gray-900"
          />
        </View>

        {/* Price */}
        <View className="px-5 pt-5">
          <Text className="mb-2 text-base font-semibold text-gray-900">
            Price
          </Text>

          <TextInput
            value={price}
            onChangeText={setPrice}
            placeholder="e.g. 25000"
            placeholderTextColor="#9ca3af"
            keyboardType="numeric"
            className="rounded-xl bg-white px-4 py-4 text-base text-gray-900"
          />
        </View>

        {/* Category */}
        <View className="px-5 pt-5">
          <Text className="mb-3 text-base font-semibold text-gray-900">
            Category
          </Text>

          <View className="flex-row flex-wrap">
            {categories.map((item) => (
              <TouchableOpacity
                key={item}
                onPress={() => setCategory(item)}
                className={`mb-3 mr-2 rounded-full px-4 py-3 ${
                  category === item
                    ? 'bg-blue-600'
                    : 'bg-white'
                }`}
              >
                <Text
                  className={`font-medium ${
                    category === item
                      ? 'text-white'
                      : 'text-gray-700'
                  }`}
                >
                  {item}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Condition */}
        <View className="px-5 pt-2">
          <Text className="mb-3 text-base font-semibold text-gray-900">
            Condition
          </Text>

          <View className="flex-row flex-wrap">
            {conditions.map((item) => (
              <TouchableOpacity
                key={item}
                onPress={() => setCondition(item)}
                className={`mb-3 mr-2 rounded-full px-4 py-3 ${
                  condition === item
                    ? 'bg-blue-600'
                    : 'bg-white'
                }`}
              >
                <Text
                  className={`font-medium ${
                    condition === item
                      ? 'text-white'
                      : 'text-gray-700'
                  }`}
                >
                  {item}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Description */}
        <View className="px-5 pt-2">
          <Text className="mb-2 text-base font-semibold text-gray-900">
            Description
          </Text>

          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Describe the item, including anything a buyer should know."
            placeholderTextColor="#9ca3af"
            multiline
            textAlignVertical="top"
            className="h-32 rounded-xl bg-white px-4 py-4 text-base text-gray-900"
          />
        </View>

        {/* Pickup location */}
        <View className="px-5 pt-5">
          <Text className="mb-2 text-base font-semibold text-gray-900">
            Pickup location
          </Text>

          <TextInput
            value={pickupLocation}
            onChangeText={setPickupLocation}
            placeholder="e.g. New Hostel, Block A"
            placeholderTextColor="#9ca3af"
            className="rounded-xl bg-white px-4 py-4 text-base text-gray-900"
          />
        </View>

        {/* Publish */}
        <View className="px-5 pt-7">
          <TouchableOpacity
            onPress={publishListing}
            disabled={publishing}
            className={`items-center rounded-xl py-4 ${
              publishing
                ? 'bg-blue-400'
                : 'bg-blue-600'
            }`}
          >
            {publishing ? (
              <View className="flex-row items-center">
                <ActivityIndicator color="white" />

                <Text className="ml-2 text-base font-bold text-white">
                  Publishing...
                </Text>
              </View>
            ) : (
              <Text className="text-base font-bold text-white">
                Publish Listing
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
