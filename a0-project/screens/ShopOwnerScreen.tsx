import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, Share } from 'react-native';
import * as Location from 'expo-location';
import { Text, Button, Card, TextInput } from '../lib/paper';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../convex/_generated/api';
import { colors, spacing } from '../lib/theme';
import ProductsGridScreen, { CustomerDebtRecord, SaleStatement } from './ProductsGridScreen';
import SalesGridScreen from './SalesGridScreen';
import DebtScreen from './DebtScreen';

type ShopOwnerScreenProps = {
  onLogout: () => void;
  ownerId: string;
  ownerEmail: string;
};

export default function ShopOwnerScreen({ onLogout, ownerId, ownerEmail }: ShopOwnerScreenProps) {
  const [tab, setTab] = useState<'overview' | 'stores' | 'products' | 'sales' | 'debts' | 'customers'>('overview');
  const [storeSearch, setStoreSearch] = useState('');
  const [newStoreName, setNewStoreName] = useState('');
  const [newStoreLocation, setNewStoreLocation] = useState('');
  const [newStoreGps, setNewStoreGps] = useState<{ latitude: number; longitude: number } | null>(null);
  const savedStores = useQuery(api.auth_mutations.listOwnerStores, { ownerId: ownerId as any });
  const [stores, setStores] = useState([
    { id: '1', name: 'My Store', code: 'STORE001', location: 'Libode', products: 24, sales: 156, closed: false },
  ]);
  const [products] = useState([
    { id: '1', name: 'Rice (25kg)', price: 850, quantity: 45 },
    { id: '2', name: 'Cooking Oil (5L)', price: 280, quantity: 12 },
    { id: '3', name: 'Flour (2kg)', price: 45, quantity: 89 },
  ]);
  const [customerDebts, setCustomerDebts] = useState<CustomerDebtRecord[]>([]);
  const [saleStatements, setSaleStatements] = useState<SaleStatement[]>([]);
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePhone, setInvitePhone] = useState('');
  const ownerDebts = useQuery(api.auth_mutations.listOwnerDebts, { ownerId: ownerId as any });
  const shopCustomers = useQuery(api.auth_mutations.listShopCustomers, { ownerId: ownerId as any });
  const createOwnerStore = useMutation(api.auth_mutations.createOwnerStore);
  const createCustomerInvite = useMutation(api.auth_mutations.createCustomerInvite);
  const createDebtEntry = useMutation(api.auth_mutations.createDebtEntry);
  const createPurchaseEntry = useMutation(api.auth_mutations.createPurchaseEntry);

  const backendStores = savedStores?.map((store: any) => ({
    id: store.id,
    name: store.name,
    code: store.code,
    location: store.address ?? 'No address saved',
    products: 0,
    sales: 0,
    closed: store.status !== 'active',
  })) ?? [];
  const allStores = backendStores.length > 0 ? backendStores : stores;
  const visibleStores = allStores.filter((store: any) =>
    `${store.name} ${store.code} ${store.location}`.toLowerCase().includes(storeSearch.toLowerCase())
  );

  const useCurrentStoreLocation = async () => {
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert('Location permission needed', 'Please allow location access or type your shop address manually.');
        return;
      }

      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setNewStoreGps({ latitude: position.coords.latitude, longitude: position.coords.longitude });
      setNewStoreLocation(`Current location: ${position.coords.latitude.toFixed(5)}, ${position.coords.longitude.toFixed(5)}`);
    } catch (error) {
      Alert.alert('Location failed', 'Could not get your location. Please type the shop address manually.');
    }
  };

  const addStore = async () => {
    if (!newStoreName.trim() || !newStoreLocation.trim()) {
      Alert.alert('Missing details', 'Enter store name and location.');
      return;
    }

    try {
      const result = await createOwnerStore({
        ownerId: ownerId as any,
        name: newStoreName.trim(),
        address: newStoreLocation.trim(),
        latitude: newStoreGps?.latitude,
        longitude: newStoreGps?.longitude,
      });

      setStores((current) => [
        ...current,
        {
          id: String(result.storeId),
          name: newStoreName.trim(),
          code: result.storeCode,
          location: newStoreLocation.trim(),
          products: 0,
          sales: 0,
          closed: false,
        },
      ]);
      setNewStoreName('');
      setNewStoreLocation('');
      setNewStoreGps(null);
      Alert.alert('Shop saved', 'This shop is now visible to customers using Find Shops Near Me.');
    } catch (error) {
      Alert.alert('Shop not saved', 'Could not save this shop. Make sure your shop owner account is approved.');
    }
  };

  const toggleStoreClosed = (storeId: string) => {
    setStores((current) =>
      current.map((store) =>
        store.id === storeId ? { ...store, closed: !store.closed } : store
      )
    );
  };

  const addCustomerDebt = async (debt: CustomerDebtRecord) => {
    try {
      await createDebtEntry({
        ownerId: ownerId as any,
        customerEmail: debt.email ?? '',
        customerName: debt.name,
        customerPhone: debt.phone || undefined,
        amount: debt.amount,
        items: debt.items,
        dueDate: debt.dueDate,
      });
      setCustomerDebts((current) => [debt, ...current]);
      return true;
    } catch (error) {
      return false;
    }
  };

  const addSaleStatement = async (sale: SaleStatement) => {
    if (!sale.customerEmail) {
      return false;
    }

    try {
      await createPurchaseEntry({
        ownerId: ownerId as any,
        customerEmail: sale.customerEmail,
        customerName: sale.customerName,
        customerPhone: sale.customerPhone || undefined,
        amount: sale.total,
        items: sale.items,
        paymentType: sale.type,
      });
      setSaleStatements((current) => [sale, ...current]);
      return true;
    } catch (error) {
      return false;
    }
  };

  const sendInvite = async () => {
    if (!inviteName.trim() || !inviteEmail.trim()) {
      Alert.alert('Missing customer', 'Enter the customer name and email.');
      return;
    }

    try {
      const result = await createCustomerInvite({
        ownerId: ownerId as any,
        customerEmail: inviteEmail,
        customerName: inviteName,
        customerPhone: invitePhone || undefined,
      });
      const message = `Hi ${inviteName}, ${ownerEmail} invited you to SpazaSmart. Sign up as a Customer and enter this invite code: ${result.inviteCode}. This links your dashboard to the correct shop so you can see purchases and debts. Link: ${result.inviteLink}`;
      await Share.share({ message });
      setInviteName('');
      setInviteEmail('');
      setInvitePhone('');
    } catch (error) {
      Alert.alert('Invite failed', 'Could not create the customer invite.');
    }
  };

  const renderCustomers = () => (
    <View style={styles.content}>
      <Text style={styles.heading}>Invite Customers</Text>
      <Card style={styles.card}>
        <Text style={styles.cardTitle}>Create customer invite code</Text>
        <Text style={styles.cardText}>Share this code with the customer. They must enter it during Customer signup so their dashboard is linked to your shop.</Text>
        <TextInput label="Customer name" value={inviteName} onChangeText={setInviteName} style={styles.input} />
        <TextInput label="Customer email" value={inviteEmail} onChangeText={setInviteEmail} keyboardType="email-address" autoCapitalize="none" style={styles.input} />
        <TextInput label="Customer WhatsApp / phone" value={invitePhone} onChangeText={setInvitePhone} keyboardType="phone-pad" style={styles.input} />
        <Button mode="contained" onPress={sendInvite} style={styles.button}>
          Create & Share Invite
        </Button>
      </Card>
      <Card style={styles.card}>
        <Text style={styles.cardTitle}>Joined customers</Text>
        {shopCustomers?.length ? shopCustomers.map((customer: any) => (
          <View key={customer.id} style={styles.customerListItem}>
            <Text style={styles.cardTitle}>{customer.customerName}</Text>
            <Text style={styles.cardText}>{customer.customerEmail}</Text>
            {customer.customerPhone ? <Text style={styles.cardText}>{customer.customerPhone}</Text> : null}
          </View>
        )) : (
          <Text style={styles.cardText}>No customers joined yet. Customers must tap your shop and choose “Join Shop & Get Directions”.</Text>
        )}
      </Card>
      <Card style={styles.card}>
        <Text style={styles.cardTitle}>Customer debt reminder</Text>
        <Text style={styles.cardText}>When selling on debt, search the joined customer by name in Products → Cart. This prevents sending debt to the wrong customer.</Text>
      </Card>
    </View>
  );

  const syncedDebts = ownerDebts?.map((debt: any) => ({
    id: debt.id,
    name: debt.customerName,
    phone: debt.customerPhone ?? '',
    email: debt.customerEmail,
    amount: debt.amount,
    dueDate: debt.dueDate,
    items: debt.items,
  })) ?? customerDebts;

  const renderContent = () => {
    switch (tab) {
      case 'overview':
        return (
          <View style={styles.content}>
            <Text style={styles.heading}>📊 Overview</Text>
            <Card style={styles.card}>
              <Text style={styles.cardTitle}>Today's Sales</Text>
              <Text style={styles.cardValue}>R 2,450</Text>
            </Card>
            <Card style={styles.card}>
              <Text style={styles.cardTitle}>Stock Value</Text>
              <Text style={styles.cardValue}>R {products.reduce((sum, product) => sum + product.price * product.quantity, 0).toLocaleString()}</Text>
            </Card>
            <Card style={styles.card}>
              <Text style={styles.cardTitle}>Low Stock Items</Text>
              <Text style={[styles.cardValue, { color: colors.danger }]}>{products.filter((product) => product.quantity <= 12).length}</Text>
              <Text style={styles.cardText}>Items that need to be bought or added soon</Text>
            </Card>
            <Card style={styles.card}>
              <Text style={styles.cardTitle}>Outstanding Debt</Text>
              <Text style={styles.cardValue}>R 1,200</Text>
            </Card>
          </View>
        );
      case 'stores':
        return (
          <View style={styles.content}>
            <Text style={styles.heading}>🏪 My Stores</Text>
            <TextInput
              label="Search stores"
              value={storeSearch}
              onChangeText={setStoreSearch}
              style={styles.input}
            />
            {visibleStores.map((store) => (
              <Card key={store.id} style={styles.card}>
                <Text style={styles.cardTitle}>{store.name}</Text>
                <Text style={styles.cardText}>Code: {store.code}</Text>
                <Text style={styles.cardText}>Location: {store.location}</Text>
                <Text style={styles.cardText}>Products: {store.products}</Text>
                <Text style={styles.cardText}>Sales Today: {store.sales}</Text>
                <Text style={[styles.cardText, store.closed ? { color: colors.danger } : { color: colors.success }]}>
                  Status: {store.closed ? 'Closed' : 'Open'}
                </Text>
                <Button mode="outlined" onPress={() => toggleStoreClosed(store.id)} style={styles.button}>
                  {store.closed ? 'Reopen Store' : 'Close Store'}
                </Button>
              </Card>
            ))}
            <Card style={styles.card}>
              <Text style={styles.cardTitle}>Register New Shop</Text>
              <TextInput label="Shop name" value={newStoreName} onChangeText={setNewStoreName} style={styles.input} />
              <TextInput label="Shop location / address" value={newStoreLocation} onChangeText={setNewStoreLocation} style={styles.input} />
              <Button mode="outlined" onPress={useCurrentStoreLocation} style={styles.secondaryButton}>
                Use Current Location
              </Button>
              <Button mode="contained" onPress={addStore} style={styles.button}>
                Add Shop With Location
              </Button>
            </Card>
          </View>
        );
      case 'products':
        return <ProductsGridScreen onDebtCreated={addCustomerDebt} onSaleCreated={addSaleStatement} shopCustomers={shopCustomers ?? []} />;
      case 'sales':
        return <SalesGridScreen sales={saleStatements} />;
      case 'debts':
        return <DebtScreen debts={syncedDebts} customers={shopCustomers ?? []} />;
      case 'customers':
        return renderCustomers();
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Shop Owner</Text>
        <Button mode="outlined" onPress={onLogout} style={styles.logoutButton}>
          Log Out
        </Button>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabsScroll}
        contentContainerStyle={styles.tabs}
      >
        <Button
          mode={tab === 'overview' ? 'contained' : 'outlined'}
          onPress={() => setTab('overview')}
          style={styles.tab}
          labelStyle={styles.tabLabel}
        >
          Home
        </Button>
        <Button
          mode={tab === 'stores' ? 'contained' : 'outlined'}
          onPress={() => setTab('stores')}
          style={styles.tab}
          labelStyle={styles.tabLabel}
        >
          Stores
        </Button>
        <Button
          mode={tab === 'products' ? 'contained' : 'outlined'}
          onPress={() => setTab('products')}
          style={styles.tab}
          labelStyle={styles.tabLabel}
        >
          Products
        </Button>
        <Button
          mode={tab === 'sales' ? 'contained' : 'outlined'}
          onPress={() => setTab('sales')}
          style={styles.tab}
          labelStyle={styles.tabLabel}
        >
          Sales
        </Button>
        <Button
          mode={tab === 'debts' ? 'contained' : 'outlined'}
          onPress={() => setTab('debts')}
          style={styles.tab}
          labelStyle={styles.tabLabel}
        >
          Debts
        </Button>
        <Button
          mode={tab === 'customers' ? 'contained' : 'outlined'}
          onPress={() => setTab('customers')}
          style={styles.tab}
          labelStyle={styles.tabLabel}
        >
          Invite
        </Button>
      </ScrollView>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>{renderContent()}</ScrollView>
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
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.background,
  },
  logoutButton: {
    borderColor: colors.background,
  },
  tabsScroll: {
    flexGrow: 0,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  tab: {
    minWidth: 92,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '800',
    marginHorizontal: 0,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  content: {
    gap: spacing.lg,
  },
  heading: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  card: {
    backgroundColor: colors.card,
    padding: spacing.lg,
    borderRadius: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  cardValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primary,
  },
  cardText: {
    fontSize: 14,
    color: colors.muted,
    marginVertical: spacing.xs,
  },
  customerListItem: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: spacing.sm,
  },
  button: {
    backgroundColor: colors.primary,
    marginTop: spacing.md,
  },
  secondaryButton: {
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.card,
    marginBottom: spacing.md,
  },
});
