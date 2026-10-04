import React from 'react';
import { View, StyleSheet, Alert, FlatList, Linking } from 'react-native';
import { Text, Button, Card } from '../lib/paper';
import { colors, spacing } from '../lib/theme';

interface CustomerDebt {
  id: string;
  name: string;
  phone: string;
  email?: string;
  amount: number;
  dueDate: string;
  items?: string;
}

interface ShopCustomer {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
}

export default function DebtScreen({ debts = [], customers = [] }: { debts?: CustomerDebt[]; customers?: ShopCustomer[] }) {
  const handleSendSMS = (phone: string, name: string, amount: number) => {
    const debt = debts.find((item) => item.phone === phone && item.name === name && item.amount === amount);
    const message = `Hi ${name}, you owe R${amount.toFixed(2)}${debt?.items ? ` for ${debt.items}` : ''}. Please settle as soon as possible. Thank you.`;
    Linking.openURL(`sms:${phone}?body=${encodeURIComponent(message)}`);
  };

  const handleSendWhatsApp = async (phone: string, name: string, amount: number) => {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const debt = debts.find((item) => item.phone === phone && item.name === name && item.amount === amount);
    const message = `Hi ${name}, you owe R${amount.toFixed(2)}${debt?.items ? ` for ${debt.items}` : ''}. Please settle as soon as possible. Thank you.`;
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;

    try {
      const canOpen = await Linking.canOpenURL(url);
      if (!canOpen) {
        Alert.alert('WhatsApp unavailable', 'Please install WhatsApp or send an SMS instead.');
        return;
      }
      await Linking.openURL(url);
    } catch {
      Alert.alert('Could not open WhatsApp', 'Please try SMS or open WhatsApp manually.');
    }
  };

  const renderDebtCard = ({ item }: { item: CustomerDebt }) => (
    <Card style={[styles.card, { marginBottom: spacing.md }]}>
      <View style={styles.cardContent}>
        <Text style={styles.customerName}>{item.name}</Text>
        <Text style={styles.debtAmount}>R{item.amount.toFixed(2)}</Text>
        {item.items ? <Text style={styles.itemsText}>Bought: {item.items}</Text> : null}
        <Text style={styles.dueDate}>Due: {item.dueDate}</Text>
        <View style={styles.buttonRow}>
          <Button 
            mode="outlined" 
            size="small"
            onPress={() => handleSendSMS(item.phone, item.name, item.amount)}
            style={{ flex: 1, marginRight: spacing.sm }}
          >
            SMS
          </Button>
          <Button 
            mode="outlined" 
            size="small"
            onPress={() => handleSendWhatsApp(item.phone, item.name, item.amount)}
            style={{ flex: 1 }}
          >
            WhatsApp
          </Button>
        </View>
      </View>
    </Card>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Customer Debts</Text>
      <Text style={styles.subtitle}>Total Outstanding: R{debts.reduce((sum, d) => sum + d.amount, 0).toFixed(2)}</Text>
      {debts.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.customerName}>No open debts yet</Text>
          <Text style={styles.itemsText}>Real debts will appear here after you select a joined customer in Products → Cart and choose Debt.</Text>
          <Text style={styles.sectionTitle}>Available joined customers</Text>
          {customers.length === 0 ? (
            <Text style={styles.itemsText}>No customers joined yet. Go to Invite, create a code, and ask the customer to sign up with it.</Text>
          ) : customers.map((customer) => (
            <View key={customer.id} style={styles.customerRow}>
              <Text style={styles.customerName}>{customer.customerName}</Text>
              <Text style={styles.itemsText}>{customer.customerEmail}</Text>
              {customer.customerPhone ? <Text style={styles.itemsText}>{customer.customerPhone}</Text> : null}
            </View>
          ))}
        </View>
      ) : (
        <FlatList
          data={debts}
          renderItem={renderDebtCard}
          keyExtractor={(item) => item.id}
          scrollEnabled={true}
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
    padding: spacing.md,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: 16,
    color: colors.muted,
    marginBottom: spacing.md,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
  },
  cardContent: {
    padding: spacing.md,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  debtAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.danger,
    marginBottom: spacing.sm,
  },
  itemsText: {
    fontSize: 13,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  dueDate: {
    fontSize: 14,
    color: colors.muted,
    marginBottom: spacing.md,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  emptyCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: spacing.md,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  customerRow: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingVertical: spacing.sm,
  },
  listContent: {
    paddingBottom: spacing.xl,
  },
});
