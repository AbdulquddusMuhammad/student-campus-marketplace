import { Link, router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useAuth } from '@/context/auth-context';

export default function LoginScreen() {
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleLogin() {
    setError('');

    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }

    try {
      setSubmitting(true);

      await login(email.trim(), password);

      router.replace('/(tabs)/index');
    } catch (error) {
      setError(
        error instanceof Error ? error.message : 'Could not log in',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 justify-center px-6">
        <View className="mb-10">
          <Text className="text-3xl font-bold text-gray-900">
            Welcome back
          </Text>

          <Text className="mt-2 text-base text-gray-500">
            Log in to continue to Student Campus Marketplace.
          </Text>
        </View>

        <View className="gap-4">
          <View>
            <Text className="mb-2 text-sm font-medium text-gray-700">
              Email
            </Text>

            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="student@example.com"
              placeholderTextColor="#9CA3AF"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              className="rounded-xl border border-gray-300 px-4 py-4 text-base text-gray-900"
            />
          </View>

          <View>
            <Text className="mb-2 text-sm font-medium text-gray-700">
              Password
            </Text>

            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Enter your password"
              placeholderTextColor="#9CA3AF"
              secureTextEntry
              className="rounded-xl border border-gray-300 px-4 py-4 text-base text-gray-900"
            />
          </View>

          {error ? (
            <Text className="text-sm text-red-600">{error}</Text>
          ) : null}

          <Pressable
            onPress={handleLogin}
            disabled={submitting}
            className={`items-center rounded-xl py-4 ${
              submitting ? 'bg-gray-400' : 'bg-black'
            }`}
          >
            {submitting ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text className="text-base font-semibold text-white">
                Log In
              </Text>
            )}
          </Pressable>
        </View>

        <View className="mt-8 flex-row justify-center">
          <Text className="text-gray-500">
            Don't have an account?{' '}
          </Text>

          <Link href="/register" asChild>
            <Pressable>
              <Text className="font-semibold text-black">
                Create account
              </Text>
            </Pressable>
          </Link>
        </View>
      </View>
    </SafeAreaView>
  );
}

