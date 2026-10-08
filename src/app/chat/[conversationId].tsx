import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
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
  listing_title: string;
  buyer_name: string;
  seller_name: string;
  created_at: string;
};

type Message = {
  id: number;
  conversation_id: number;
  sender_id: number;
  sender_name: string;
  message: string;
  created_at: string;
};

export default function ChatScreen() {
  const router = useRouter();

  const { conversationId } = useLocalSearchParams<{
    conversationId: string;
  }>();

  const { user, authenticatedFetch } = useAuth();

  const [conversation, setConversation] =
    useState<Conversation | null>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const fetchConversation = useCallback(async () => {
    if (!conversationId) {
      return;
    }

    try {
      setLoading(true);

      const response = await authenticatedFetch(
        `${API_URL}/api/messages/conversations/${conversationId}`,
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Could not load conversation",
        );
      }

      setConversation(data.conversation);
      setMessages(data.messages);
    } catch (error) {
      console.error("Fetch conversation error:", error);

      Alert.alert(
        "Unable to load conversation",
        error instanceof Error
          ? error.message
          : "Something went wrong",
      );

      router.back();
    } finally {
      setLoading(false);
    }
  }, [authenticatedFetch, conversationId, router]);

  useEffect(() => {
    fetchConversation();
  }, [fetchConversation]);

  async function sendMessage() {
    const trimmedMessage = messageText.trim();

    if (!trimmedMessage || sending || !conversationId) {
      return;
    }

    try {
      setSending(true);

      const response = await authenticatedFetch(
        `${API_URL}/api/messages/conversations/${conversationId}/messages`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: trimmedMessage,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not send message");
      }

      setMessages((currentMessages) => [
        ...currentMessages,
        {
          ...data.message,
          sender_name: user?.name ?? "You",
        },
      ]);

      setMessageText("");
    } catch (error) {
      console.error("Send message error:", error);

      Alert.alert(
        "Message not sent",
        error instanceof Error
          ? error.message
          : "Could not send your message",
      );
    } finally {
      setSending(false);
    }
  }

  const otherUserName =
    user?.id === conversation?.buyer_id
      ? conversation?.seller_name
      : conversation?.buyer_name;

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" />

        <Text className="mt-3 text-gray-500">
          Loading conversation...
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-gray-50"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View className="border-b border-gray-200 bg-white px-5 pb-4 pt-14">
        <View className="flex-row items-center">
          <TouchableOpacity
            onPress={() => router.back()}
            className="mr-4"
          >
            <Text className="text-2xl text-gray-900">‹</Text>
          </TouchableOpacity>

          <View className="flex-1">
            <Text
              className="text-lg font-bold text-gray-900"
              numberOfLines={1}
            >
              {otherUserName || "Conversation"}
            </Text>

            <Text
              className="mt-1 text-sm text-gray-500"
              numberOfLines={1}
            >
              {conversation?.listing_title}
            </Text>
          </View>
        </View>
      </View>

      <FlatList
        data={messages}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{
          padding: 16,
          paddingBottom: 20,
        }}
        renderItem={({ item }) => {
          const isMine = item.sender_id === user?.id;

          return (
            <View
              className={`mb-3 flex-row ${
                isMine ? "justify-end" : "justify-start"
              }`}
            >
              <View
                className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  isMine
                    ? "rounded-br-sm bg-blue-600"
                    : "rounded-bl-sm bg-white"
                }`}
              >
                {!isMine && (
                  <Text className="mb-1 text-xs font-semibold text-gray-500">
                    {item.sender_name}
                  </Text>
                )}

                <Text
                  className={
                    isMine
                      ? "text-base text-white"
                      : "text-base text-gray-900"
                  }
                >
                  {item.message}
                </Text>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <View className="items-center py-10">
            <Text className="text-gray-500">
              No messages yet.
            </Text>

            <Text className="mt-1 text-sm text-gray-400">
              Start the conversation.
            </Text>
          </View>
        }
      />

      <View className="border-t border-gray-200 bg-white px-4 py-3">
        <View className="flex-row items-end">
          <TextInput
            value={messageText}
            onChangeText={setMessageText}
            placeholder="Type a message..."
            placeholderTextColor="#9ca3af"
            multiline
            maxLength={1000}
            className="max-h-28 flex-1 rounded-2xl bg-gray-100 px-4 py-3 text-base text-gray-900"
          />

          <TouchableOpacity
            onPress={sendMessage}
            disabled={sending || !messageText.trim()}
            className={`ml-2 rounded-2xl px-5 py-3 ${
              sending || !messageText.trim()
                ? "bg-gray-300"
                : "bg-blue-600"
            }`}
          >
            <Text className="font-bold text-white">
              {sending ? "..." : "Send"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
