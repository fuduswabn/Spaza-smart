import React, { useMemo, useState } from 'react';
import { View, StyleSheet, FlatList, Alert } from 'react-native';
import { Text, Button, Card, TextInput, Modal, Portal } from '../lib/paper';
import { colors, spacing } from '../lib/theme';

interface Product {
  id: string;
  name: string;
  price: number;
  quantity: number;
  barcode: string;
  reorderAt: number;
}

export interface CustomerDebtRecord {
  id: string;
  name: string;
  phone: string;
  email?: string;
  amount: number;
  dueDate: string;
  items: string;
}

export interface SaleStatement {
  id: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  items: string;
  total: number;
  date: string;
  type: 'cash' | 'debt';
}

interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
}

type ProductFormMode = 'add' | 'edit';
type PaymentType = 'cash' | 'debt';

const initialProducts: Product[] = [
  { id: '1', name: 'Bread', price: 15, quantity: 45, barcode: '123456', reorderAt: 10 },
  { id: '2', name: 'Milk', price: 22, quantity: 12, barcode: '123457', reorderAt: 10 },
  { id: '3', name: 'Eggs', price: 35, quantity: 8, barcode: '123458', reorderAt: 10 },
  { id: '4', name: 'Sugar', price: 18, quantity: 20, barcode: '123459', reorderAt: 10 },
  { id: '5', name: 'Flour', price: 25, quantity: 15, barcode: '123460', reorderAt: 10 },
  { id: '6', name: 'Oil', price: 45, quantity: 5, barcode: '123461', reorderAt: 10 },
];

type ShopCustomer = {
  customerEmail: string;
  customerName: string;
  customerPhone?: string;
};

