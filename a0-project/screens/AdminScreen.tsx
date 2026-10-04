import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, Linking } from 'react-native';
import { Text, Button, Card, Divider, Chip } from '../lib/paper';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../convex/_generated/api';
import { colors, spacing } from '../lib/theme';

const BANKING_DETAILS = {
  bankName: 'Standard Bank',
  branch: 'DURBAN ABC',
  code: '126',
  accountHolder: 'MR BULELANI BN FUDUSWA',
  accountNumber: '05 058 076 0',
  type: 'CURRENT',
  swift: 'SBZAZAJJ',
};

type AdminScreenProps = {
  onLogout: () => void;
};

export default function AdminScreen({ onLogout }: AdminScreenProps) {
  const [tab, setTab] = useState<'overview' | 'banking' | 'payments'>('overview');
  const pendingShopOwners = useQuery(api.auth_mutations.listPendingShopOwners);
  const reviewShopOwner = useMutation(api.auth_mutations.reviewShopOwner);

  const handleReview = async (userId: string, approved: boolean) => {
    try {
      await reviewShopOwner({ userId: userId as any, approved });
      Alert.alert('Success', approved ? 'Shop owner approved.' : 'Shop owner rejected.');
    } catch (error) {
      Alert.alert('Error', 'Could not update this shop owner.');
    }
  };


  const renderOverview = () => (
    <ScrollView style={styles.section}>
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.title}>Admin Dashboard</Text>
          <Text style={styles.subtitle}>Manage your store ecosystem</Text>
          <Divider style={{ marginVertical: spacing.md }} />
          
          <View style={styles.statsRow}>
            <Card style={styles.statCard}>
              <Card.Content>
                <Text style={styles.statValue}>{pendingShopOwners?.length ?? 0}</Text>
                <Text style={styles.statLabel}>Pending Owners</Text>
              </Card.Content>
            </Card>
            <Card style={styles.statCard}>
              <Card.Content>
                <Text style={styles.statValue}>Links</Text>
                <Text style={styles.statLabel}>User Self Reset</Text>
              </Card.Content>
            </Card>
          </View>
        </Card.Content>
      </Card>
    </ScrollView>
  );

  const renderBanking = () => (
    <ScrollView style={styles.section}>
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.title}>Banking Details</Text>
          <Text style={styles.subtitle}>Your account information for customer payments</Text>
          <Divider style={{ marginVertical: spacing.md }} />
          
          <View style={styles.bankDetails}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Bank Name:</Text>
              <Text style={styles.detailValue}>{BANKING_DETAILS.bankName}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Branch:</Text>
              <Text style={styles.detailValue}>{BANKING_DETAILS.branch}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Branch Code:</Text>
              <Text style={styles.detailValue}>{BANKING_DETAILS.code}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Account Holder:</Text>
              <Text style={styles.detailValue}>{BANKING_DETAILS.accountHolder}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Account Number:</Text>
              <Text style={styles.detailValue}>{BANKING_DETAILS.accountNumber}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Account Type:</Text>
              <Text style={styles.detailValue}>{BANKING_DETAILS.type}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>SWIFT Code:</Text>
              <Text style={styles.detailValue}>{BANKING_DETAILS.swift}</Text>
            </View>
          </View>

          <Button 
            mode="contained"
            onPress={() => Alert.alert('Banking Details', 'Copied to clipboard')}
            style={styles.button}
          >
            Copy All Details
          </Button>
        </Card.Content>
      </Card>
    </ScrollView>
  );

  const renderPayments = () => (
    <ScrollView style={styles.section}>
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.title}>Shop Owner Approvals</Text>
          <Text style={styles.subtitle}>
            {pendingShopOwners ? `${pendingShopOwners.length} waiting for approval` : 'Loading approvals...'}
          </Text>
          <Text style={styles.helpText}>
            App fee is R200. Approve only after the owner tapped “I’ve Paid” and you confirm EFT proof was received on WhatsApp.
          </Text>
        </Card.Content>
      </Card>

      {pendingShopOwners?.length === 0 && (
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.emptyText}>No pending shop owners.</Text>
          </Card.Content>
        </Card>
      )}

      {pendingShopOwners?.map((owner: any) => (
        <Card key={owner.id} style={styles.card}>
          <Card.Content>
            <View style={styles.paymentHeader}>
              <View style={styles.ownerInfo}>
                <Text style={styles.storeName}>Shop owner account</Text>
                <Text style={styles.email}>{owner.email}</Text>
              </View>
              <Chip
                label={owner.paymentNotificationStatus === 'submitted' ? 'Payment submitted' : 'Waiting for payment'}
                mode="flat"
              />
            </View>
            <Text style={styles.date}>Signed up: {new Date(owner.createdAt).toLocaleDateString()}</Text>
            <Text style={styles.paymentNotice}>Required payment: R{owner.appFeeAmount ?? 200}.00</Text>
            <Text style={owner.paymentNotificationStatus === 'submitted' ? styles.paymentSubmitted : styles.paymentWaiting}>
              {owner.paymentNotificationStatus === 'submitted'
                ? `Owner clicked paid: ${owner.paymentSubmittedAt ? new Date(owner.paymentSubmittedAt).toLocaleString() : 'time not available'}`
                : 'Owner has not clicked paid yet.'}
            </Text>
            <Text style={styles.locationText}>Shop location: {owner.shopAddress ?? 'Not provided'}</Text>
            {owner.shopLatitude !== undefined && owner.shopLongitude !== undefined && (
              <Button
                mode="text"
                onPress={() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${owner.shopLatitude},${owner.shopLongitude}`)}
              >
                Open GPS Location
              </Button>
            )}
            
            <View style={styles.paymentActions}>
              <Button 
                mode="contained"
                onPress={() => handleReview(owner.id, true)}
                style={[styles.button, styles.approveButton]}
              >
                Approve Access
              </Button>
              <Button 
                mode="outlined"
                onPress={() => handleReview(owner.id, false)}
                style={styles.button}
              >
                Reject
              </Button>
            </View>
          </Card.Content>
        </Card>
      ))}
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>Admin Dashboard</Text>
        <Button mode="outlined" onPress={onLogout} style={styles.logoutButton}>
          Log Out
        </Button>
      </View>

      <View style={styles.tabs}>
        {['overview', 'banking', 'payments'].map((t) => (
          <Button
            key={t}
            onPress={() => setTab(t as any)}
            mode={tab === t ? 'contained' : 'outlined'}
            style={styles.tabButton}
          >
            {t === 'overview' ? 'Home' : t === 'payments' ? 'Approvals' : 'Bank'}
          </Button>
        ))}
      </View>

      {tab === 'overview' && renderOverview()}
      {tab === 'banking' && renderBanking()}
      {tab === 'payments' && renderPayments()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.primary,
    padding: spacing.lg,
    paddingTop: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerText: {
    color: colors.background,
    fontSize: 24,
    fontWeight: 'bold',
    flex: 1,
  },
  logoutButton: {
    borderColor: colors.background,
  },
  bankingSection: {
    backgroundColor: colors.card,
    padding: spacing.md,
    marginVertical: spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  bankingLabel: {
    color: colors.muted,
    fontSize: 12,
    marginBottom: spacing.xs,
  },
  bankingValue: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  paymentCard: {
    backgroundColor: colors.card,
    marginVertical: spacing.sm,
  },
  paymentStatus: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  tabs: { flexDirection: 'row', padding: spacing.md, gap: spacing.sm },
  tabButton: { flex: 1 },
  section: { padding: spacing.md },
  card: { marginBottom: spacing.md },
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: spacing.sm },
  subtitle: { color: colors.muted, marginBottom: spacing.md },
  helpText: { color: colors.text, fontSize: 13, lineHeight: 19 },
  statsRow: { flexDirection: 'row', gap: spacing.md },
  statCard: { flex: 1 },
  statValue: { fontSize: 20, fontWeight: 'bold' },
  statLabel: { color: colors.muted, fontSize: 12 },
  bankDetails: { backgroundColor: colors.card, padding: spacing.md, borderRadius: 8, marginBottom: spacing.md },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
  detailLabel: { fontWeight: '600', color: colors.muted },
  detailValue: { fontWeight: 'bold', color: colors.text },
  button: { marginTop: spacing.md },
  input: { backgroundColor: colors.card, marginTop: spacing.md },
  paymentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  storeName: { fontSize: 14, fontWeight: 'bold' },
  ownerInfo: { flex: 1, paddingRight: spacing.md },
  emptyText: { color: colors.muted, fontSize: 15 },
  approveButton: { backgroundColor: colors.success },
  email: { color: colors.muted, fontSize: 12 },
  date: { color: colors.muted, fontSize: 12, marginBottom: spacing.sm },
  paymentNotice: { color: colors.text, fontSize: 14, fontWeight: 'bold', marginBottom: spacing.xs },
  paymentSubmitted: { color: colors.success, fontSize: 13, fontWeight: '600', marginBottom: spacing.sm },
  paymentWaiting: { color: colors.warning, fontSize: 13, fontWeight: '600', marginBottom: spacing.sm },
  locationText: { color: colors.text, fontSize: 13, marginBottom: spacing.sm },
  paymentActions: { flexDirection: 'row', gap: spacing.sm },
});