import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Alert, Linking } from 'react-native';
import { Text, Button } from '../lib/paper';
import { colors, spacing } from '../lib/theme';

interface PaymentScreenProps {
  storeId: string;
}

export default function PaymentScreen({ storeId }: PaymentScreenProps) {
  const [proofFile, setProofFile] = useState<string | null>(null);
  const [status, setStatus] = useState<'pending' | 'submitted' | 'verified'>('pending');

  const handleUploadProof = () => {
    Alert.alert(
      'Upload Payment Proof',
      'Choose how to submit proof of payment',
      [
        {
          text: 'Take Photo',
          onPress: () => Alert.alert('Camera', 'Camera will open to take receipt photo'),
        },
        {
          text: 'Upload Receipt',
          onPress: () => Alert.alert('File Upload', 'File picker will open - select PDF or image of receipt'),
        },
        {
          text: 'Cancel',
          onPress: () => {},
          style: 'cancel',
        },
      ]
    );
  };

  const handleSendViaWhatsApp = () => {
    const message = `I have submitted payment proof for store verification. Please check and approve my account.`;
    const whatsappUrl = `https://wa.me/27835161488?text=${encodeURIComponent(message)}`;
    Linking.openURL(whatsappUrl).catch(() =>
      Alert.alert('Error', 'WhatsApp not installed')
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>💳 Payment Verification</Text>
        <Text style={styles.subtitle}>
          Submit proof of your payment to activate your account
        </Text>

        {status === 'pending' && (
          <>
            <View style={styles.section}>
              <Text style={styles.label}>Step 1: Make Payment</Text>
              <Text style={styles.text}>
                Transfer payment to the account details provided by admin
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>Step 2: Upload Proof</Text>
              <Button
                mode="contained"
                onPress={handleUploadProof}
                style={styles.button}
              >
                📸 Upload Payment Proof (Photo/PDF)
              </Button>
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>Step 3: Send Confirmation</Text>
              <Button
                mode="contained"
                onPress={handleSendViaWhatsApp}
                style={[styles.button, { backgroundColor: '#25D366' }]}
              >
                💬 Send via WhatsApp
              </Button>
            </View>
          </>
        )}

        {status === 'submitted' && (
          <View style={styles.statusCard}>
            <Text style={styles.statusText}>⏳ Payment verification pending</Text>
            <Text style={styles.statusSubtext}>
              Your payment proof has been submitted. Admin will review and approve within 24 hours.
            </Text>
          </View>
        )}

        {status === 'verified' && (
          <View style={[styles.statusCard, { backgroundColor: '#D1FAE5' }]}>
            <Text style={[styles.statusText, { color: '#065F46' }]}>
              ✅ Account Verified
            </Text>
            <Text style={[styles.statusSubtext, { color: '#065F46' }]}>
              Your payment has been approved. You now have full access!
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: 14,
    color: colors.muted,
    marginBottom: spacing.lg,
  },
  section: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  text: {
    fontSize: 14,
    color: colors.muted,
  },
  button: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
  },
  statusCard: {
    backgroundColor: '#FEF3C7',
    padding: spacing.lg,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#92400E',
    marginBottom: spacing.sm,
  },
  statusSubtext: {
    fontSize: 14,
    color: '#92400E',
  },
});
