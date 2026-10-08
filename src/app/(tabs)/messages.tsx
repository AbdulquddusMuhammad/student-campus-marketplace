import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { useAuth } from "@/context/auth-context";

const API_URL = "https://student-campus-marketplace-api.onrender.com";

type Conversation = {
  id: number;
  buyer_id: number;
  seller_id: number;
  listing_id: number;
  created_at: string;
  listing_title: string;
  other_user_name: string;
  other_user_id: number;
  last_message: string | null;
  last_message_at: string | null;
};

function formatMessageTime(dateString: string | null) {
  if (!dateString) {
    return "";
  }

  const date = new Date(dateString);
  const now = new Date();

  const isToday =
    date.toDateString() === now.toDateString();

  if (isToday) {
    return date.toLocaleTimeString("en-NG", {
      hour: "numeric",
      minute: "2-digit",
    });
  }

  return date.toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
  });
}

export default function MessagesScreen() {
  const router = useRouter();

  const { user, authenticatedFetch, loading: authLoading } =
    useAuth();

  const [conversations, setConversations] = useState<
    Conversation[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchConversations = useCallback(
    async (showLoading = true) => {
      if (!user) {
        setConversations([]);
        setLoading(false);
        return;
      }

      try {
        if (showLoading) {
          setLoading(true);
        }

        const response = await authenticatedFetch(
          `${API_URL}/api/messages/conversations`,
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.message || "Could not load conversations",
          );
        }

        setConversations(data.conversations);
      } catch (error) {
        console.error(
          "Fetch conversations error:",
          error,
        );

        Alert.alert(
          "Unable to load messages",
          error instanceof Error
            ? error.message
            : "Something went wrong",
        );
      } finally {
        setLoading(false);
      }
    },
    [authenticatedFetch, user],
  );

  useFocusEffect(
    useCallback(() => {
      fetchConversations();
    }, [fetchConversations]),
  );

  async function handleRefresh() {
    try {
      setRefreshing(true);

      await fetchConversations(false);
    } finally {
      setRefreshing(false);
    }
  }

  if (authLoading || loading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" />

        <Text className="mt-3 text-gray-500">
          Loading messages...
        </Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 px-6">
        <Text className="text-2xl font-bold text-gray-900">
          Messages
        </Text>

        <Text className="mt-2 text-center text-gray-500">
          Log in to view your conversations with sellers
          and buyers.
        </Text>

        <TouchableOpacity
          onPress={() => router.push("/login")}
          className="mt-6 rounded-xl bg-blue-600 px-6 py-3"
        >
          <Text className="font-bold text-white">
            Log In
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="border-b border-gray-200 bg-white px-5 pb-5 pt-14">
        <Text className="text-2xl font-bold text-gray-900">
          Messages
        </Text>

        <Text className="mt-1 text-sm text-gray-500">
          Your conversations
        </Text>
      </View>

      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
          />
        }
        contentContainerStyle={{
          padding: 16,
          paddingBottom: 32,
        }}
      >
        {conversations.length === 0 ? (
          <View className="items-center rounded-2xl bg-white px-6 py-12">
            <Text className="text-xl font-bold text-gray-900">
              No conversations yet
            </Text>

            <Text className="mt-2 text-center text-gray-500">
              When you message a seller or someone messages
              you about an item, the conversation will appear
              here.
            </Text>
          </View>
        ) : (
          conversations.map((conversation) => (
            <TouchableOpacity
              key={conversation.id}
              onPress={() =>
                router.push({
                  pathname: "/chat/[conversationId]",
                  params: {
                    conversationId: String(
                      conversation.id,
                    ),
                  },
                })
              }
              className="mb-3 rounded-2xl bg-white p-4"
            >
              <View className="flex-row items-center">
                {/* Avatar */}
                <View className="mr-3 h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                  <Text className="text-lg font-bold text-blue-600">
                    {conversation.other_user_name
                      .charAt(0)
                      .toUpperCase()}
                  </Text>
                </View>

                {/* Conversation information */}
                <View className="flex-1">
                  <View className="flex-row items-center justify-between">
                    <Text
                      className="flex-1 text-base font-bold text-gray-900"
                      numberOfLines={1}
                    >
                      {conversation.other_user_name}
                    </Text>

                    {conversation.last_message_at && (
                      <Text className="ml-2 text-xs text-gray-400">
                        {formatMessageTime(
                          conversation.last_message_at,
                        )}
                      </Text>
                    )}
                  </View>

                  <Text
                    className="mt-1 text-sm font-medium text-blue-600"
                    numberOfLines={1}
                  >
                    {conversation.listing_title}
                  </Text>

                  <Text
                    className="mt-1 text-sm text-gray-500"
                    numberOfLines={2}
                  >
                    {conversation.last_message ||
                      "No messages yet"}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}
