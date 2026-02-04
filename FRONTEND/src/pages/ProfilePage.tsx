import { useState, type FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import authService from '../services/authService';

import { Link, useNavigate } from 'react-router-dom';

export function ProfilePage() {
    const { user, updateUser, logout } = useAuth();
    const navigate = useNavigate();
    const [username, setUsername] = useState(user?.username || '');
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [profileSuccess, setProfileSuccess] = useState('');
    const [profileError, setProfileError] = useState('');
    const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');
    const [passwordSuccess, setPasswordSuccess] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [isChangingPassword, setIsChangingPassword] = useState(false);

    const handleProfileUpdate = async (e: FormEvent) => {
        e.preventDefault();
        setProfileError('');
        setProfileSuccess('');
        setIsUpdatingProfile(true);

        try {
            const response = await authService.updateProfile({ username });
            if (response.status === 200 && response.data) {
                updateUser(response.data);
                setProfileSuccess('Profile updated successfully');
                setIsEditingProfile(false);
            } else {
                throw new Error('Failed to update profile');
            }
        } catch (err) {
            setProfileError(err instanceof Error ? err.message : 'Update failed');
        } finally {
            setIsUpdatingProfile(false);
        }
    };

    const handlePasswordChange = async (e: FormEvent) => {
        e.preventDefault();
        setPasswordError('');
        setPasswordSuccess('');

        if (newPassword !== confirmNewPassword) {
            setPasswordError('New passwords do not match');
            return;
        }

        if (newPassword.length < 8) {
            setPasswordError('Password must be at least 8 characters');
            return;
        }

        setIsChangingPassword(true);

        try {
            const response = await authService.changePassword({
                old_password: oldPassword,
                new_password: newPassword,
            });
            if (response.status === 200) {
                setPasswordSuccess('Password changed successfully');
                setOldPassword('');
                setNewPassword('');
                setConfirmNewPassword('');
            } else {
                throw new Error(response.message?.error || 'Failed to change password');
            }
        } catch (err) {
            setPasswordError(err instanceof Error ? err.message : 'Failed to change password');
        } finally {
            setIsChangingPassword(false);
        }
    };

    return (
        <div className="page profile-page">
            <header className="page-header">
                <h1>My Profile</h1>
                <p>Manage your account settings</p>
            </header>

            <div className="profile-content">
                <section className="profile-section">
                    <div className="profile-card">
                        <div className="profile-avatar">
                            <span>{user?.username?.charAt(0).toUpperCase()}</span>
                        </div>
                        <div className="profile-info">
                            <h2>{user?.username}</h2>
                            <p>{user?.email}</p>
                        </div>
                    </div>
                </section>

                <section className="profile-section">
                    <h3>Edit Profile</h3>
                    <form onSubmit={handleProfileUpdate} className="profile-form">
                        {profileSuccess && <div className="success-message">{profileSuccess}</div>}
                        {profileError && <div className="error-message">{profileError}</div>}

                        <div className="form-group">
                            <label htmlFor="email">Email</label>
                            <input
                                type="email"
                                id="email"
                                value={user?.email || ''}
                                disabled
                                className="input-disabled"
                            />
                            <span className="form-hint">Email cannot be changed</span>
                        </div>

                        <div className="form-group">
                            <label htmlFor="username">Username</label>
                            <input
                                type="text"
                                id="username"
                                value={username}
                                onChange={(e) => {
                                    setUsername(e.target.value);
                                    setIsEditingProfile(true);
                                }}
                                placeholder="Your username"
                            />
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={!isEditingProfile || isUpdatingProfile}
                        >
                            {isUpdatingProfile ? (
                                <span className="loader-small"></span>
                            ) : (
                                'Save Changes'
                            )}
                        </button>
                    </form>
                </section>

                <section className="profile-section">
                    <h3>Change Password</h3>
                    <form onSubmit={handlePasswordChange} className="profile-form">
                        {passwordSuccess && <div className="success-message">{passwordSuccess}</div>}
                        {passwordError && <div className="error-message">{passwordError}</div>}

                        <div className="form-group">
                            <label htmlFor="oldPassword">Current Password</label>
                            <input
                                type="password"
                                id="oldPassword"
                                value={oldPassword}
                                onChange={(e) => setOldPassword(e.target.value)}
                                placeholder="Enter current password"
                                autoComplete="current-password"
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="newPassword">New Password</label>
                            <input
                                type="password"
                                id="newPassword"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="Enter new password"
                                autoComplete="new-password"
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="confirmNewPassword">Confirm New Password</label>
                            <input
                                type="password"
                                id="confirmNewPassword"
                                value={confirmNewPassword}
                                onChange={(e) => setConfirmNewPassword(e.target.value)}
                                placeholder="Confirm new password"
                                autoComplete="new-password"
                            />
                        </div>

                        <button
                            type="submit"
                            className="btn btn-secondary"
                            disabled={!oldPassword || !newPassword || !confirmNewPassword || isChangingPassword}
                        >
                            {isChangingPassword ? (
                                <span className="loader-small"></span>
                            ) : (
                                'Change Password'
                            )}
                        </button>
                    </form>
                </section>
                <section className="profile-section">
                    <h3>Account Actions</h3>
                    <button
                        onClick={() => {
                            logout();
                            navigate('/login');
                        }}
                        className="btn btn-danger"
                        style={{ width: '100%', justifyContent: 'center' }}
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                            <polyline points="16,17 21,12 16,7" />
                            <line x1="21" y1="12" x2="9" y2="12" />
                        </svg>
                        Logout
                    </button>
                </section>
            </div>
        </div>
    );
}
