"use client";

import { useState, useEffect } from "react";
import { addDoc, collection, getDocs, updateDoc, doc, deleteDoc } from "firebase/firestore";
import { db } from "../../firebase-config";
import ProtectedRoute from "@/app/components/protectedroute";

export default function DamagedGoods() {
    const [damagedGoods, setDamagedGoods] = useState<Array<{
        id: string;
        productName: string;
        quantity: number;
        reason: string;
        dateReported: string;
    }>>([]);

    const [damagedGood, setDamagedGood] = useState({
        productName: "",
        quantity: 0,
        reason: "",
        dateReported: ""
    });

    const [editDamagedGood, setEditDamagedGood] = useState<string | null>(null);

    useEffect(() => {
        fetchDamagedGoods();
    }, []);

    const fetchDamagedGoods = async () => {
        const querySnapshot = await getDocs(collection(db, "damaged_goods"));
        const damagedGoodsList = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        setDamagedGoods(damagedGoodsList);
    };

    const handleChange = (e: { target: { name: any; value: any; }; }) => {
        setDamagedGood({ ...damagedGood, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: { preventDefault: () => void; }) => {
        e.preventDefault();
        try {
            if (editDamagedGood) {
                await updateDoc(doc(db, "damaged_goods", editDamagedGood), {
                    ...damagedGood,
                    updatedAt: new Date()
                });
                alert("Damaged good updated successfully!");
            } else {
                await addDoc(collection(db, "damaged_goods"), {
                    ...damagedGood,
                    createdAt: new Date(),
                    updatedAt: new Date()
                });
                alert("Damaged good added successfully!");
            }
            setDamagedGood({ productName: "", quantity: 0, reason: "", dateReported: "" });
            setEditDamagedGood(null);
            fetchDamagedGoods();
        } catch (error) {
            console.error("Error handling damaged good: ", error);
            alert("Failed to process damaged good. Please try again later.");
        }
    };

    const handleEdit = (item: { id: any; productName: any; quantity: any; reason: any; dateReported: any; }) => {
        setEditDamagedGood(item.id);
        setDamagedGood({
            productName: item.productName,
            quantity: item.quantity,
            reason: item.reason,
            dateReported: item.dateReported
        });
    };

    const handleDelete = async (id: string) => {
        if (confirm("Are you sure you want to delete this damaged good?")) {
            try {
                await deleteDoc(doc(db, "damaged_goods", id));
                alert("Damaged good deleted successfully!");
                fetchDamagedGoods();
            } catch (error) {
                console.error("Error deleting damaged good: ", error);
                alert("Failed to delete damaged good.");
            }
        }
    };

    return (
        <ProtectedRoute>
            <div className="flex flex-col items-center h-screen bg-gray-100 overflow-y-auto">
                <h1 className="text-3xl font-bold text-black mb-4">Damaged Goods Management</h1>
                <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 w-full max-w-2xl bg-white p-6 rounded-lg shadow-md">
                    <input
                        type="text"
                        name="productName"
                        value={damagedGood.productName}
                        onChange={handleChange}
                        placeholder="Product Name"
                        required
                        className="border p-2 rounded w-full"
                    />
                    <input
                        type="number"
                        name="quantity"
                        value={damagedGood.quantity}
                        onChange={handleChange}
                        placeholder="Quantity"
                        required
                        className="border p-2 rounded w-full"
                    />
                    <input
                        type="text"
                        name="reason"
                        value={damagedGood.reason}
                        onChange={handleChange}
                        placeholder="Reason"
                        className="border p-2 rounded w-full"
                    />
                    <input
                        type="date"
                        name="dateReported"
                        value={damagedGood.dateReported}
                        onChange={handleChange}
                        required
                        className="border p-2 rounded w-full"
                    />
                    <button
                        type="submit"
                        className="bg-bg-light-brown text-white p-2 rounded hover:bg-bg-dark-brown">
                        {editDamagedGood ? "Update Damaged Good" : "Add Damaged Good"}
                    </button>
                </form>

                <div className="mt-8 w-full max-w-4xl">
                    <h2 className="text-2xl font-bold text-black mb-4">Damaged Goods List</h2>
                    <div className="grid grid-cols-1 gap-4">
                        {damagedGoods.map((item) => (
                            <div key={item.id} className="border p-4 rounded bg-white shadow-md">
                                <h3 className="font-bold text-lg">{item.productName}</h3>
                                <p>Quantity: {item.quantity}</p>
                                <p>Reason: {item.reason}</p>
                                <p>Date Reported: {item.dateReported}</p>
                                <div className="flex gap-2 mt-4">
                                    <button
                                        className="bg-yellow-500 text-white px-2 py-1 rounded hover:bg-yellow-600"
                                        onClick={() => handleEdit(item)}>
                                        Edit
                                    </button>
                                    <button
                                        className="bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600"
                                        onClick={() => handleDelete(item.id)}>
                                        Delete
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </ProtectedRoute>
    );
}