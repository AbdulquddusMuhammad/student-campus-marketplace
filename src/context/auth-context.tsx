import * as SecureStore from 'expo-secure-store';
import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from 'react';

const API_URL = 'https://student-campus-marketplace-api.onrender.com';

type User = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  created_at: string;
};

type AuthResponse = {
  accessToken: string;
  refreshToken: string;
  user: User;
};

type AuthContextType = {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (
    name: string,
    email: string,
    phone: string,
    password: string,
  ) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ACCESS_TOKEN_KEY = 'student_marketplace_access_token';
const REFRESH_TOKEN_KEY = 'student_marketplace_refresh_token';
const USER_KEY = 'student_marketplace_user';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStoredAuth();
  }, []);

  async function loadStoredAuth() {
    try {
      const storedAccessToken = await SecureStore.getItemAsync(
        ACCESS_TOKEN_KEY,
      );

      const storedRefreshToken = await SecureStore.getItemAsync(
        REFRESH_TOKEN_KEY,
      );

      const storedUser = await SecureStore.getItemAsync(USER_KEY);

      if (!storedRefreshToken || !storedUser) {
        await clearStoredAuth();
        return;
      }

      const parsedUser: User = JSON.parse(storedUser);

      if (storedAccessToken) {
        setToken(storedAccessToken);
        setUser(parsedUser);
        return;
      }

      const refreshedAuth = await refreshLogin(storedRefreshToken);

      await saveAuth(
        refreshedAuth.accessToken,
        refreshedAuth.refreshToken,
        refreshedAuth.user,
      );
    } catch (error) {
      console.error('Load authentication error:', error);

      await clearStoredAuth();
    } finally {
      setLoading(false);
    }
  }

  async function saveAuth(
    accessToken: string,
    refreshToken: string,
    authUser: User,
  ) {
    await SecureStore.setItemAsync(
      ACCESS_TOKEN_KEY,
      accessToken,
    );

    await SecureStore.setItemAsync(
      REFRESH_TOKEN_KEY,
      refreshToken,
    );

    await SecureStore.setItemAsync(
      USER_KEY,
      JSON.stringify(authUser),
    );

    setToken(accessToken);
    setUser(authUser);
  }

  async function refreshLogin(
    refreshToken: string,
  ): Promise<AuthResponse> {
    const response = await fetch(`${API_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        refreshToken,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.message || 'Your login session has expired',
      );
    }

    return data;
  }

  async function login(email: string, password: string) {
    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Could not log in');
    }

    await saveAuth(
      data.accessToken,
      data.refreshToken,
      data.user,
    );
  }

  async function register(
    name: string,
    email: string,
    phone: string,
    password: string,
  ) {
    const response = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name,
        email,
        phone,
        password,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.message || 'Could not create account',
      );
    }

    await saveAuth(
      data.accessToken,
      data.refreshToken,
      data.user,
    );
  }

  async function clearStoredAuth() {
    await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    await SecureStore.deleteItemAsync(USER_KEY);

    setToken(null);
    setUser(null);
  }

  async function logout() {
    await clearStoredAuth();
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      'useAuth must be used inside AuthProvider',
    );
  }

  return context;
}
