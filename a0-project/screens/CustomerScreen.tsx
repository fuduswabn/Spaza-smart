import React, { useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, Linking } from 'react-native';
import * as Location from 'expo-location';
import { Text, Button, Card, TextInput } from '../lib/paper';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../convex/_generated/api';
import { colors, spacing } from '../lib/theme';

type CustomerScreenProps = {
  onLogout: () => void;
  customerEmail: string;
  customerName: string;
  customerPhone: string;
};

export default function CustomerScreen({ onLogout, customerEmail, customerName, customerPhone }: CustomerScreenProps) {
  const [tab, setTab] = useState<'shops' | 'debts' | 'history'>('shops');
  const customerDebts = useQuery(api.auth_mutations.listCustomerDebts, { customerEmail });
  const customerPurchases = useQuery(api.auth_mutations.listCustomerPurchases, { customerEmail });
  const discoverableShops = useQuery(api.auth_mutations.listDiscoverableShops);
  const joinShopAsCustomer = useMutation(api.auth_mutations.joinShopAsCustomer);
  const [searchQuery, setSearchQuery] = useState('');
  const [customerLocation, setCustomerLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  const distanceKm = (from: { latitude: number; longitude: number }, to: { latitude: number; longitude: number }) => {
    const earthRadiusKm = 6371;
    const dLat = ((to.latitude - from.latitude) * Math.PI) / 180;
    const dLon = ((to.longitude - from.longitude) * Math.PI) / 180;
    const lat1 = (from.latitude * Math.PI) / 180;
    const lat2 = (to.latitude * Math.PI) / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
    return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const nearbyShops = useMemo(() => {
    const shops = discoverableShops ?? [];
    return shops
      .map((shop: any) => {
        const hasGps = typeof shop.latitude === 'number' && typeof shop.longitude === 'number';
        const distance = customerLocation && hasGps
          ? distanceKm(customerLocation, { latitude: shop.latitude, longitude: shop.longitude })
          : null;
        return { ...shop, distance };
      })
      .filter((shop: any) => `${shop.name} ${shop.email} ${shop.address ?? ''}`.toLowerCase().includes(searchQuery.toLowerCase()))
      .sort((a: any, b: any) => (a.distance ?? 999999) - (b.distance ?? 999999));
  }, [customerLocation, discoverableShops, searchQuery]);

  const findShopsNearMe = async () => {
    try {
      setIsLocating(true);
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert('Location permission needed', 'Please allow location access to find nearby shops.');
        return;
      }

      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setCustomerLocation({ latitude: position.coords.latitude, longitude: position.coords.longitude });
    } catch (error) {
      Alert.alert('Location failed', 'Could not get your current location. Make sure GPS/location is switched on.');
    } finally {
      setIsLocating(false);
    }
  };

  const joinShopAndOpenDirections = async (shop: any) => {
    try {
      await joinShopAsCustomer({
        ownerId: shop.ownerId,
        storeId: shop.storeId,
        customerEmail,
        customerName,
        customerPhone: customerPhone || undefined,
      });

      if (typeof shop.latitude === 'number' && typeof shop.longitude === 'number') {
        await Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${shop.latitude},${shop.longitude}`);
      } else if (shop.address) {
        await Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(shop.address)}`);
      }

      Alert.alert('Shop added', `${shop.name} can now find you by name when allocating debt.`);
    } catch (error) {
      Alert.alert('Could not join shop', 'Please try again or ask the shop owner to invite you.');
    }
  };

  const renderShops = () => (
    <ScrollView style={styles.section}>
      <Card style={styles.card}>
        <Card.Content>
          <TextInput
            placeholder="Search shops..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            left={<TextInput.Icon icon="magnify" />}
            style={styles.searchInput}
          />
        </Card.Content>
      </Card>

      <Button mode="contained" onPress={findShopsNearMe} loading={isLocating} style={styles.button}>
        Find Shops Near Me
      </Button>

      {nearbyShops.length === 0 && (
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.subtitle}>No approved shops with locations are available yet.</Text>
          </Card.Content>
        </Card>
      )}

      {nearbyShops.map((shop: any) => (
        <Card key={shop.id} style={styles.card}>
          <Card.Content>
            <Text style={styles.shopName}>{shop.name}</Text>
            <View style={styles.shopInfo}>
              <Text style={styles.shopDetail}>{shop.distance === null ? 'Distance unknown' : `${shop.distance.toFixed(1)} km away`}</Text>
              <Text style={styles.shopDetail}>{shop.address ?? shop.email}</Text>
            </View>
            <Button
              mode="contained"
              onPress={() => joinShopAndOpenDirections(shop)}
              style={styles.button}
            >
              Join Shop & Get Directions
            </Button>
            <Text style={styles.helperText}>This adds you to this shop owner’s customer list so they can find your name before adding debt.</Text>
          </Card.Content>
        </Card>
      ))}
    </ScrollView>
  );

  const renderHistory = () => {
    const totalSpent = customerPurchases?.reduce((sum: number, purchase: any) => sum + purchase.amount, 0) ?? 0;

    return (
      <ScrollView style={styles.section}>
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.title}>What I Bought</Text>
            <Text style={styles.purchaseTotal}>R{totalSpent.toFixed(2)}</Text>
            <Text style={styles.subtitle}>All purchases recorded by shops you joined with an invite code.</Text>
          </Card.Content>
        </Card>

        {customerPurchases?.length === 0 && (
          <Card style={styles.card}>
            <Card.Content>
              <Text style={styles.subtitle}>No purchases have been sent to your account yet.</Text>
              <Button mode="contained" onPress={() => setTab('shops')} style={styles.button}>
                Find or Join Shops
              </Button>
            </Card.Content>
          </Card>
        )}

        {customerPurchases?.map((purchase: any) => (
          <Card key={purchase.id} style={styles.card}>
            <Card.Content>
              <Text style={styles.shopName}>{purchase.shopOwnerEmail}</Text>
              <Text style={styles.purchaseAmount}>R{purchase.amount.toFixed(2)}</Text>
              <Text style={styles.subtitle}>Items: {purchase.items}</Text>
              <Text style={styles.subtitle}>Payment: {purchase.paymentType.toUpperCase()}</Text>
              <Text style={styles.subtitle}>Date: {new Date(purchase.createdAt).toLocaleDateString()}</Text>
            </Card.Content>
          </Card>
        ))}
      </ScrollView>
    );
  };

  const renderDebts = () => {
    const totalOwed = customerDebts?.reduce((sum: number, debt: any) => debt.status === 'open' ? sum + debt.amount : sum, 0) ?? 0;

    return (
      <ScrollView style={styles.section}>
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.title}>My Debts</Text>
            <Text style={styles.debtTotal}>R{totalOwed.toFixed(2)}</Text>
            <Text style={styles.subtitle}>Outstanding from shop owners</Text>
          </Card.Content>
        </Card>

        {customerDebts?.length === 0 && (
          <Card style={styles.card}>
            <Card.Content>
              <Text style={styles.subtitle}>No debts have been sent to your account.</Text>
            </Card.Content>
          </Card>
        )}

        {customerDebts?.map((debt: any) => (
          <Card key={debt.id} style={styles.card}>
            <Card.Content>
              <Text style={styles.shopName}>{debt.shopOwnerEmail}</Text>
              <Text style={styles.debtAmount}>R{debt.amount.toFixed(2)}</Text>
              <Text style={styles.subtitle}>Items: {debt.items}</Text>
              <Text style={styles.subtitle}>Due: {debt.dueDate}</Text>
              <Text style={styles.subtitle}>Status: {debt.status}</Text>
            </Card.Content>
          </Card>
        ))}
      </ScrollView>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>Customer Dashboard</Text>
        <Button mode="outlined" onPress={onLogout} style={styles.logoutButton}>
          Log Out
        </Button>
      </View>

      <View style={styles.tabs}>
        {['shops', 'debts', 'history'].map((t) => (
          <Button
            key={t}
            onPress={() => setTab(t as any)}
            mode={tab === t ? 'contained' : 'outlined'}
            style={styles.tabButton}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </Button>
        ))}
      </View>

      {tab === 'shops' && renderShops()}
      {tab === 'debts' && renderDebts()}
      {tab === 'history' && renderHistory()}
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
  tabButton: {
    marginHorizontal: spacing.sm,
  },
  card: {
    backgroundColor: colors.card,
    marginVertical: spacing.sm,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  cardDescription: {
    color: colors.muted,
    fontSize: 14,
  },
  shopPrice: {
    color: colors.primary,
    fontSize: 18,
    fontWeight: 'bold',
  },
  section: { padding: spacing.md },
  searchInput: { backgroundColor: colors.card },
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: spacing.sm },
  subtitle: { color: colors.muted, marginBottom: spacing.md },
  shopName: { fontSize: 16, fontWeight: 'bold', marginBottom: spacing.sm },
  debtTotal: { color: colors.danger, fontSize: 28, fontWeight: 'bold', marginBottom: spacing.xs },
  debtAmount: { color: colors.danger, fontSize: 20, fontWeight: 'bold', marginBottom: spacing.sm },
  purchaseTotal: { color: colors.primary, fontSize: 28, fontWeight: 'bold', marginBottom: spacing.xs },
  purchaseAmount: { color: colors.primary, fontSize: 20, fontWeight: 'bold', marginBottom: spacing.sm },
  shopInfo: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  shopDetail: { color: colors.muted, fontSize: 12 },
  helperText: { color: colors.muted, fontSize: 12, lineHeight: 17, marginTop: spacing.sm },
  button: { marginTop: spacing.md },
});