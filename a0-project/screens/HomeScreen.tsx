import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, Linking, Share } from 'react-native';
import * as Location from 'expo-location';
import { Text, TextInput, Button } from '../lib/paper';
import { useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';
import { colors, spacing } from '../lib/theme';
import ShopOwnerScreen from './ShopOwnerScreen';
import CustomerScreen from './CustomerScreen';
import AdminScreen from './AdminScreen';

export default function HomeScreen() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userType, setUserType] = useState<'shopowner' | 'customer' | 'admin' | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState('');
  const [userDisplayName, setUserDisplayName] = useState('');
  const [userPhone, setUserPhone] = useState('');
  const [approvalStatus, setApprovalStatus] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [mode, setMode] = useState<'signIn' | 'signUp' | 'forgotPassword' | 'resetPassword'>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [resetLink, setResetLink] = useState('');
  const [signupUserType, setSignupUserType] = useState<'shopowner' | 'customer'>('shopowner');
  const [shopAddress, setShopAddress] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [shopLatitude, setShopLatitude] = useState<number | null>(null);
  const [shopLongitude, setShopLongitude] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const signUpMutation = useMutation(api.auth_mutations.signUp);
  const signInMutation = useMutation(api.auth_mutations.signIn);
  const requestPasswordReset = useMutation(api.auth_mutations.requestPasswordReset);
  const resetPasswordWithToken = useMutation(api.auth_mutations.resetPasswordWithToken);
  const notifyShopOwnerPaid = useMutation(api.auth_mutations.notifyShopOwnerPaid);

  const handleUseCurrentLocation = async () => {
    setLoading(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert('Location permission needed', 'Please allow location access or type your shop address manually.');
        return;
      }

      const position = await Location.getCurrentPositionAsync({});
      setShopLatitude(position.coords.latitude);
      setShopLongitude(position.coords.longitude);
      setShopAddress(`Current location: ${position.coords.latitude.toFixed(5)}, ${position.coords.longitude.toFixed(5)}`);
    } catch (error) {
      Alert.alert('Location failed', 'Could not get your location. Please type the shop address manually.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      Alert.alert('Email required', 'Enter your email address first.');
      return;
    }

    setLoading(true);
    try {
      const result = await requestPasswordReset({ email });
      if (result.resetLink) {
        const token = result.resetLink.split('token=')[1] ?? '';
        setResetToken(token);
        setResetLink(result.resetLink);
        setMode('resetPassword');
        Alert.alert('Reset link created', 'Use the reset screen now. When email sending is connected, this same link can be emailed automatically.');
      } else {
        Alert.alert('Reset requested', 'If this email exists, a reset link will be created.');
        setMode('signIn');
      }
    } catch (error) {
      Alert.alert('Error', 'Could not create reset link. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!resetToken.trim() || password.trim().length < 6) {
      Alert.alert('Missing details', 'Enter the reset token and a new password with at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      await resetPasswordWithToken({ token: resetToken, newPassword: password });
      Alert.alert('Password updated', 'You can sign in with your new password.');
      setPassword('');
      setResetToken('');
      setResetLink('');
      setMode('signIn');
    } catch (error) {
      Alert.alert('Invalid link', 'This reset link is invalid or expired. Request a new one.');
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = async () => {
    if (mode === 'forgotPassword') {
      await handleForgotPassword();
      return;
    }

    if (mode === 'resetPassword') {
      await handleResetPassword();
      return;
    }

    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }

    if (mode === 'signUp' && !displayName.trim()) {
      Alert.alert('Name required', 'Enter your full name so shops and customers can identify the right account.');
      return;
    }

    if (mode === 'signUp' && signupUserType === 'shopowner' && !shopAddress.trim()) {
      Alert.alert('Shop location required', 'Please type your shop address or use your current location.');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'signUp') {
        const result = await signUpMutation({
          email,
          password,
          userType: signupUserType,
          displayName,
          phone: phone || undefined,
          shopAddress: signupUserType === 'shopowner' ? shopAddress : undefined,
          inviteCode: signupUserType === 'customer' && inviteCode.trim() ? inviteCode.trim().toUpperCase() : undefined,
          shopLatitude: signupUserType === 'shopowner' ? shopLatitude ?? undefined : undefined,
          shopLongitude: signupUserType === 'shopowner' ? shopLongitude ?? undefined : undefined,
        });
        if (!result.success || !result.userType) {
          Alert.alert('Account exists', 'This email is already registered. Please sign in instead.');
          setMode('signIn');
          return;
        }
        setIsLoggedIn(true);
        setUserId(result.userId ?? null);
        setUserEmail(result.email ?? email.toLowerCase().trim());
        setUserDisplayName(result.displayName ?? displayName.trim());
        setUserPhone(result.phone ?? phone.trim());
        setUserType(result.userType);
        setApprovalStatus(result.approvalStatus ?? 'pending');
      } else {
        const result = await signInMutation({ email, password });
        setIsLoggedIn(true);
        setUserId(result.userId);
        setUserEmail(result.email);
        setUserDisplayName(result.displayName ?? result.email.split('@')[0]);
        setUserPhone(result.phone ?? '');
        setUserType(result.userType);
        setApprovalStatus(result.approvalStatus);
      }
    } catch (error: any) {
      const message = String(error?.message || 'Authentication failed');

      if (message.includes('User already exists')) {
        Alert.alert('Account exists', 'This email is already registered. Please sign in instead.');
        setMode('signIn');
        return;
      }

      if (message.includes('User not found')) {
        Alert.alert('Account not found', 'No account exists for this email. Please create an account first.');
        setMode('signUp');
        return;
      }

      if (message.includes('Invalid password')) {
        Alert.alert('Wrong password', 'The password you entered is incorrect.');
        return;
      }

      Alert.alert('Error', 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePaidNotification = async () => {
    if (!userId) {
      Alert.alert('Error', 'Could not find your account. Please sign in again.');
      return;
    }

    setLoading(true);
    try {
      await notifyShopOwnerPaid({ userId: userId as any });
      Alert.alert('Payment notification sent', 'Admin can now see that you paid R200. Please also send proof on WhatsApp.');
    } catch (error) {
      Alert.alert('Error', 'Could not notify admin. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUserId(null);
    setUserEmail('');
    setUserDisplayName('');
    setUserPhone('');
    setUserType(null);
    setApprovalStatus('pending');
    setEmail('');
    setPassword('');
    setResetToken('');
    setResetLink('');
    setInviteCode('');
    setMode('signIn');
  };

  if (!isLoggedIn) {
    return (
      <ScrollView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>Spaza Smart Manager MVP</Text>
          <Text style={styles.subtitle}>
            {mode === 'signIn' ? 'Sign In' : mode === 'signUp' ? 'Create Account' : mode === 'forgotPassword' ? 'Forgot Password' : 'Reset Password'}
          </Text>

          <TextInput
            label="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            style={styles.input}
            editable={!loading}
          />

          {mode === 'signUp' && (
            <>
              <TextInput
                label="Full name"
                value={displayName}
                onChangeText={setDisplayName}
                style={styles.input}
                editable={!loading}
              />
              <TextInput
                label="WhatsApp / phone number"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                style={styles.input}
                editable={!loading}
              />
              <Text style={styles.locationHelp}>
                Use the real customer name. Shop owners will search this name before allocating debt.
              </Text>
              <View style={styles.choiceRow}>
                <Button
                  mode={signupUserType === 'shopowner' ? 'contained' : 'outlined'}
                  onPress={() => setSignupUserType('shopowner')}
                  style={styles.choiceButton}
                >
                  Shop Owner
                </Button>
                <Button
                  mode={signupUserType === 'customer' ? 'contained' : 'outlined'}
                  onPress={() => setSignupUserType('customer')}
                  style={styles.choiceButton}
                >
                  Customer
                </Button>
              </View>

              {signupUserType === 'customer' && (
                <>
                  <TextInput
                    label="Customer invite code"
                    value={inviteCode}
                    onChangeText={(value: string) => setInviteCode(value.toUpperCase())}
                    autoCapitalize="characters"
                    style={styles.input}
                    editable={!loading}
                  />
                  <Text style={styles.locationHelp}>
                    Enter the code from your shop owner. This links your dashboard to the correct shop for purchases and debts.
                  </Text>
                </>
              )}

              {signupUserType === 'shopowner' && (
                <>
                  <TextInput
                    label="Shop address / location"
                    value={shopAddress}
                    onChangeText={(value: string) => {
                      setShopAddress(value);
                      if (!value.startsWith('Current location:')) {
                        setShopLatitude(null);
                        setShopLongitude(null);
                      }
                    }}
                    style={styles.input}
                    editable={!loading}
                  />
                  <Button
                    mode="outlined"
                    onPress={handleUseCurrentLocation}
                    disabled={loading}
                    style={styles.locationButton}
                  >
                    Use Current Location
                  </Button>
                  <Text style={styles.locationHelp}>
                    Required for shop owners. You can type the address or allow GPS location.
                  </Text>
                </>
              )}
            </>
          )}

          {mode === 'resetPassword' && (
            <TextInput
              label="Reset token"
              value={resetToken}
              onChangeText={setResetToken}
              style={styles.input}
              editable={!loading}
            />
          )}

          {mode !== 'forgotPassword' && (
            <TextInput
              label={mode === 'resetPassword' ? 'New password' : 'Password'}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              style={styles.input}
              editable={!loading}
            />
          )}

          {mode === 'forgotPassword' && (
            <Text style={styles.infoText}>
              Enter your account email to create a one-hour reset link. Automatic email sending still needs an email provider connected.
            </Text>
          )}

          {mode === 'resetPassword' && resetLink ? (
            <>
              <Text style={styles.infoText}>Reset link: {resetLink}</Text>
              <Button
                mode="outlined"
                onPress={() => Share.share({ message: `SpazaSmart password reset link: ${resetLink}` })}
                style={styles.button}
              >
                Share Reset Link
              </Button>
            </>
          ) : null}

          <Button
            mode="contained"
            onPress={handleAuth}
            loading={loading}
            disabled={loading}
            style={styles.button}
          >
            {mode === 'signIn' ? 'Sign In' : mode === 'signUp' ? 'Sign Up' : mode === 'forgotPassword' ? 'Create Reset Link' : 'Set New Password'}
          </Button>

          {mode === 'signIn' && (
            <Button mode="text" onPress={() => setMode('forgotPassword')} disabled={loading}>
              Forgot password?
            </Button>
          )}

          <Button
            mode="text"
            onPress={() => {
              setPassword('');
              setResetToken('');
              setResetLink('');
              setMode(mode === 'signIn' ? 'signUp' : 'signIn');
            }}
            disabled={loading}
          >
            {mode === 'signIn'
              ? "Don't have an account? Sign up"
              : 'Already have an account? Sign in'}
          </Button>
        </View>
      </ScrollView>
    );
  }

  if (userType === 'admin') {
    return <AdminScreen onLogout={handleLogout} />;
  }

  if (userType === 'shopowner' && approvalStatus === 'approved' && userId) {
    return <ShopOwnerScreen onLogout={handleLogout} ownerId={userId} ownerEmail={userEmail} />;
  }

  if (userType === 'shopowner') {
    return (
      <ScrollView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>Payment Required</Text>
          <Text style={styles.subtitle}>Waiting for admin approval</Text>
          <Text style={styles.feeText}>App access fee: R200 once-off</Text>
          <Text style={styles.infoText}>
            Send R200 by EFT to the banking details below. After paying, tap “I’ve Paid” so admin gets notified, then send proof of payment on WhatsApp. You will get access after admin approves your account.
          </Text>

          <View style={styles.bankCard}>
            <Text style={styles.bankLine}>Bank name: Standard Bank</Text>
            <Text style={styles.bankLine}>Branch name: DURBAN ABC</Text>
            <Text style={styles.bankLine}>Branch code: 126</Text>
            <Text style={styles.bankLine}>Account holder: MR BULELANI BN FUDUSWA</Text>
            <Text style={styles.bankLine}>Account number: 05 058 076 0</Text>
            <Text style={styles.bankLine}>Account type: CURRENT</Text>
            <Text style={styles.bankLine}>SWIFT code: SBZAZAJJ</Text>
          </View>

          <Button
            mode="contained"
            onPress={handlePaidNotification}
            loading={loading}
            disabled={loading}
            style={styles.button}
          >
            I’ve Paid R200 - Notify Admin
          </Button>

          <Button
            mode="outlined"
            onPress={() => Linking.openURL('https://wa.me/message/34QED5WS6DMPE1')}
            style={styles.button}
          >
            Send Proof on WhatsApp
          </Button>

          <Button mode="outlined" onPress={handleLogout} style={styles.button}>
            Sign Out
          </Button>
        </View>
      </ScrollView>
    );
  }

  if (userType === 'customer') {
    return <CustomerScreen onLogout={handleLogout} customerEmail={userEmail} customerName={userDisplayName || userEmail.split('@')[0]} customerPhone={userPhone} />;
  }

  return null;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    justifyContent: 'center',
    minHeight: '100%',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.xl,
  },
  input: {
    marginBottom: spacing.md,
  },
  choiceRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  choiceButton: {
    flex: 1,
  },
  locationButton: {
    marginBottom: spacing.sm,
  },
  locationHelp: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: spacing.md,
  },
  button: {
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  feeText: {
    color: colors.text,
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: spacing.md,
  },
  infoText: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  bankCard: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  bankLine: {
    color: colors.text,
    fontSize: 14,
    marginBottom: spacing.sm,
  },
});
