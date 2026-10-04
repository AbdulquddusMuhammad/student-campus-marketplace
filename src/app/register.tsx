import { Link, router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useAuth } from '@/context/auth-context';

export default function RegisterScreen() {
  const { register } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleRegister() {
    setError('');

    if (!name.trim() || !email.trim() || !password) {
      setError('Name, email, and password are required.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    try {
      setSubmitting(true);

      await register(
        name.trim(),
        email.trim(),
        phone.trim(),
        password,
      );

      router.replace('/');
    } catch (error) {
      setError(
        error instanceof Error ? error.message : 'Could not create account',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView
        contentContainerClassName="flex-grow justify-center px-6 py-10"
        keyboardShouldPersistTaps="handled"
      >
        <View className="mb-8">
          <Text className="text-3xl font-bold text-gray-900">
            Create account
          </Text>

          <Text className="mt-2 text-base text-gray-500">
            Join your campus marketplace.
          </Text>
        </View>

        <View className="gap-4">
          <View>
            <Text className="mb-2 text-sm font-medium text-gray-700">
              Full name
            </Text>

            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Your full name"
              placeholderTextColor="#9CA3AF"
              autoCapitalize="words"
              className="rounded-xl border border-gray-300 px-4 py-4 text-base text-gray-900"
            />
          </View>

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
              Phone number
            </Text>

            <TextInput
              value={phone}
              onChangeText={setPhone}
              placeholder="08012345678"
              placeholderTextColor="#9CA3AF"
              keyboardType="phone-pad"
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
              placeholder="At least 6 characters"
              placeholderTextColor="#9CA3AF"
              secureTextEntry
              className="rounded-xl border border-gray-300 px-4 py-4 text-base text-gray-900"
            />
          </View>

          <View>
            <Text className="mb-2 text-sm font-medium text-gray-700">
              Confirm password
            </Text>

            <TextInput
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Enter your password again"
              placeholderTextColor="#9CA3AF"
              secureTextEntry
              className="rounded-xl border border-gray-300 px-4 py-4 text-base text-gray-900"
            />
          </View>

          {error ? (
            <Text className="text-sm text-red-600">{error}</Text>
          ) : null}

          <Pressable
            onPress={handleRegister}
            disabled={submitting}
            className={`items-center rounded-xl py-4 ${
              submitting ? 'bg-gray-400' : 'bg-black'
            }`}
          >
            {submitting ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text className="text-base font-semibold text-white">
                Create Account
              </Text>
            )}
          </Pressable>
        </View>

        <View className="mt-8 flex-row justify-center">
          <Text className="text-gray-500">
            Already have an account?{' '}
          </Text>

          <Link href="/login" asChild>
            <Pressable>
              <Text className="font-semibold text-black">
                Log in
              </Text>
            </Pressable>
          </Link>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
