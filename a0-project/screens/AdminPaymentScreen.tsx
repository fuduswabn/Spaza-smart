import React, { useState } from 'react';
import { View, StyleSheet, Alert, FlatList, ActivityIndicator } from 'react-native';
import { Text, Button, Card, Divider, TextInput } from '../lib/paper';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../convex/_generated/api';
import { colors, spacing } from '../lib/theme';

interface Payment {
  id: string;
  storeName: string;
  ownerName: string;
  status: string;
  submittedAt: number;
}

export function AdminPaymentScreen() {
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [verifying, setVerifying] = useState(false);

  const pendingPayments = useQuery(api.payments.getAllPendingPayments);
  const verifyPayment = useMutation(api.payments.verifyPayment);

  if (!pendingPayments) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const handleApprove = async (paymentId: string) => {
    setVerifying(true);
    try {
      await verifyPayment({
        verificationId: paymentId as any,
        adminCode: 'ADMIN',
        approved: true,
      });
      Alert.alert('Success', 'Payment approved and store activated.');
      setSelectedPaymentId(null);
    } catch (error) {
      Alert.alert('Error', 'Failed to approve payment.');
    } finally {
      setVerifying(false);
    }
  };

  const handleReject = async (paymentId: string) => {
    if (!rejectionReason.trim()) {
      Alert.alert('Error', 'Please provide a rejection reason.');
      return;
    }

    setVerifying(true);
    try {
      await verifyPayment({
        verificationId: paymentId as any,
        adminCode: 'ADMIN',
        approved: false,
        rejectionReason,
      });
      Alert.alert('Success', 'Payment rejected.');
      setSelectedPaymentId(null);
      setRejectionReason('');
    } catch (error) {
      Alert.alert('Error', 'Failed to reject payment.');
    } finally {
      setVerifying(false);
    }
  };

  const renderPaymentCard = ({ item }: any) => {
    const isSelected = selectedPaymentId === item.id;
    const submittedDate = new Date(item.submittedAt).toLocaleDateString();

    return (
      <Card style={[styles.paymentCard, isSelected && styles.selectedCard]}>
        <Card.Content>
          <View style={styles.paymentHeader}>
            <View>
              <Text style={styles.storeName}>{item.storeName}</Text>
              <Text style={styles.ownerName}>{item.ownerName}</Text>
            </View>
            <Text style={styles.dateText}>{submittedDate}</Text>
          </View>

          {isSelected && (
            <>
              <Divider style={styles.divider} />
              <View style={styles.actionSection}>
                <TextInput
                  label="Rejection Reason (if rejecting)"
                  value={rejectionReason}
                  onChangeText={setRejectionReason}
                  multiline
                  numberOfLines={3}
                  style={styles.reasonInput}
                  editable={!verifying}
                />

                <View style={styles.buttonRow}>
                  <Button
                    mode="contained"
                    onPress={() => handleApprove(item.id)}
                    disabled={verifying}
                    loading={verifying}
                    style={[styles.button, styles.approveButton]}
                    labelStyle={styles.buttonLabel}
                  >
                    Approve
                  </Button>
                  <Button
                    mode="outlined"
                    onPress={() => handleReject(item.id)}
                    disabled={verifying}
                    style={[styles.button, styles.rejectButton]}
                    labelStyle={styles.buttonLabel}
                  >
                    Reject
                  </Button>
                </View>

                <Button
                  mode="text"
                  onPress={() => {
                    setSelectedPaymentId(null);
                    setRejectionReason('');
                  }}
                  style={styles.cancelButton}
                >
                  Cancel
                </Button>
              </View>
            </>
          )}
        </Card.Content>
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Pending Payments</Text>
        <Text style={styles.count}>{pendingPayments.length} pending</Text>
      </View>

      {pendingPayments.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No pending payments</Text>
        </View>
      ) : (
        <FlatList
          data={pendingPayments}
          renderItem={renderPaymentCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  count: {
    fontSize: 14,
    color: colors.muted,
  },
  listContent: {
    padding: spacing.md,
  },
  paymentCard: {
    marginBottom: spacing.md,
    backgroundColor: colors.card,
  },
  selectedCard: {
    borderWidth: 2,
    borderColor: colors.primary,
  },
  paymentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  storeName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  ownerName: {
    fontSize: 14,
    color: colors.muted,
    marginTop: spacing.xs,
  },
  dateText: {
    fontSize: 12,
    color: colors.muted,
  },
  divider: {
    marginVertical: spacing.md,
  },
  actionSection: {
    gap: spacing.md,
  },
  reasonInput: {
    backgroundColor: '#F5F5F5',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  button: {
    flex: 1,
  },
  approveButton: {
    backgroundColor: colors.success,
  },
  rejectButton: {
    borderColor: colors.danger,
  },
  buttonLabel: {
    paddingVertical: spacing.sm,
  },
  cancelButton: {
    marginTop: spacing.sm,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: colors.muted,
  },
});
