import { Text, View } from 'react-native';

export default function ProfileScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-gray-50">
      <Text className="text-2xl font-bold text-gray-900">
        Profile
      </Text>
      <Text className="mt-2 text-gray-500">
        Manage your account and listings.
      </Text>
    </View>
  );
}
