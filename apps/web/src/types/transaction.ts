export interface TransactionItemSnapshot {
  id: string;
  productId: string;
  sku: string;
  name: string;
  price: number;
  quantity: number;
  subtotal: number;
}

export interface Transaction {
  id: string;
  orderNumber: string;
  merchantId: string;
  merchantName?: string;
  cashierId: string;
  cashierName: string;
  totalQuantity: number;
  totalAmount: number;
  cashPaid: number;
  cashChange: number;
  paymentMethod: "CASH";
  createdAt: string;
  items: TransactionItemSnapshot[];
}