export default function ProductsGridScreen({
  onDebtCreated,
  onSaleCreated,
  shopCustomers = [],
}: {
  onDebtCreated?: (debt: CustomerDebtRecord) => Promise<boolean> | boolean;
  onSaleCreated?: (sale: SaleStatement) => Promise<boolean> | boolean;
  shopCustomers?: ShopCustomer[];
}) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [showProductForm, setShowProductForm] = useState(false);
  const [formMode, setFormMode] = useState<ProductFormMode>('add');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productName, setProductName] = useState('');
  const [productPrice, setProductPrice] = useState('');
  const [productQuantity, setProductQuantity] = useState('');
  const [productBarcode, setProductBarcode] = useState('');
  const [productReorderAt, setProductReorderAt] = useState('10');
  const [showSellForm, setShowSellForm] = useState(false);
  const [sellQuantity, setSellQuantity] = useState('1');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState('Walk-in Customer');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [paymentType, setPaymentType] = useState<PaymentType>('cash');
  const [showTopUpList, setShowTopUpList] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);

  const knownCustomers = shopCustomers.filter((customer) =>
    `${customer.customerName} ${customer.customerEmail} ${customer.customerPhone ?? ''}`
      .toLowerCase()
      .includes(customerSearch.toLowerCase())
  );

  const totalStockValue = useMemo(
    () => products.reduce((sum, product) => sum + product.price * product.quantity, 0),
    [products]
  );

  const topUpProducts = products.filter((product) => product.quantity <= product.reorderAt);
  const lowStockCount = topUpProducts.length;
  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const cartItemsText = cart.map((item) => `${item.name} x ${item.quantity}`).join(', ');

  const openAddForm = () => {
    setFormMode('add');
    setSelectedProduct(null);
    setProductName('');
    setProductPrice('');
    setProductQuantity('');
    setProductBarcode('');
    setProductReorderAt('10');
    setShowProductForm(true);
  };

  const openEditForm = (product: Product) => {
    setFormMode('edit');
    setSelectedProduct(product);
    setProductName(product.name);
    setProductPrice(String(product.price));
    setProductQuantity(String(product.quantity));
    setProductBarcode(product.barcode);
    setProductReorderAt(String(product.reorderAt));
    setShowProductForm(true);
  };

  const saveProduct = () => {
    const price = Number(productPrice);
    const quantity = Number(productQuantity);
    const reorderAt = Number(productReorderAt);

    if (!productName.trim() || !Number.isFinite(price) || price <= 0 || !Number.isInteger(quantity) || quantity < 0 || !Number.isInteger(reorderAt) || reorderAt < 0) {
      Alert.alert('Fix product', 'Enter a name, valid price, stock quantity, and reorder level.');
      return;
    }

    if (formMode === 'edit' && selectedProduct) {
      setProducts((current) =>
        current.map((product) =>
          product.id === selectedProduct.id
            ? { ...product, name: productName.trim(), price, quantity, barcode: productBarcode.trim(), reorderAt }
            : product
        )
      );
    } else {
      setProducts((current) => [
        ...current,
        {
          id: String(Date.now()),
          name: productName.trim(),
          price,
          quantity,
          barcode: productBarcode.trim() || `BAR${Date.now()}`,
          reorderAt,
        },
      ]);
    }

    setShowProductForm(false);
  };

  const deleteProduct = (product: Product) => {
    Alert.alert('Delete product', `Delete ${product.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => setProducts((current) => current.filter((item) => item.id !== product.id)),
      },
    ]);
  };

  const openSellForm = (product: Product) => {
    setSelectedProduct(product);
    setSellQuantity('1');
    setShowSellForm(true);
  };

  const sellQuantityNumber = Number(sellQuantity);
  const sellTotal = selectedProduct && Number.isFinite(sellQuantityNumber)
    ? selectedProduct.price * sellQuantityNumber
    : 0;

  const addToCart = () => {
    if (!selectedProduct || !Number.isInteger(sellQuantityNumber) || sellQuantityNumber <= 0) {
      Alert.alert('Fix quantity', 'Enter a whole number quantity.');
      return;
    }

    const alreadyInCart = cart.find((item) => item.productId === selectedProduct.id)?.quantity ?? 0;
    if (sellQuantityNumber + alreadyInCart > selectedProduct.quantity) {
      Alert.alert('Not enough stock', `Only ${selectedProduct.quantity} available.`);
      return;
    }

    setCart((current) => {
      const existing = current.find((item) => item.productId === selectedProduct.id);
      if (existing) {
        return current.map((item) =>
          item.productId === selectedProduct.id
            ? { ...item, quantity: item.quantity + sellQuantityNumber }
            : item
        );
      }

      return [
        ...current,
        {
          productId: selectedProduct.id,
          name: selectedProduct.name,
          price: selectedProduct.price,
          quantity: sellQuantityNumber,
        },
      ];
    });

    setShowSellForm(false);
  };

  const selectCustomer = (customer: ShopCustomer) => {
    setCustomerName(customer.customerName);
    setCustomerPhone(customer.customerPhone ?? '');
    setCustomerEmail(customer.customerEmail);
  };

  const confirmCheckout = async () => {
    if (cart.length === 0) {
      Alert.alert('Cart empty', 'Add products to cart first.');
      return;
    }

    const selectedCustomer = shopCustomers.find(
      (customer) => customer.customerEmail.toLowerCase() === customerEmail.toLowerCase().trim()
    );

    if (!selectedCustomer) {
      Alert.alert('Select real customer', 'Choose a customer from the search results. If none show, create an invite code and ask the customer to sign up with it first.');
      return;
    }

    if (paymentType === 'debt' && !selectedCustomer.customerPhone?.trim()) {
      Alert.alert('Phone needed', 'This joined customer needs a WhatsApp/phone number before debt can be allocated.');
      return;
    }

    const sale: SaleStatement = {
      id: String(Date.now()),
      customerName: selectedCustomer.customerName,
      customerPhone: selectedCustomer.customerPhone ?? '',
      customerEmail: selectedCustomer.customerEmail.toLowerCase().trim(),
      items: cartItemsText,
      total: cartTotal,
      date: new Date().toISOString().slice(0, 10),
      type: paymentType,
    };

    const purchaseSaved = await onSaleCreated?.(sale);
    if (!purchaseSaved) {
      Alert.alert('Purchase not saved', 'The sale was not completed because it could not sync to the customer dashboard. Make sure this customer signed up with your invite code.');
      return;
    }

    if (paymentType === 'debt') {
      const debtSaved = await onDebtCreated?.({
        id: sale.id,
        name: sale.customerName,
        phone: sale.customerPhone,
        email: selectedCustomer.customerEmail.toLowerCase().trim(),
        amount: sale.total,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        items: sale.items,
      });

      if (!debtSaved) {
        Alert.alert('Debt not saved', 'The sale was not completed because the debt could not sync to the customer account.');
        return;
      }
    }

    setProducts((current) =>
      current.map((product) => {
        const cartItem = cart.find((item) => item.productId === product.id);
        return cartItem ? { ...product, quantity: product.quantity - cartItem.quantity } : product;
      })
    );

    setCart([]);
    setCustomerSearch('');
    setCustomerName('Walk-in Customer');
    setCustomerPhone('');
    setCustomerEmail('');
    setShowCheckout(false);
    Alert.alert('Saved to customer dashboard', `${sale.customerName}\n${sale.items}\nTotal: R${sale.total.toFixed(2)} (${sale.type.toUpperCase()})`);
  };

  const renderProductCard = ({ item }: { item: Product }) => (
    <Card style={styles.productCard}>
      <View style={styles.productContent}>
        <Text numberOfLines={1} style={styles.productName}>{item.name}</Text>
        <Text style={styles.productPrice}>R{item.price.toFixed(2)}</Text>
        <Text style={[styles.productQuantity, item.quantity <= item.reorderAt ? { color: colors.danger } : {}]}>
          Stock: {item.quantity} · Red at {item.reorderAt}
        </Text>
        <Button mode="contained" onPress={() => openSellForm(item)} style={styles.cardButton} labelStyle={styles.actionLabel}>
          Add to Cart
        </Button>
        <View style={styles.actionRow}>
          <Button mode="outlined" onPress={() => openEditForm(item)} style={styles.smallActionButton} labelStyle={styles.actionLabel}>
            Edit
          </Button>
          <Button mode="outlined" onPress={() => deleteProduct(item)} style={styles.smallActionButton} labelStyle={styles.deleteLabel}>
            Delete
          </Button>
        </View>
      </View>
    </Card>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Products ({products.length})</Text>
        <Text style={styles.summary}>Value R{totalStockValue.toFixed(2)} · Low stock {lowStockCount} · Cart R{cartTotal.toFixed(2)}</Text>
        <View style={styles.headerButtons}>
          <Button mode="outlined" onPress={() => setShowTopUpList(true)} style={styles.headerButton} labelStyle={styles.addLabel}>
            Order
          </Button>
          <Button mode="outlined" onPress={() => setShowCheckout(true)} style={styles.headerButton} labelStyle={styles.addLabel}>
            Cart ({cart.length})
          </Button>
          <Button mode="contained" onPress={openAddForm} style={styles.headerButton} labelStyle={styles.addLabel}>
            Add
          </Button>
        </View>
      </View>

      <FlatList
        data={products}
        renderItem={renderProductCard}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      <Portal>
        <Modal visible={showProductForm} onDismiss={() => setShowProductForm(false)} contentContainerStyle={styles.modal}>
          <Card>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>{formMode === 'add' ? 'Add Product' : 'Edit Product'}</Text>
              <TextInput label="Product Name" value={productName} onChangeText={setProductName} style={styles.input} />
              <TextInput label="Price (R)" value={productPrice} onChangeText={setProductPrice} keyboardType="decimal-pad" style={styles.input} />
              <TextInput label="Stock Quantity" value={productQuantity} onChangeText={setProductQuantity} keyboardType="number-pad" style={styles.input} />
              <TextInput label="Barcode" value={productBarcode} onChangeText={setProductBarcode} style={styles.input} />
              <TextInput label="Show red / reorder when stock reaches" value={productReorderAt} onChangeText={setProductReorderAt} keyboardType="number-pad" style={styles.input} />
              <View style={styles.modalButtons}>
                <Button onPress={() => setShowProductForm(false)}>Cancel</Button>
                <Button mode="contained" onPress={saveProduct}>Save</Button>
              </View>
            </View>
          </Card>
        </Modal>

        <Modal visible={showSellForm} onDismiss={() => setShowSellForm(false)} contentContainerStyle={styles.modal}>
          <Card>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Sell {selectedProduct?.name}</Text>
              <Text style={styles.summary}>Price: R{selectedProduct?.price.toFixed(2)} · Available: {selectedProduct?.quantity}</Text>
              <TextInput label="Quantity" value={sellQuantity} onChangeText={setSellQuantity} keyboardType="number-pad" style={styles.input} />
              <Text style={styles.saleTotal}>Line Total: R{sellTotal.toFixed(2)}</Text>
              <View style={styles.modalButtons}>
                <Button onPress={() => setShowSellForm(false)}>Cancel</Button>
                <Button mode="contained" onPress={addToCart}>Add to Cart</Button>
              </View>
            </View>
          </Card>
        </Modal>

        <Modal visible={showCheckout} onDismiss={() => setShowCheckout(false)} contentContainerStyle={styles.modal}>
          <Card>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Checkout / Statement</Text>
              {cart.length === 0 ? (
                <Text style={styles.summary}>Cart is empty.</Text>
              ) : (
                cart.map((item) => (
                  <Text key={item.productId} style={styles.orderItem}>
                    {item.name} x {item.quantity} = R{(item.price * item.quantity).toFixed(2)}
                  </Text>
                ))
              )}
              <Text style={styles.saleTotal}>Total: R{cartTotal.toFixed(2)}</Text>
              <Text style={styles.summary}>Search real customers who signed up with your invite code.</Text>
              <TextInput label="Search customer name, email, or phone" value={customerSearch} onChangeText={setCustomerSearch} style={styles.input} />
              <View style={styles.customerList}>
                {shopCustomers.length === 0 ? (
                  <Text style={styles.emptyText}>No real customers yet. Go to Invite, create a code, and ask the customer to sign up with that code.</Text>
                ) : knownCustomers.length === 0 ? (
                  <Text style={styles.emptyText}>No matching customers. Try another name or check that the customer used your invite code.</Text>
                ) : knownCustomers.map((customer) => (
                  <Button
                    key={customer.customerEmail}
                    mode={customerEmail === customer.customerEmail ? 'contained' : 'outlined'}
                    onPress={() => selectCustomer(customer)}
                    style={styles.customerResultButton}
                    labelStyle={styles.customerResultLabel}
                  >
                    {customer.customerName} · {customer.customerPhone || customer.customerEmail}
                  </Button>
                ))}
              </View>
              {customerEmail ? (
                <Card style={styles.selectedCustomerCard}>
                  <Text style={styles.orderItem}>Selected: {customerName}</Text>
                  <Text style={styles.summary}>{customerEmail}</Text>
                  {customerPhone ? <Text style={styles.summary}>{customerPhone}</Text> : null}
                </Card>
              ) : null}
              <View style={styles.paymentRow}>
                <Button mode={paymentType === 'cash' ? 'contained' : 'outlined'} compact onPress={() => setPaymentType('cash')} style={styles.paymentButton}>Cash Paid</Button>
                <Button mode={paymentType === 'debt' ? 'contained' : 'outlined'} compact onPress={() => setPaymentType('debt')} style={styles.paymentButton}>Debt</Button>
              </View>
              <View style={styles.modalButtons}>
                <Button onPress={() => setShowCheckout(false)}>Cancel</Button>
                <Button mode="contained" onPress={confirmCheckout}>Confirm Payment</Button>
              </View>
            </View>
          </Card>
        </Modal>

        <Modal visible={showTopUpList} onDismiss={() => setShowTopUpList(false)} contentContainerStyle={styles.modal}>
          <Card>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Order / Top-Up List</Text>
              {topUpProducts.length === 0 ? (
                <Text style={styles.summary}>No products need top-up right now.</Text>
              ) : (
                topUpProducts.map((product) => (
                  <Text key={product.id} style={styles.orderItem}>
                    {product.name}: stock {product.quantity}, reorder at {product.reorderAt}, suggested buy {Math.max(product.reorderAt * 2 - product.quantity, 1)}
                  </Text>
                ))
              )}
              <View style={styles.modalButtons}>
                <Button mode="contained" onPress={() => setShowTopUpList(false)}>Done</Button>
              </View>
            </View>
          </Card>
        </Modal>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { marginBottom: spacing.md },
  headerButtons: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  headerButton: { flex: 1, minHeight: 44 },
  title: { fontSize: 22, fontWeight: '800', color: colors.text },
  summary: { fontSize: 13, color: colors.muted, marginTop: spacing.xs },
  listContent: { paddingBottom: spacing.xl },
  row: { gap: spacing.sm, marginBottom: spacing.sm },
  productCard: { flex: 1, backgroundColor: colors.card, borderRadius: 12, minHeight: 178 },
  productContent: { padding: spacing.sm, flex: 1 },
  productName: { fontSize: 15, fontWeight: '800', color: colors.text, marginBottom: spacing.xs },
  productPrice: { fontSize: 18, fontWeight: '800', color: colors.primary, marginBottom: spacing.xs },
  productQuantity: { fontSize: 12, color: colors.muted, marginBottom: spacing.sm },
  actionRow: { flexDirection: 'row', gap: spacing.xs, marginTop: spacing.xs },
  cardButton: { minHeight: 42 },
  smallActionButton: { flex: 1, minHeight: 40, paddingHorizontal: spacing.xs },
  actionLabel: { fontSize: 11, fontWeight: '800', marginHorizontal: 0 },
  deleteLabel: { fontSize: 11, fontWeight: '800', marginHorizontal: 0, color: colors.danger },
  addLabel: { fontSize: 12, fontWeight: '800', marginHorizontal: 0 },
  modal: { backgroundColor: colors.background, margin: spacing.lg, borderRadius: 12 },
  modalContent: { padding: spacing.lg },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: colors.text, marginBottom: spacing.md },
  input: { marginBottom: spacing.md },
  saleTotal: { fontSize: 22, color: colors.primary, fontWeight: '800', marginBottom: spacing.md },
  paymentRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  paymentButton: { flex: 1 },
  customerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginVertical: spacing.sm },
  customerButton: { minWidth: 92 },
  customerList: { gap: spacing.sm, marginBottom: spacing.md },
  customerResultButton: { alignItems: 'stretch' },
  customerResultLabel: { fontSize: 12, fontWeight: '800', marginHorizontal: spacing.xs },
  selectedCustomerCard: { padding: spacing.md, marginBottom: spacing.md, backgroundColor: colors.card },
  emptyText: { color: colors.muted, fontSize: 13, lineHeight: 18, marginBottom: spacing.sm },
  orderItem: { color: colors.text, fontSize: 13, fontWeight: '700', marginBottom: spacing.sm },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.md, marginTop: spacing.md },
});
