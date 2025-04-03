"use client";

import { useState, useEffect } from "react";
import {
  collection,
  getDocs,
  query,
  orderBy,
  updateDoc,
  doc,
  getDoc,
  where,
  onSnapshot,
} from "firebase/firestore";
import { db } from "../../firebase-config";
import { useAuth } from "../../context/AuthContext";

interface CartItem {
  productSize: string;
  productVarieties: string[];
  productQuantity: number;
  productPrice: number;
}

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

export default function PendingVerificationPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [cartItems, setCartItems] = useState<{ [key: string]: CartItem }>({});

  // Function to fetch cart item details
  const fetchCartItemDetails = async (userId: string, cartId: string) => {
    try {
      console.log(
        "Fetching cart item details for user:",
        userId,
        "cartId:",
        cartId
      );
      const cartItemRef = doc(db, "customers", userId, "cart", cartId);
      const cartItemDoc = await getDoc(cartItemRef);
      if (cartItemDoc.exists()) {
        const data = cartItemDoc.data();
        console.log("Cart item data found:", data);
        return data as CartItem;
      }
      console.log("No cart item found for cartId:", cartId);
      return null;
    } catch (error) {
      console.error("Error fetching cart item:", error);
      return null;
    }
  };

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

  // Function to update payment status
  const updatePaymentStatus = async (orderId: string, newStatus: string) => {
    try {
      const order = orders.find((o) => o.id === orderId);
      if (!order?.ref) {
        console.error("No document reference found for order:", orderId);
        return;
      }

      await updateDoc(order.ref, {
        "orderDetails.paymentStatus": newStatus,
        "orderDetails.updatedAt": new Date().toISOString(),
      });

      setOrders((prevOrders) =>
        prevOrders.map((o) =>
          o.id === orderId
            ? {
                ...o,
                orderDetails: {
                  ...o.orderDetails,
                  paymentStatus: newStatus,
                },
              }
            : o
        )
      );
    } catch (err) {
      console.error("Error updating payment status:", err);
      setError("Failed to update payment status. Please try again.");
    }
  };

  // Fetch orders from Firestore
  useEffect(() => {
    console.log("Orders component mounted");
    if (!user?.uid) {
      console.log("No user found");
      setError("Please log in to view orders");
      setIsLoading(false);
      return;
    }

    console.log("Setting up orders listener for user:", user.uid);
    const ordersRef = collection(db, "orders");

    // Set up the listener with the correct query
    const q = query(ordersRef, orderBy("orderDetails.createdAt", "desc"));

    console.log("Setting up listener with query:", q);
    const unsubscribe = onSnapshot(
      q,
      async (querySnapshot) => {
        console.log("Orders snapshot received");
        console.log("Snapshot size:", querySnapshot.size);

        const ordersList: Order[] = [];
        const cartItemsMap: { [key: string]: CartItem } = {};

        // Process each order
        for (const doc of querySnapshot.docs) {
          const data = doc.data();
          console.log("Processing order document:", doc.id);
          console.log("Order data:", JSON.stringify(data, null, 2));

          // Only process orders that match our expected structure
          if (data.orderDetails && data.items && Array.isArray(data.items)) {
            console.log("Valid order structure found");
            console.log("Items array:", data.items);

            // Fetch cart item details for each item
            for (const item of data.items) {
              console.log("Processing cart item:", item.cartId);
              if (!cartItemsMap[item.cartId]) {
                console.log("Fetching cart item details for:", item.cartId);
                const cartItemDetails = await fetchCartItemDetails(
                  data.userId,
                  item.cartId
                );
                console.log("Cart item details:", cartItemDetails);
                if (cartItemDetails) {
                  cartItemsMap[item.cartId] = cartItemDetails;
                }
              } else {
                console.log("Cart item already in map:", item.cartId);
              }
            }

            // Fetch user details
            const userDetails = await fetchUserDetails(data.userId);
            console.log("User details:", userDetails);

            ordersList.push({
              id: doc.id,
              ref: doc.ref,
              ...data,
              userDetails,
            } as Order);
            console.log("Order added to list:", doc.id);
          } else {
            console.warn("Invalid order data structure:", data);
          }
        }

        console.log("Total orders processed:", ordersList.length);
        console.log("Final orders list:", ordersList);
        console.log("Final cart items map:", cartItemsMap);
        setOrders(ordersList);
        setCartItems(cartItemsMap);
        setError(null);
      },
      (error) => {
        console.error("Error in orders listener:", error);
        setError("Failed to load orders. Please try again later.");
      }
    );

    setIsLoading(false);

    return () => {
      console.log("Cleaning up orders listener");
      unsubscribe();
    };
  }, [user?.uid]);

  // Filter orders based on search term and payment method
  const filteredOrders = orders.filter((order) => {
    // First check if it's a GCash order
    if (order.orderDetails.paymentMethod.toLowerCase() !== "gcash") {
      return false;
    }

    // Then check the search term if provided
    if (!order.orderDetails?.pickupTime) return false;
    return order.orderDetails.pickupTime
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
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
      // If the time is already in 12-hour format (e.g., "02:00 PM"), return it directly
      if (/^([0-1]?[0-9]|2[0-3]):[0-5][0-9] (AM|PM)$/.test(timeString)) {
        return timeString;
      }

      // If the time is in 24-hour format (e.g., "14:00"), convert it to 12-hour format
      if (/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(timeString)) {
        const [hours, minutes] = timeString.split(":");
        const hour = parseInt(hours);
        const ampm = hour >= 12 ? "PM" : "AM";
        const hour12 = hour % 12 || 12;
        return `${hour12}:${minutes} ${ampm}`;
      }

      // If it's a full date string, extract the time part
      if (timeString.includes("T")) {
        const date = new Date(timeString);
        return date.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        });
      }

      // If it's just a time string without a date, add a dummy date
      const dummyDate = new Date(`2000-01-01T${timeString}`);
      return dummyDate.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    } catch (error) {
      console.error("Error formatting time:", error);
      return timeString; // Return original string if formatting fails
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Payment Verification</h1>

      {/* Search and filter */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search by pickup time"
          className="w-full md:w-1/3 p-2 border border-gray-300 rounded"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Loading state */}
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        /* Orders table */
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200">
            <thead>
              <tr className="bg-gray-100">
                <th className="py-3 px-4 text-left border-b">Order ID</th>
                <th className="py-3 px-4 text-left border-b">Customer Name</th>
                <th className="py-3 px-4 text-left border-b">Pickup Date</th>
                <th className="py-3 px-4 text-left border-b">Pickup Time</th>
                <th className="py-3 px-4 text-left border-b">Payment Method</th>
                <th className="py-3 px-4 text-left border-b">
                  GCash Reference
                </th>
                <th className="py-3 px-4 text-left border-b">Payment Status</th>
                <th className="py-3 px-4 text-left border-b">Total Amount</th>
                <th className="py-3 px-4 text-left border-b">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.length > 0 ? (
                filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="py-3 px-4 border-b">
                      #{order.id.slice(0, 6)}
                    </td>
                    <td className="py-3 px-4 border-b">
                      {order.userDetails
                        ? `${order.userDetails.firstName} ${order.userDetails.lastName}`
                        : "Loading..."}
                    </td>
                    <td className="py-3 px-4 border-b">
                      {formatDate(order.orderDetails.pickupDate)}
                    </td>
                    <td className="py-3 px-4 border-b">
                      {formatTime(order.orderDetails.pickupTime)}
                    </td>
                    <td className="py-3 px-4 border-b">
                      {order.orderDetails.paymentMethod.toUpperCase()}
                    </td>
                    <td className="py-3 px-4 border-b">
                      {order.orderDetails.gcashReference || "N/A"}
                    </td>
                    <td className="py-3 px-4 border-b">
                      <span
                        className={`px-2 py-1 rounded text-sm ${
                          order.orderDetails.paymentStatus === "approved"
                            ? "bg-green-100 text-green-800"
                            : order.orderDetails.paymentStatus === "rejected"
                            ? "bg-red-100 text-red-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {order.orderDetails.paymentStatus || "pending"}
                      </span>
                    </td>
                    <td className="py-3 px-4 border-b">
                      ₱{order.orderDetails.totalAmount.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 border-b">
                      <div className="flex space-x-2">
                        {order.orderDetails.paymentStatus !== "approved" && (
                          <button
                            onClick={() =>
                              updatePaymentStatus(order.id, "approved")
                            }
                            className="px-2 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600"
                          >
                            Approve
                          </button>
                        )}
                        {order.orderDetails.paymentStatus !== "rejected" && (
                          <button
                            onClick={() =>
                              updatePaymentStatus(order.id, "rejected")
                            }
                            className="px-2 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600"
                          >
                            Reject
                          </button>
                        )}
                        {(order.orderDetails.paymentStatus === "approved" ||
                          order.orderDetails.paymentStatus === "rejected") && (
                          <button
                            onClick={() =>
                              updatePaymentStatus(order.id, "pending")
                            }
                            className="px-2 py-1 text-sm bg-yellow-500 text-white rounded hover:bg-yellow-600"
                          >
                            Pending
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-gray-500">
                    {searchTerm
                      ? "No orders found matching your search."
                      : "No orders found."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
