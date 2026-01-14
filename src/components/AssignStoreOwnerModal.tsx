"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { apiPut } from "@/lib/api";

interface AssignStoreOwnerModalProps {
  isOpen: boolean;
  onClose: () => void;
  store: {
    id?: string;
    name?: string;
    title?: string;
    ownerId?: string;
  };
  onSuccess?: () => void;
}

export function AssignStoreOwnerModal({
  isOpen,
  onClose,
  store,
  onSuccess,
}: AssignStoreOwnerModalProps) {
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const storeName = store.title || store.name || "მაღაზია";

  const handleAssign = async () => {
    if (!userId.trim()) {
      setError("გთხოვთ შეიყვანოთ იუზერის ID");
      return;
    }

    if (!store.id) {
      setError("მაღაზიის ID არ არის ვალიდური");
      return;
    }

    setLoading(true);
    setError("");
    try {
      await apiPut("/auth/update-owned-stores", {
        userId: userId.trim(),
        storeId: store.id,
        action: "add",
      });

      alert(`✅ მაღაზია "${storeName}" წარმატებით მიენიჭა იუზერს ${userId.trim()}`);
      onSuccess?.();
      onClose();
      setUserId("");
    } catch (e: unknown) {
      const message =
        e && typeof e === "object" && "message" in e
          ? String((e as { message?: string }).message)
          : "მაღაზიის მინიჭებისას მოხდა შეცდომა";
      setError(message);
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async () => {
    if (!store.ownerId) {
      setError("ამ მაღაზიას არ აქვს პატრონი");
      return;
    }

    if (!store.id) {
      setError("მაღაზიის ID არ არის ვალიდური");
      return;
    }

    if (!confirm(`დარწმუნებული ხართ რომ გსურთ "${storeName}"-ის პატრონობის მოხსნა?`)) {
      return;
    }

    setLoading(true);
    setError("");
    try {
      await apiPut("/auth/update-owned-stores", {
        userId: store.ownerId,
        storeId: store.id,
        action: "remove",
      });

      alert(`✅ მაღაზია "${storeName}" წარმატებით წაიშალა იუზერისგან`);
      onSuccess?.();
      onClose();
    } catch (e: unknown) {
      const message =
        e && typeof e === "object" && "message" in e
          ? String((e as { message?: string }).message)
          : "მაღაზიის წაშლისას მოხდა შეცდომა";
      setError(message);
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="max-w-md p-6 lg:p-8"
    >
      <div className="space-y-6">
        <div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            მაღაზიის პატრონის მინიჭება
          </h3>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              მაღაზია
            </label>
            <p className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 p-2 rounded">
              {storeName}
            </p>
          </div>

          {store.ownerId && (
            <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
              <p className="text-sm text-yellow-800 dark:text-yellow-300">
                <strong>მიმდინარე პატრონი:</strong> {store.ownerId}
              </p>
            </div>
          )}

          <div>
            <label
              htmlFor="userId"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              იუზერის ID *
            </label>
            <input
              id="userId"
              type="text"
              value={userId}
              onChange={(e) => {
                setUserId(e.target.value);
                setError("");
              }}
              placeholder="usr_1234567890"
              disabled={loading}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-50"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              შეიყვანეთ იუზერის ID, რომელსაც გსურთ მაღაზიის პატრონად გახდით
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
              <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          {store.ownerId && (
            <button
              onClick={handleRemove}
              disabled={loading}
              className="px-4 py-2 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              პატრონობის მოხსნა
            </button>
          )}
          <button
            onClick={handleAssign}
            disabled={loading}
            className="px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "მიმდინარეობს..." : "მინიჭება"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

