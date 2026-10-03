import { Text, View } from 'react-native';

export default function MessagesScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-gray-50">
      <Text className="text-2xl font-bold text-gray-900">
        Messages
      </Text>
      <Text className="mt-2 text-gray-500">
        Your conversations will appear here.
      </Text>
    </View>
  );
}
