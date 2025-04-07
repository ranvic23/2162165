"use client";

import { useRouter } from "next/navigation";
import { db } from "../../firebase-config";
import ProtectedRoute from "@/app/components/protectedroute";
import { useEffect, useState } from "react";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  getDoc,
  doc,
  updateDoc,
  DocumentReference,
  addDoc,
  serverTimestamp,
  getDocs,
  where,
  runTransaction,
  Timestamp
} from "firebase/firestore";

interface Order {
  id: string;
  userId: string;
  userDetails?: {
    firstName: string;
    lastName: string;
  };
  orderDetails: {
    pickupTime: string;
    pickupDate: string;
    status: string;
    totalAmount: number;
    paymentMethod: string;
    paymentStatus?: string;
    gcashReference?: string;
    createdAt: string;
    updatedAt?: string;
  };
  items: Array<{
    cartId: string;
    productSize: string;
    productVarieties: string[];
    productQuantity: number;
    productPrice: number;
  }>;
  ref?: DocumentReference;
}

interface TrackingOrder {
  orderId: string;
  userId: string;
  customerName: string;
  paymentMethod: string;
  paymentStatus: string;
  orderStatus: string;
  createdAt: Date;
  updatedAt: Date;
  pickupTime: string;
  pickupDate: string;
  totalAmount: number;
  items: Array<{
    cartId: string;
    productSize: string;
    productVarieties: string[];
    productQuantity: number;
    productPrice: number;
  }>;
}

