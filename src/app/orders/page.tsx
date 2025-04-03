"use client";

import { useRouter } from "next/navigation";
import { db } from "../firebase-config";
import ProtectedRoute from "@/app/components/protectedroute";
import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  query,
  orderBy,
  updateDoc,
  doc,
  onSnapshot,
  getDoc,
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
  };
  items: Array<{
    cartId: string;
    productSize: string;
    productVarieties: string[];
    productQuantity: number;
    productPrice: number;
  }>;
  ref?: any;
}

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPayment, setFilterPayment] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const router = useRouter();

  // Function to fetch user details
  const fetchUserDetails = async (userId: string) => {
    try {
      const userRef = doc(db, "customers", userId);
      const userDoc = await getDoc(userRef);
      if (userDoc.exists()) {
        const data = userDoc.data();
        // Check if user has name field (Google sign-in) or firstName/lastName (regular sign-up)
        if (data.name) {
          // For Google sign-in users, split the name into first and last name
          const nameParts = data.name.split(" ");
          const firstName = nameParts[0];
          const lastName = nameParts.slice(1).join(" ") || "N/A";
          return {
            firstName,
            lastName,
          };
        } else {
          // For regular sign-up users
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
        setOrders(orderList);
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

      await updateDoc(order.ref, {
        "orderDetails.status": newStatus,
        "orderDetails.updatedAt": new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error updating order status:", error);
      alert("Failed to update order status.");
    }
  };

  const filteredOrders = orders.filter((order) => {
    const matchesStatus =
      filterStatus === "all" || order.orderDetails.status === filterStatus;
    const matchesPayment =
      filterPayment === "all" ||
      order.orderDetails.paymentStatus === filterPayment;
    const matchesSearch =
      order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.userId.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesPayment && matchesSearch;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatTime = (timeString: string) => {
    try {
      if (/^([0-1]?[0-9]|2[0-3]):[0-5][0-9] (AM|PM)$/.test(timeString)) {
        return timeString;
      }
      if (timeString.includes("T")) {
        const date = new Date(timeString);
        return date.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        });
      }
      return timeString;
    } catch (error) {
      console.error("Error formatting time:", error);
      return timeString;
    }
  };

  return (
    <ProtectedRoute>
      <div className="flex flex-col min-h-screen bg-gray-100 p-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">
          Orders Management
        </h1>

        {/* Filters and Search */}
        <div className="bg-white p-4 rounded-lg shadow-md mb-6 flex flex-wrap gap-4 items-center">
          <input
            type="text"
            placeholder="Search by Order ID or User ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="border p-2 rounded flex-1"
          />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="border p-2 rounded"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="ready">Ready</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <select
            value={filterPayment}
            onChange={(e) => setFilterPayment(e.target.value)}
            className="border p-2 rounded"
          >
            <option value="all">All Payments</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
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
                    Pickup Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Payment
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
                      Loading orders...
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
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {order.userDetails
                            ? `${order.userDetails.firstName} ${order.userDetails.lastName}`
                            : "Loading..."}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          Date: {formatDate(order.orderDetails.pickupDate)}
                        </div>
                        <div className="text-sm text-gray-500">
                          Time: {formatTime(order.orderDetails.pickupTime)}
                        </div>
                        <div className="text-sm text-gray-500">
                          Amount: ₱
                          {order.orderDetails.totalAmount.toLocaleString()}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {order.orderDetails.paymentMethod.toUpperCase()}
                        </div>
                        {order.orderDetails.paymentMethod.toLowerCase() ===
                          "gcash" && (
                          <>
                            <div className="text-sm text-gray-500">
                              Ref: {order.orderDetails.gcashReference || "N/A"}
                            </div>
                            <span
                              className={`px-2 py-1 text-xs rounded-full ${
                                order.orderDetails.paymentStatus === "approved"
                                  ? "bg-green-100 text-green-800"
                                  : order.orderDetails.paymentStatus ===
                                    "rejected"
                                  ? "bg-red-100 text-red-800"
                                  : "bg-yellow-100 text-yellow-800"
                              }`}
                            >
                              {order.orderDetails.paymentStatus || "pending"}
                            </span>
                          </>
                        )}
                      </td>
                      <td className="px-6 py-4 space-x-2">
                        <button
                          onClick={() => {
                            setSelectedOrder(order);
                            setShowDetails(true);
                          }}
                          className="text-blue-600 hover:text-blue-900 text-sm"
                        >
                          View Details
                        </button>
                        {order.orderDetails.paymentMethod.toLowerCase() === "gcash" && 
                         order.orderDetails.paymentStatus === "pending" && (
                          <button
                            onClick={() => router.push(`/orders/pending-verification?orderId=${order.id}`)}
                            className="text-green-600 hover:text-green-900 text-sm"
                          >
                            Verify Payment
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Order Details Modal */}
        {showDetails && selectedOrder && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold">Order Details</h2>
                  <button
                    onClick={() => setShowDetails(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    ×
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="border-b pb-4">
                    <h3 className="font-medium mb-2">Order Information</h3>
                    <p>Order ID: #{selectedOrder.id.slice(0, 6)}</p>
                    <p>
                      Customer Name:{" "}
                      {selectedOrder.userDetails
                        ? `${selectedOrder.userDetails.firstName} ${selectedOrder.userDetails.lastName}`
                        : "Loading..."}
                    </p>
                    <p>
                      Total Amount: ₱
                      {selectedOrder.orderDetails.totalAmount.toLocaleString()}
                    </p>
                    <p>
                      Created At:{" "}
                      {formatDate(selectedOrder.orderDetails.createdAt)}
                    </p>
                  </div>

                  <div className="border-b pb-4">
                    <h3 className="font-medium mb-2">Pickup Information</h3>
                    <p>
                      Date: {formatDate(selectedOrder.orderDetails.pickupDate)}
                    </p>
                    <p>
                      Time: {formatTime(selectedOrder.orderDetails.pickupTime)}
                    </p>
                  </div>

                  <div className="border-b pb-4">
                    <h3 className="font-medium mb-2">Payment Information</h3>
                    <p>
                      Method:{" "}
                      {selectedOrder.orderDetails.paymentMethod.toUpperCase()}
                    </p>
                    <p>
                      Status:{" "}
                      {selectedOrder.orderDetails.paymentStatus || "pending"}
                    </p>
                    {selectedOrder.orderDetails.paymentMethod.toLowerCase() ===
                      "gcash" && (
                      <p>
                        GCash Reference:{" "}
                        {selectedOrder.orderDetails.gcashReference || "N/A"}
                      </p>
                    )}
                  </div>

                  <div className="border-b pb-4">
                    <h3 className="font-medium mb-2">Order Items</h3>
                    {selectedOrder.items.map((item, index) => (
                      <div key={index} className="mb-2">
                        <p>Size: {item.productSize}</p>
                        <p>Varieties: {item.productVarieties.join(", ")}</p>
                        <p>Quantity: {item.productQuantity}</p>
                        <p>Price: ₱{item.productPrice.toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
