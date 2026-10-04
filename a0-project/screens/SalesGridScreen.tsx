import React from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { Text, Card } from '../lib/paper';
import { colors, spacing } from '../lib/theme';
import type { SaleStatement } from './ProductsGridScreen';

const mockSales: SaleStatement[] = [
  { id: '1', customerName: 'Walk-in Customer', customerPhone: '', items: 'Bread x 5', total: 75, date: '2025-08-01', type: 'cash' },
  { id: '2', customerName: 'Jane Smith', customerPhone: '+27987654321', items: 'Milk x 2', total: 44, date: '2025-08-01', type: 'debt' },
];

export default function SalesGridScreen({ sales = mockSales }: { sales?: SaleStatement[] }) {
  const visibleSales = sales.length > 0 ? sales : mockSales;
  const totalSales = visibleSales.reduce((sum, sale) => sum + sale.total, 0);
  const cashSales = visibleSales.filter((sale) => sale.type === 'cash').reduce((sum, sale) => sum + sale.total, 0);
  const debtSales = visibleSales.filter((sale) => sale.type === 'debt').reduce((sum, sale) => sum + sale.total, 0);

  const renderSaleCard = ({ item }: { item: SaleStatement }) => (
    <Card style={[styles.saleCard, { 
      borderLeftColor: item.type === 'cash' ? colors.success : colors.warning,
      borderLeftWidth: 4,
    }]}>
      <View style={styles.saleContent}>
        <Text style={styles.productName}>{item.customerName}</Text>
        <Text style={styles.quantity}>{item.items}</Text>
        <Text style={styles.total}>R{item.total.toFixed(2)}</Text>
        <View style={styles.footer}>
          <Text style={styles.date}>{item.date}</Text>
          <Text style={[styles.type, { color: item.type === 'cash' ? colors.success : colors.warning }]}>
            {item.type.toUpperCase()}
          </Text>
        </View>
      </View>
    </Card>
  );

  return (
    <View style={styles.container}>
      <View style={styles.statsRow}>
        <Card style={styles.statCard}>
          <View style={styles.statContent}>
            <Text style={styles.statLabel}>Total Sales</Text>
            <Text style={styles.statValue}>R{totalSales.toFixed(2)}</Text>
          </View>
        </Card>
        <Card style={styles.statCard}>
          <View style={styles.statContent}>
            <Text style={styles.statLabel}>Cash</Text>
            <Text style={[styles.statValue, { color: colors.success }]}>R{cashSales.toFixed(2)}</Text>
          </View>
        </Card>
        <Card style={styles.statCard}>
          <View style={styles.statContent}>
            <Text style={styles.statLabel}>Debt</Text>
            <Text style={[styles.statValue, { color: colors.warning }]}>R{debtSales.toFixed(2)}</Text>
          </View>
        </Card>
      </View>

      <FlatList
        data={visibleSales}
        renderItem={renderSaleCard}
        keyExtractor={item => item.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        scrollEnabled={true}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 12,
  },
  statContent: {
    padding: spacing.md,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: colors.muted,
    marginBottom: spacing.sm,
  },
  statValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.primary,
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  saleCard: {
    width: '48%',
    backgroundColor: colors.card,
    borderRadius: 12,
  },
  saleContent: {
    padding: spacing.md,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  quantity: {
    fontSize: 12,
    color: colors.muted,
    marginBottom: spacing.sm,
  },
  total: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: spacing.md,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  date: {
    fontSize: 11,
    color: colors.muted,
  },
  type: {
    fontSize: 11,
    fontWeight: 'bold',
  },
});