export default function TrackingOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const router = useRouter();

  // Function to fetch user details
  const fetchUserDetails = async (userId: string) => {
    try {
      const userRef = doc(db, "customers", userId);
      const userDoc = await getDoc(userRef);
      if (userDoc.exists()) {
        const data = userDoc.data();
        if (data.name) {
          const nameParts = data.name.split(" ");
          const firstName = nameParts[0];
          const lastName = nameParts.slice(1).join(" ") || "N/A";
          return {
            firstName,
            lastName,
          };
        } else {
          return {
            firstName: data.firstName || "N/A",
            lastName: data.lastName || "N/A",
          };
        }
      }
      return null;
    } catch (error) {
      console.error("Error fetching user details:", error);
      return null;
    }
  };

  // Function to save tracking order to Firestore
  const saveTrackingOrder = async (order: Order) => {
    try {
      const trackingOrder: TrackingOrder = {
        orderId: order.id,
        userId: order.userId,
        customerName: order.userDetails ? `${order.userDetails.firstName} ${order.userDetails.lastName}` : 'Unknown',
        paymentMethod: order.orderDetails.paymentMethod,
        paymentStatus: order.orderDetails.paymentStatus || 'unknown',
        orderStatus: order.orderDetails.status || 'unknown',
        createdAt: new Date(order.orderDetails.createdAt),
        updatedAt: new Date(),
        pickupTime: order.orderDetails.pickupTime,
        pickupDate: order.orderDetails.pickupDate,
        totalAmount: order.orderDetails.totalAmount,
        items: order.items
      };

      console.log("Tracking Order Data:", trackingOrder);

      // Check if tracking order already exists
      const trackingRef = collection(db, "tracking_orders");
      const trackingQuery = query(trackingRef, where("orderId", "==", order.id));
      const trackingSnapshot = await getDocs(trackingQuery);

      if (trackingSnapshot.empty) {
        // If tracking order doesn't exist, create new one
        await addDoc(trackingRef, {
          ...trackingOrder,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      } else {
        // If tracking order exists, update it
        const trackingDoc = trackingSnapshot.docs[0];
        await updateDoc(trackingDoc.ref, {
          ...trackingOrder,
          updatedAt: serverTimestamp()
        });
      }
    } catch (error) {
      console.error("Error saving tracking order:", error);
    }
  };

  // Real-time orders subscription
  useEffect(() => {
    const ordersRef = collection(db, "orders");
    const q = query(ordersRef, orderBy("orderDetails.createdAt", "desc"));

    const unsubscribe = onSnapshot(
      q,
      async (snapshot) => {
        const orderList = await Promise.all(
          snapshot.docs.map(async (doc) => {
            const data = doc.data();
            const userDetails = await fetchUserDetails(data.userId);
            return {
              id: doc.id,
              ref: doc.ref,
              ...data,
              userDetails,
            } as Order;
          })
        );
        // Filter orders to exclude pending payments
        const filteredOrders = orderList.filter(order => {
          // For GCash payments, only show if payment is approved
          if (order.orderDetails.paymentMethod === 'GCash') {
            return order.orderDetails.paymentStatus === 'approved';
          }
          // For non-GCash payments, show all orders except pending ones
          return order.orderDetails.paymentStatus !== 'pending';
        });

        // Save filtered orders to tracking_orders collection
        await Promise.all(filteredOrders.map(order => saveTrackingOrder(order)));

        setOrders(filteredOrders);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching orders:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const handleStatusUpdate = async (orderId: string, newStatus: string) => {
    try {
      const order = orders.find((o) => o.id === orderId);
      if (!order?.ref) {
        console.error("No document reference found for order:", orderId);
        return;
      }

      // Start a transaction for any status update
      await runTransaction(db, async (transaction) => {
        // Get the order document reference
        const orderRef = doc(db, "orders", orderId);
        const orderDoc = await transaction.get(orderRef);
        
        if (!orderDoc.exists()) {
          throw new Error("Order not found");
        }

        // If the new status is "Ready for Pickup", reduce stock
        if (newStatus === "Ready for Pickup") {
          // For each item in the order
          for (const item of order.items) {
            // Find the matching stock by size and varieties
            const stocksRef = collection(db, "stocks");
            const stockQuery = query(
              stocksRef,
              where("sizeName", "==", item.productSize),
              where("varieties", "array-contains-any", item.productVarieties)
            );
            
            const stockSnapshot = await getDocs(stockQuery);
            
            if (stockSnapshot.empty) {
              throw new Error(`No stock found for ${item.productSize} with varieties ${item.productVarieties.join(", ")}`);
            }

            // Get the first matching stock
            const stockDoc = stockSnapshot.docs[0];
            const stockData = stockDoc.data();

            // Check if there's enough stock
            if (stockData.quantity < item.productQuantity) {
              throw new Error(`Insufficient stock for ${item.productSize} with varieties ${item.productVarieties.join(", ")}`);
            }

            // Update the stock quantity
            const newQuantity = stockData.quantity - item.productQuantity;
            
            // Update stock document
            transaction.update(stockDoc.ref, {
              quantity: newQuantity,
              lastUpdated: new Date()
            });

            // Add stock history entry
            const historyRef = doc(collection(db, "stockHistory"));
            transaction.set(historyRef, {
              varieties: item.productVarieties,
              sizeName: item.productSize,
              type: 'out',
              quantity: item.productQuantity,
              previousStock: stockData.quantity,
              currentStock: newQuantity,
              date: new Date(),
              updatedBy: "System",
              remarks: `Order ${orderId} ready for pickup`,
              stockId: stockDoc.id,
              isDeleted: false
            });
          }
        }
        
        // If the new status is "Completed", update sales data
        if (newStatus === "Completed") {
          // Add to sales collection
          const salesRef = doc(collection(db, "sales"));
          transaction.set(salesRef, {
            orderId: orderId,
            amount: order.orderDetails.totalAmount,
            date: Timestamp.fromDate(new Date()),
            items: order.items.map(item => ({
              size: item.productSize,
              varieties: item.productVarieties,
              quantity: item.productQuantity,
              price: item.productPrice,
              subtotal: item.productQuantity * item.productPrice
            })),
            paymentMethod: order.orderDetails.paymentMethod,
            customerName: order.userDetails ? `${order.userDetails.firstName} ${order.userDetails.lastName}` : 'Unknown'
          });

          // Update inventory valuation
          // This will be reflected in the inventory reports automatically
          // through the existing queries
        }

        // Update order status
        transaction.update(orderRef, {
          "orderDetails.status": newStatus,
          "orderDetails.updatedAt": new Date().toISOString(),
          ...(newStatus === "Completed" ? {
            "orderDetails.completedAt": new Date().toISOString()
          } : {})
        });
      });

      alert(`Order ${newStatus === "Completed" ? "completed and sales updated" : "status updated"} successfully!`);
    } catch (error) {
      console.error("Error updating order status:", error);
      alert(error instanceof Error ? error.message : "Failed to update order status.");
    }
  };

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order.userDetails &&
        `${order.userDetails.firstName} ${order.userDetails.lastName}`
          .toLowerCase()
          .includes(searchTerm.toLowerCase()));
    return matchesSearch;
  });

  const getStatusColor = (status: string | undefined) => {
    if (!status) return "bg-gray-100 text-gray-800";
    switch (status.toLowerCase()) {
      case "order placed":
        return "bg-blue-100 text-blue-800";
      case "order confirmed":
        return "bg-purple-100 text-purple-800";
      case "preparing order":
        return "bg-yellow-100 text-yellow-800";
      case "ready for pickup":
        return "bg-green-100 text-green-800";
      case "completed":
        return "bg-green-100 text-green-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getPaymentMethodBadge = (paymentMethod: string, paymentStatus?: string) => {
    if (paymentMethod === 'GCash') {
      return paymentStatus === 'approved' 
        ? 'bg-green-100 text-green-800' 
        : 'bg-yellow-100 text-yellow-800';
    }
    return 'bg-blue-100 text-blue-800';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <ProtectedRoute>
      <div className="flex flex-col min-h-screen bg-gray-100 p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-4 md:mb-0">
            Order Tracking
          </h1>
          <div className="w-full md:w-auto">
            <input
              type="text"
              placeholder="Search by Order ID or Customer Name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full border p-2 rounded shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Orders Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Order ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Payment Method
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Order Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="text-center py-4">
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                      </div>
                    </td>
                  </tr>
                ) : filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-4">
                      No orders found.
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          #{order.id.slice(0, 6)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {formatDate(order.orderDetails.createdAt)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {order.userDetails
                            ? `${order.userDetails.firstName} ${order.userDetails.lastName}`
                            : "Loading..."}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPaymentMethodBadge(order.orderDetails.paymentMethod, order.orderDetails.paymentStatus)}`}>
                          {order.orderDetails.paymentMethod}
                          {order.orderDetails.paymentMethod === 'GCash' && order.orderDetails.paymentStatus === 'approved' && ' (Approved)'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <select
                          value={order.orderDetails.status}
                          onChange={(e) => handleStatusUpdate(order.id, e.target.value)}
                          className={`px-2 py-1 rounded text-sm ${getStatusColor(order.orderDetails.status)} focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                        >
                          <option value="Order Confirmed">Order Confirmed</option>
                          <option value="Preparing Order">Preparing Order</option>
                          <option value="Ready for Pickup">Ready for Pickup</option>
                          <option value="Completed">Completed</option>
                          <option value="Cancelled">Cancelled</option>
                        </select>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => router.push(`/orders/${order.id}`)}
                          className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
} 