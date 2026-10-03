import { Text, View } from 'react-native';

export default function SearchScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-gray-50">
      <Text className="text-2xl font-bold text-gray-900">
        Search
      </Text>
      <Text className="mt-2 text-gray-500">
        Find items around your campus.
      </Text>
    </View>
  );
}
