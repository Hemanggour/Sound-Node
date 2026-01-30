import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { jwtDecode } from 'jwt-decode';
import type { User, LoginRequest, RegisterRequest } from '../types';
import authService from '../services/authService';

// JWT payload structure from token
interface JWTPayload {
    token_type: string;
    exp: number;
    iat: number;
    jti: string;
    user_uuid: string;
    user: {
        username: string;
        email: string;
    };
}

// Extract user from JWT payload
function getUserFromToken(token: string): User | null {
    try {
        const payload = jwtDecode<JWTPayload>(token);
        return {
            user_uuid: payload.user_uuid,
            username: payload.user.username,
            email: payload.user.email,
        };
    } catch {
        return null;
    }
}

interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    login: (data: LoginRequest) => Promise<void>;
    register: (data: RegisterRequest) => Promise<void>;
    logout: () => void;
    updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Check for existing session on mount by calling profile endpoint
        const checkAuth = async () => {
            try {
                const response = await authService.getProfile();
                if (response.status === 200 && response.data) {
                    setUser(response.data);
                }
            } catch {
                // Not authenticated or session expired
                setUser(null);
            } finally {
                setIsLoading(false);
            }
        };

        checkAuth();
    }, []);

    const login = async (data: LoginRequest) => {
        const response = await authService.login(data);

        if (response.status === 200 && response.data.tokens) {
            const { access } = response.data.tokens;

            // Decode token to get user info
            const userFromToken = getUserFromToken(access);
            if (userFromToken) {
                setUser(userFromToken);
            } else {
                throw new Error('Failed to decode user from token');
            }
        } else {
            throw new Error(response.message?.error || 'Login failed');
        }
    };

    const register = async (data: RegisterRequest) => {
        const response = await authService.register(data);

        if (response.status === 201 && response.data) {
            const { access } = response.data.tokens;

            // Decode token to get user info
            const userFromToken = getUserFromToken(access);
            if (userFromToken) {
                setUser(userFromToken);
            } else {
                throw new Error('Failed to decode user from token');
            }
        } else {
            throw new Error(response.message?.email || response.message?.error || 'Registration failed');
        }
    };

    const logout = () => {
        // Clear user state - backend should have a logout endpoint to clear cookies
        // For now, just clear client state. Cookie will expire or be cleared by backend.
        setUser(null);
    };

    const updateUser = (updatedUser: User) => {
        setUser(updatedUser);
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                isLoading,
                isAuthenticated: !!user,
                login,
                register,
                logout,
                updateUser,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

